import type {
  PatientRouteArea,
  Prisma,
  SymptomDurationUnit,
  VisitIntakeType,
  VisitStatus
} from "@/generated/prisma/client";
import { prisma, withDatabaseError } from "@/modules/database";
import { getPagination, type PaginationInput } from "@/modules/database/pagination";

export class ClosedVisitTransitionError extends Error {
  constructor(public readonly visitId: string) {
    super("VISIT_ALREADY_CLOSED");
    this.name = "ClosedVisitTransitionError";
  }
}

export class DraftClinicalConsultationError extends Error {
  constructor(public readonly visitId: string) {
    super("CLINICAL_CONSULTATION_MUST_BE_FINALIZED");
    this.name = "DraftClinicalConsultationError";
  }
}

export function findClosedVisitTransitionError(error: unknown): ClosedVisitTransitionError | null {
  let current = error;

  while (current instanceof Error) {
    if (current instanceof ClosedVisitTransitionError) return current;
    current = "cause" in current ? current.cause : undefined;
  }

  return null;
}

export function findDraftClinicalConsultationError(
  error: unknown
): DraftClinicalConsultationError | null {
  let current = error;

  while (current instanceof Error) {
    if (current instanceof DraftClinicalConsultationError) return current;
    current = "cause" in current ? current.cause : undefined;
  }

  return null;
}

export type CreateVisitRecordInput = {
  patientId: string;
  userId?: string;
  reason?: string;
  note?: string;
  intakeType?: VisitIntakeType;
  symptomDurationValue?: number;
  symptomDurationUnit?: SymptomDurationUnit;
  previouslyTreated?: boolean;
  bringsStudies?: boolean;
  originCity?: string;
  originDepartment?: string;
  originCountry?: string;
  originMatchesPatient?: boolean;
};

export async function createVisitInTransaction(
  tx: Prisma.TransactionClient,
  input: CreateVisitRecordInput
) {
  const visit = await tx.visit.create({
    data: {
      patientId: input.patientId,
      createdById: input.userId,
      reason: input.reason,
      status: "in_reception",
      intakeType: input.intakeType,
      symptomDurationValue: input.symptomDurationValue,
      symptomDurationUnit: input.symptomDurationUnit,
      previouslyTreated: input.previouslyTreated,
      bringsStudies: input.bringsStudies,
      originCity: input.originCity,
      originDepartment: input.originDepartment,
      originCountry: input.originCountry,
      originMatchesPatient: input.originMatchesPatient
    }
  });

  await tx.receptionCheckIn.create({
    data: {
      visitId: visit.id,
      userId: input.userId,
      note: input.note
    }
  });

  await tx.visitStatusHistory.create({
    data: {
      visitId: visit.id,
      userId: input.userId,
      toStatus: "in_reception",
      note: input.note ?? "Llegada registrada"
    }
  });

  const route = await tx.patientRoute.create({
    data: {
      visitId: visit.id,
      currentArea: "recepcion",
      active: true
    }
  });

  await tx.patientRouteStep.create({
    data: {
      routeId: route.id,
      area: "recepcion",
      status: "in_reception",
      note: input.note ?? "Paciente en recepción"
    }
  });

  await tx.visitWorkItem.create({
    data: {
      visitId: visit.id,
      createdById: input.userId,
      area: "recepcion",
      title: "Recepción registrada",
      description: input.reason
    }
  });

  await tx.patient.updateMany({
    where: {
      id: input.patientId,
      firstVisitAt: null
    },
    data: {
      firstVisitAt: visit.checkedInAt
    }
  });

  return visit;
}

export async function createVisitRecord(input: CreateVisitRecordInput) {
  return withDatabaseError("createVisitRecord", async () => {
    return prisma.$transaction(async (tx) => createVisitInTransaction(tx, input));
  });
}

export async function getVisits(
  input: PaginationInput & {
    status?: VisitStatus;
    activeOnly?: boolean;
    checkedInFrom?: Date;
    checkedInTo?: Date;
    originCity?: string;
    originDepartment?: string;
  } = {}
) {
  const pagination = getPagination(input);

  return withDatabaseError("getVisits", async () => {
    return prisma.visit.findMany({
      where: {
        status: input.status,
        checkedInAt:
          input.checkedInFrom || input.checkedInTo
            ? { gte: input.checkedInFrom, lt: input.checkedInTo }
            : undefined,
        originCity: input.originCity
          ? { contains: input.originCity, mode: "insensitive" }
          : undefined,
        originDepartment: input.originDepartment
          ? { equals: input.originDepartment, mode: "insensitive" }
          : undefined,
        route: input.activeOnly
          ? {
              active: true
            }
          : undefined
      },
      include: {
        patient: true,
        attribution: {
          include: {
            campaign: true,
            touches: { include: { source: true } }
          }
        },
        route: true,
        workItems: {
          where: {
            status: {
              in: ["pending", "acknowledged", "in_progress"]
            }
          },
          orderBy: {
            createdAt: "desc"
          }
        }
      },
      orderBy: {
        checkedInAt: "desc"
      },
      skip: pagination.skip,
      take: pagination.take
    });
  });
}

