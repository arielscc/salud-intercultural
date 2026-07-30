import type {
  Prisma,
  TreatmentProposalOutcomeStatus
} from "@/generated/prisma/client";
import type { RecordTreatmentProposalOutcomeInput } from "@/features/treatment-proposals/schemas/treatment-proposal.schema";
import { dayRange, monthRange } from "@/lib/dates";
import { prisma, withDatabaseError } from "@/modules/database";
import { updateVisitRouteStatusInTransaction } from "@/modules/database/queries/visits";

export class TreatmentProposalOutcomeError extends Error {
  constructor(
    public readonly code:
      | "CONSULTATION_REQUIRED"
      | "CONSULTATION_NOT_FINALIZED"
      | "VISIT_NOT_IN_CONSULTATION"
      | "ACCEPTED_OUTCOME_ALREADY_RECORDED"
  ) {
    super(code);
    this.name = "TreatmentProposalOutcomeError";
  }
}

export function findTreatmentProposalOutcomeError(
  error: unknown
): TreatmentProposalOutcomeError | null {
  let current = error;

  while (current instanceof Error) {
    if (current instanceof TreatmentProposalOutcomeError) return current;
    current = "cause" in current ? current.cause : undefined;
  }

  return null;
}

function nextDecisionFollowUpAt(now = new Date()) {
  const tomorrowStart = dayRange(now).end;
  return new Date(tomorrowStart.getTime() + 10 * 60 * 60 * 1_000);
}

async function createTreatmentDecisionFollowUp(
  tx: Prisma.TransactionClient,
  input: {
    patientId: string;
    visitId: string;
    doctorId: string;
    note?: string;
  }
) {
  const consent = await tx.patientConsent.findFirst({
    where: {
      patientId: input.patientId,
      purpose: "follow_up"
    },
    orderBy: [{ decidedAt: "desc" }, { createdAt: "desc" }]
  });

  if (consent?.decision !== "granted") return null;

  const marlen = await tx.internalUser.findFirst({
    where: {
      active: true,
      role: "recepcion",
      name: { contains: "Marlen", mode: "insensitive" }
    },
    orderBy: { createdAt: "asc" }
  });
  const task = await tx.followUpTask.create({
    data: {
      patientId: input.patientId,
      visitId: input.visitId,
      assignedToId: marlen?.id,
      createdById: input.doctorId,
      type: "treatment_recovery",
      domain: "clinical",
      priority: "high",
      status: "pending",
      title: "Confirmar decisión sobre tratamiento",
      notes:
        input.note ??
        "El paciente pidió tiempo después de recibir la propuesta.",
      dueAt: nextDecisionFollowUpAt()
    }
  });
  await tx.followUpStatusHistory.create({
    data: {
      taskId: task.id,
      userId: input.doctorId,
      toStatus: "pending",
      note: "Creado desde una propuesta que necesita tiempo."
    }
  });
  return task;
}

export async function recordTreatmentProposalOutcome(
  input: RecordTreatmentProposalOutcomeInput & { doctorId: string }
) {
  return withDatabaseError("recordTreatmentProposalOutcome", async () => {
    return prisma.$transaction(
      async (tx) => {
        const visit = await tx.visit.findUniqueOrThrow({
          where: { id: input.visitId },
          include: {
            clinicalConsultation: true,
            treatmentProposalOutcomes: {
              orderBy: [{ decidedAt: "desc" }, { createdAt: "desc" }],
              take: 1
            }
          }
        });

        if (!visit.clinicalConsultation) {
          throw new TreatmentProposalOutcomeError("CONSULTATION_REQUIRED");
        }
        if (visit.clinicalConsultation.status !== "finalized") {
          throw new TreatmentProposalOutcomeError(
            "CONSULTATION_NOT_FINALIZED"
          );
        }
        if (visit.status !== "in_consultation") {
          throw new TreatmentProposalOutcomeError(
            "VISIT_NOT_IN_CONSULTATION"
          );
        }

        const current = visit.treatmentProposalOutcomes[0];
        if (current?.status === "accepted") {
          throw new TreatmentProposalOutcomeError(
            "ACCEPTED_OUTCOME_ALREADY_RECORDED"
          );
        }

        let administrationOrderId: string | undefined;
        let followUpTaskId: string | undefined;

        if (input.status === "accepted") {
          const instruction = input.administrationInstruction!;
          const { workItem } = await updateVisitRouteStatusInTransaction(tx, {
            visitId: visit.id,
            userId: input.doctorId,
            status: "in_administration",
            area: "administracion",
            note: "Tratamiento aceptado; pasa a Administración.",
            workItemTitle: "Tratamiento aceptado — registrar venta",
            workItemDescription: instruction
          });
          const order = await tx.clinicalOrder.create({
            data: {
              visitId: visit.id,
              patientId: visit.patientId,
              doctorId: input.doctorId,
              workItemId: workItem.id,
              type: "administration",
              targetArea: "administracion",
              status: "pending",
              title: "Tratamiento aceptado — registrar venta",
              details: instruction
            }
          });
          administrationOrderId = order.id;
        } else if (input.status === "needs_time") {
          const followUp = await createTreatmentDecisionFollowUp(tx, {
            patientId: visit.patientId,
            visitId: visit.id,
            doctorId: input.doctorId,
            note: input.note
          });
          followUpTaskId = followUp?.id;
        }

        const outcome = await tx.treatmentProposalOutcome.create({
          data: {
            consultationId: visit.clinicalConsultation.id,
            visitId: visit.id,
            doctorId: input.doctorId,
            status: input.status,
            reason: input.reason,
            note: input.note,
            administrationInstruction:
              input.status === "accepted"
                ? input.administrationInstruction
                : undefined,
            administrationOrderId,
            followUpTaskId,
            supersedesId: current?.id
          }
        });

        return {
          outcome,
          administrationOrderCreated: Boolean(administrationOrderId),
          followUpCreated: Boolean(followUpTaskId)
        };
      },
      { isolationLevel: "Serializable" }
    );
  });
}

export async function getTreatmentProposalOutcomeSummary(now = new Date()) {
  return withDatabaseError("getTreatmentProposalOutcomeSummary", async () => {
    const range = monthRange(now);
    const outcomes = await prisma.treatmentProposalOutcome.findMany({
      where: {
        decidedAt: { gte: range.start, lt: range.end },
        supersededBy: null
      },
      select: { status: true }
    });
    const counts: Record<TreatmentProposalOutcomeStatus, number> = {
      accepted: 0,
      rejected: 0,
      needs_time: 0,
      not_applicable: 0,
      no_decision: 0
    };
    for (const outcome of outcomes) counts[outcome.status] += 1;
    const decided = counts.accepted + counts.rejected;

    return {
      ...counts,
      total: outcomes.length,
      acceptanceRate:
        decided > 0 ? Math.round((counts.accepted / decided) * 100) : 0
    };
  });
}
