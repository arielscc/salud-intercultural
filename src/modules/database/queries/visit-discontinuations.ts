import type {
  PatientRouteArea,
  Prisma,
  VisitDiscontinuationReason,
  VisitPendingType,
  VisitStatus
} from "@/generated/prisma/client";
import type { RecordVisitDiscontinuationInput } from "@/features/visit-discontinuations/schemas/visit-discontinuation.schema";
import { deriveVisitPendingTypes } from "@/features/visit-discontinuations/policy";
import { visitDiscontinuationReasonLabels } from "@/features/visit-discontinuations/labels";
import { dayRange } from "@/lib/dates";
import { prisma, withDatabaseError } from "@/modules/database";
import { updateVisitRouteStatusInTransaction } from "@/modules/database/queries/visits";

export class VisitDiscontinuationError extends Error {
  constructor(
    public readonly code:
      | "VISIT_ALREADY_CLOSED"
      | "DISCONTINUATION_ALREADY_RECORDED"
  ) {
    super(code);
    this.name = "VisitDiscontinuationError";
  }
}

export function findVisitDiscontinuationError(
  error: unknown
): VisitDiscontinuationError | null {
  let current = error;

  while (current instanceof Error) {
    if (current instanceof VisitDiscontinuationError) return current;
    current = "cause" in current ? current.cause : undefined;
  }

  return null;
}

const closedVisitStatuses: VisitStatus[] = [
  "completed",
  "left_without_care",
  "cancelled"
];

const applicationOrderTypes = [
  "vital_signs",
  "nursing_application",
  "serum",
  "medication"
] as const;

function areaFromStatus(status: VisitStatus): PatientRouteArea {
  const areas: Partial<Record<VisitStatus, PatientRouteArea>> = {
    in_reception: "recepcion",
    in_consultation: "medico",
    in_nursing: "enfermeria",
    in_administration: "administracion"
  };
  return areas[status] ?? "recepcion";
}

function recoveryFollowUpAt(now = new Date()) {
  const tomorrowStart = dayRange(now).end;
  return new Date(tomorrowStart.getTime() + 10 * 60 * 60 * 1_000);
}