export async function countVisits(input: {
  status?: VisitStatus;
  activeOnly?: boolean;
  checkedInFrom?: Date;
  checkedInTo?: Date;
  originCity?: string;
  originDepartment?: string;
} = {}) {
  return withDatabaseError("countVisits", async () => {
    return prisma.visit.count({
      where: {
        status: input.status,
        checkedInAt:
          input.checkedInFrom || input.checkedInTo
            ? { gte: input.checkedInFrom, lt: input.checkedInTo }
            : undefined,
        originCity: input.originCity
          ? { contains: input.originCity, mode: "insensitive" }
          : undefined,
        originDepartment: input.originDepartment
          ? { equals: input.originDepartment, mode: "insensitive" }
          : undefined,
        route: input.activeOnly ? { active: true } : undefined
      }
    });
  });
}

export async function getVisitById(id: string) {
  return withDatabaseError("getVisitById", async () => {
    return prisma.visit.findUnique({
      where: { id },
      include: {
        patient: true,
        attribution: {
          include: {
            campaign: true,
            touches: { include: { source: true } }
          }
        },
        route: {
          include: {
            steps: {
              orderBy: { startedAt: "desc" }
            }
          }
        },
        statusHistory: {
          orderBy: { createdAt: "desc" }
        },
        discontinuation: {
          include: {
            recordedBy: {
              select: { id: true, name: true, email: true }
            },
            followUpTask: {
              select: {
                id: true,
                status: true,
                assignedTo: {
                  select: { id: true, name: true, email: true }
                }
              }
            }
          }
        },
        workItems: {
          orderBy: { createdAt: "desc" }
        }
      }
    });
  });
}

export async function getVisitFlowState(id: string) {
  return withDatabaseError("getVisitFlowState", async () => {
    return prisma.visit.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        route: {
          select: { currentArea: true }
        }
      }
    });
  });
}

export type UpdateVisitRouteStatusInput = {
  visitId: string;
  userId?: string;
  status: VisitStatus;
  area: PatientRouteArea;
  note?: string;
  workItemTitle?: string;
  workItemDescription?: string;
};

export async function updateVisitRouteStatusInTransaction(
  tx: Prisma.TransactionClient,
  input: UpdateVisitRouteStatusInput
) {
  const existing = await tx.visit.findUniqueOrThrow({
    where: { id: input.visitId },
    include: { route: true }
  });

  if (
    ["completed", "left_without_care", "cancelled"].includes(existing.status)
  ) {
    throw new ClosedVisitTransitionError(input.visitId);
  }

  const now = new Date();
  const isClosed = ["completed", "left_without_care", "cancelled"].includes(
    input.status
  );

  if (input.status === "completed") {
    const consultation = await tx.clinicalConsultation.findUnique({
      where: { visitId: input.visitId },
      select: { status: true }
    });
    if (consultation?.status === "draft") {
      throw new DraftClinicalConsultationError(input.visitId);
    }
  }

  const visit = await tx.visit.update({
    where: { id: input.visitId },
    data: {
      status: input.status,
      completedAt: input.status === "completed" ? now : undefined,
      cancelledAt: input.status === "cancelled" ? now : undefined
    }
  });

  await tx.visitStatusHistory.create({
    data: {
      visitId: input.visitId,
      userId: input.userId,
      fromStatus: existing.status,
      toStatus: input.status,
      note: input.note
    }
  });

  if (existing.route) {
    await tx.patientRouteStep.updateMany({
      where: {
        routeId: existing.route.id,
        endedAt: null
      },
      data: {
        endedAt: now
      }
    });

    await tx.patientRoute.update({
      where: { id: existing.route.id },
      data: {
        currentArea: input.area,
        active: !isClosed
      }
    });

    await tx.patientRouteStep.create({
      data: {
        routeId: existing.route.id,
        area: input.area,
        status: input.status,
        note: input.note
      }
    });
  }

  const workItem = await tx.visitWorkItem.create({
    data: {
      visitId: input.visitId,
      createdById: input.userId,
      area: input.area,
      status: isClosed ? "completed" : "pending",
      title:
        input.workItemTitle ??
        (isClosed ? "Visita cerrada" : "Paciente derivado"),
      description: input.workItemDescription ?? input.note
    }
  });

  return { visit, workItem };
}

export async function updateVisitRouteStatus(
  input: UpdateVisitRouteStatusInput
) {
  return withDatabaseError("updateVisitRouteStatus", async () => {
    if (input.status === "left_without_care") {
      throw new Error("VISIT_DISCONTINUATION_DETAILS_REQUIRED");
    }
    const result = await prisma.$transaction((tx) =>
      updateVisitRouteStatusInTransaction(tx, input)
    );
    return result.visit;
  });
}
