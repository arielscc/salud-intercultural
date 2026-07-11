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

export function findClosedVisitTransitionError(error: unknown): ClosedVisitTransitionError | null {
  let current = error;

  while (current instanceof Error) {
    if (current instanceof ClosedVisitTransitionError) return current;
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
      bringsStudies: input.bringsStudies
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
  } = {}
) {
  const pagination = getPagination(input);

  return withDatabaseError("getVisits", async () => {
    return prisma.visit.findMany({
      where: {
        status: input.status,
        route: input.activeOnly
          ? {
              active: true
            }
          : undefined
      },
      include: {
        patient: true,
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

export async function getVisitById(id: string) {
  return withDatabaseError("getVisitById", async () => {
    return prisma.visit.findUnique({
      where: { id },
      include: {
        patient: true,
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

export async function updateVisitRouteStatus(input: {
  visitId: string;
  userId?: string;
  status: VisitStatus;
  area: PatientRouteArea;
  note?: string;
}) {
  return withDatabaseError("updateVisitRouteStatus", async () => {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.visit.findUniqueOrThrow({
        where: { id: input.visitId },
        include: { route: true }
      });

      if (["completed", "left_without_care", "cancelled"].includes(existing.status)) {
        throw new ClosedVisitTransitionError(input.visitId);
      }

      const now = new Date();
      const isClosed = ["completed", "left_without_care", "cancelled"].includes(input.status);

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

      await tx.visitWorkItem.create({
        data: {
          visitId: input.visitId,
          createdById: input.userId,
          area: input.area,
          status: isClosed ? "completed" : "pending",
          title: isClosed ? "Visita cerrada" : "Paciente derivado",
          description: input.note
        }
      });

      return visit;
    });
  });
}