export async function recordVisitDiscontinuation(
  input: RecordVisitDiscontinuationInput & { recordedById: string }
) {
  return withDatabaseError("recordVisitDiscontinuation", async () => {
    return prisma.$transaction(
      async (tx) => {
        const visit = await tx.visit.findUniqueOrThrow({
          where: { id: input.visitId },
          include: {
            route: true,
            discontinuation: { select: { id: true } },
            clinicalConsultation: { select: { id: true } },
            clinicalOrders: {
              where: {
                status: { in: ["pending", "acknowledged", "blocked"] }
              },
              select: { type: true }
            },
            studies: {
              where: { status: "requested" },
              select: { id: true }
            },
            sales: {
              where: { status: { in: ["pending", "partial", "paid"] } },
              select: {
                balanceCents: true,
                items: { select: { delivered: true } }
              }
            },
            followUpTasks: {
              where: { status: "pending" },
              select: { id: true, type: true }
            },
            workItems: {
              where: {
                status: { in: ["pending", "acknowledged", "in_progress"] }
              },
              select: { id: true, area: true }
            },
            patient: {
              select: {
                id: true,
                consents: {
                  where: { purpose: "follow_up" },
                  orderBy: [
                    { decidedAt: "desc" },
                    { createdAt: "desc" }
                  ],
                  take: 1,
                  select: { decision: true }
                }
              }
            }
          }
        });

        if (visit.discontinuation) {
          throw new VisitDiscontinuationError(
            "DISCONTINUATION_ALREADY_RECORDED"
          );
        }
        if (closedVisitStatuses.includes(visit.status)) {
          throw new VisitDiscontinuationError("VISIT_ALREADY_CLOSED");
        }

        const currentArea =
          visit.route?.currentArea ?? areaFromStatus(visit.status);
        const activeOrders = visit.clinicalOrders;
        const existingRecoveryFollowUp = visit.followUpTasks.find(
          (task) => task.type === "treatment_recovery"
        );
        const pendingTypes = deriveVisitPendingTypes(input.pendingTypes, {
          consultation:
            visit.status === "in_consultation" &&
            !visit.clinicalConsultation,
          study:
            visit.studies.length > 0 ||
            activeOrders.some((order) => order.type === "study"),
          application: activeOrders.some((order) =>
            applicationOrderTypes.includes(
              order.type as (typeof applicationOrderTypes)[number]
            )
          ),
          payment:
            visit.sales.some((sale) => sale.balanceCents > 0) ||
            activeOrders.some((order) => order.type === "administration") ||
            visit.workItems.some(
              (workItem) => workItem.area === "administracion"
            ),
          delivery: visit.sales.some((sale) =>
            sale.items.some((item) => !item.delivered)
          ),
          followUp:
            visit.followUpTasks.length > 0 || input.createFollowUp
        });

        let followUpTaskId = existingRecoveryFollowUp?.id;
        let followUpCreated = false;
        const followUpConsentGranted =
          visit.patient.consents[0]?.decision === "granted";

        if (
          input.createFollowUp &&
          followUpConsentGranted &&
          !followUpTaskId
        ) {
          const marlen = await tx.internalUser.findFirst({
            where: {
              active: true,
              role: "recepcion",
              name: { contains: "Marlen", mode: "insensitive" }
            },
            orderBy: { createdAt: "asc" },
            select: { id: true }
          });
          const followUp = await tx.followUpTask.create({
            data: {
              patientId: visit.patient.id,
              visitId: visit.id,
              assignedToId: marlen?.id,
              createdById: input.recordedById,
              type: "treatment_recovery",
              domain: "clinical",
              priority: "high",
              status: "pending",
              title: "Recuperar atención interrumpida",
              notes:
                input.note ??
                `La visita se detuvo por ${visitDiscontinuationReasonLabels[
                  input.reason
                ].toLowerCase()}.`,
              dueAt: recoveryFollowUpAt()
            }
          });
          await tx.followUpStatusHistory.create({
            data: {
              taskId: followUp.id,
              userId: input.recordedById,
              toStatus: "pending",
              note: "Creado desde una visita que el paciente no continuó."
            }
          });
          followUpTaskId = followUp.id;
          followUpCreated = true;
        }

        const [blockedWorkItems, blockedOrders] = await Promise.all([
          tx.visitWorkItem.updateMany({
            where: {
              visitId: visit.id,
              status: { in: ["pending", "acknowledged", "in_progress"] }
            },
            data: { status: "blocked", completedAt: null }
          }),
          tx.clinicalOrder.updateMany({
            where: {
              visitId: visit.id,
              status: { in: ["pending", "acknowledged"] }
            },
            data: { status: "blocked" }
          })
        ]);

        const reasonLabel =
          visitDiscontinuationReasonLabels[input.reason].toLowerCase();
        const routeNote = input.note
          ? `No continuará por ${reasonLabel}. ${input.note}`
          : `No continuará por ${reasonLabel}.`;

        await updateVisitRouteStatusInTransaction(tx, {
          visitId: visit.id,
          userId: input.recordedById,
          status: "left_without_care",
          area: currentArea,
          note: routeNote,
          workItemTitle: "Visita interrumpida",
          workItemDescription:
            pendingTypes.length > 0
              ? "Los pendientes quedaron bloqueados para recuperación."
              : "No se registraron pendientes."
        });

        const discontinuation = await tx.visitDiscontinuation.create({
          data: {
            visitId: visit.id,
            fromStatus: visit.status,
            area: currentArea,
            reason: input.reason,
            pendingTypes,
            note: input.note,
            recordedById: input.recordedById,
            followUpTaskId
          }
        });

        return {
          discontinuation,
          blockedWorkItems: blockedWorkItems.count,
          blockedOrders: blockedOrders.count,
          followUpRequested: input.createFollowUp,
          followUpCreated,
          followUpAvailable: Boolean(followUpTaskId),
          followUpConsentGranted
        };
      },
      { isolationLevel: "Serializable" }
    );
  });
}

export type VisitDiscontinuationReportFilters = {
  reason?: VisitDiscontinuationReason;
  occurredFrom?: Date;
  occurredTo?: Date;
};

function reportWhere(
  input: VisitDiscontinuationReportFilters
): Prisma.VisitDiscontinuationWhereInput {
  return {
    reason: input.reason,
    occurredAt:
      input.occurredFrom || input.occurredTo
        ? { gte: input.occurredFrom, lt: input.occurredTo }
        : undefined
  };
}

export async function getVisitDiscontinuationReport(
  input: VisitDiscontinuationReportFilters = {}
) {
  return withDatabaseError("getVisitDiscontinuationReport", async () => {
    const where = reportWhere(input);
    const [events, byReason, total, withFollowUp, pendingRows] =
      await Promise.all([
      prisma.visitDiscontinuation.findMany({
        where,
        include: {
          visit: {
            select: {
              id: true,
              checkedInAt: true,
              patient: {
                select: {
                  id: true,
                  internalCode: true,
                  fullName: true
                }
              }
            }
          },
          recordedBy: { select: { id: true, name: true, email: true } },
          followUpTask: {
            select: {
              id: true,
              status: true,
              assignedTo: {
                select: { id: true, name: true, email: true }
              }
            }
          }
        },
        orderBy: { occurredAt: "desc" },
        take: 100
      }),
      prisma.visitDiscontinuation.groupBy({
        by: ["reason"],
        where,
        _count: { _all: true },
        orderBy: { _count: { reason: "desc" } }
      }),
      prisma.visitDiscontinuation.count({ where }),
      prisma.visitDiscontinuation.count({
        where: { ...where, followUpTaskId: { not: null } }
      }),
      prisma.visitDiscontinuation.findMany({
        where,
        select: { pendingTypes: true }
      })
    ]);

    return {
      events,
      byReason: byReason.map((item) => ({
        reason: item.reason,
        count: item._count._all
      })),
      total,
      withFollowUp,
      pendingCount: pendingRows.reduce(
        (total, event) => total + event.pendingTypes.length,
        0
      )
    };
  });
}
