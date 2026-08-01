import type { VisitWorkItemStatus } from "@/generated/prisma/client";
import { prisma, withDatabaseError } from "@/modules/database";
import { getPagination, type PaginationInput } from "@/modules/database/pagination";

export type CreateVitalSignsRecordInput = {
  patientId: string;
  visitId?: string;
  recordedById?: string;
  temperatureCelsius?: number;
  systolicPressureMmHg?: number;
  diastolicPressureMmHg?: number;
  heartRateBpm?: number;
  respiratoryRateRpm?: number;
  oxygenSaturation?: number;
  weightKg?: number;
  heightCm?: number;
  notes?: string;
  recordedAt?: Date;
};

export type CreateNursingApplicationRecordInput = {
  patientId: string;
  visitId?: string;
  workItemId?: string;
  clinicalOrderId?: string;
  responsibleId?: string;
  medication: string;
  quantity?: string;
  route?: string;
  appliedAt?: Date;
  notes?: string;
};

export async function getNursingWorkItems(
  input: PaginationInput & { branchCode?: string } = {}
) {
  const pagination = getPagination(input);

  return withDatabaseError("getNursingWorkItems", async () => {
    return prisma.visitWorkItem.findMany({
      where: {
        visit: { branchCode: input.branchCode },
        area: "enfermeria",
        status: {
          in: ["pending", "acknowledged", "in_progress", "blocked"]
        }
      },
      include: {
        createdBy: true,
        clinicalOrders: {
          orderBy: { createdAt: "desc" },
          include: {
            doctor: true
          }
        },
        visit: {
          include: {
            patient: true,
            route: true
          }
        }
      },
      orderBy: [{ status: "asc" }, { createdAt: "asc" }],
      skip: pagination.skip,
      take: pagination.take
    });
  });
}

export async function getNursingWorkItemById(id: string) {
  return withDatabaseError("getNursingWorkItemById", async () => {
    return prisma.visitWorkItem.findUnique({
      where: { id },
      include: {
        createdBy: true,
        clinicalOrders: {
          orderBy: { createdAt: "desc" },
          include: {
            doctor: true,
            nursingApplications: {
              orderBy: { appliedAt: "desc" }
            },
            studies: {
              orderBy: { createdAt: "desc" }
            }
          }
        },
        nursingApplications: {
          orderBy: { appliedAt: "desc" }
        },
        studies: {
          orderBy: { createdAt: "desc" }
        },
        nursingWorkItemResults: {
          orderBy: { createdAt: "desc" },
          include: { user: true }
        },
        visit: {
          include: {
            patient: true,
            vitalSigns: {
              orderBy: { recordedAt: "desc" }
            },
            nursingNotes: {
              orderBy: { createdAt: "desc" },
              include: { user: true }
            },
            route: true
          }
        }
      }
    });
  });
}

export async function updateNursingWorkItemStatus(input: {
  workItemId: string;
  userId?: string;
  status: VisitWorkItemStatus;
  notes?: string;
}) {
  return withDatabaseError("updateNursingWorkItemStatus", async () => {
    return prisma.$transaction(async (tx) => {
      const workItem = await tx.visitWorkItem.findUniqueOrThrow({
        where: { id: input.workItemId },
        include: { clinicalOrders: true }
      });

      const completedAt = input.status === "completed" ? new Date() : null;

      await tx.visitWorkItem.update({
        where: { id: input.workItemId },
        data: {
          status: input.status,
          completedAt
        }
      });

      const orderStatus =
        input.status === "acknowledged"
          ? "acknowledged"
          : input.status === "completed"
            ? "completed"
            : input.status === "blocked"
              ? "blocked"
              : undefined;

      if (orderStatus) {
        await tx.clinicalOrder.updateMany({
          where: { workItemId: input.workItemId },
          data: { status: orderStatus }
        });
      }

      await tx.nursingWorkItemResult.create({
        data: {
          workItemId: input.workItemId,
          clinicalOrderId: workItem.clinicalOrders[0]?.id,
          userId: input.userId,
          status: input.status,
          notes: input.notes
        }
      });
    });
  });
}

export async function createVitalSignsRecord(input: CreateVitalSignsRecordInput) {
  return withDatabaseError("createVitalSignsRecord", async () => {
    return prisma.vitalSigns.create({
      data: {
        ...input,
        recordedAt: input.recordedAt ?? new Date()
      }
    });
  });
}

export async function createNursingApplicationRecord(input: CreateNursingApplicationRecordInput) {
  return withDatabaseError("createNursingApplicationRecord", async () => {
    return prisma.$transaction(async (tx) => {
      const application = await tx.nursingApplication.create({
        data: {
          ...input,
          appliedAt: input.appliedAt ?? new Date()
        }
      });

      if (input.workItemId) {
        await tx.visitWorkItem.update({
          where: { id: input.workItemId },
          data: {
            status: "completed",
            completedAt: new Date()
          }
        });

        await tx.nursingWorkItemResult.create({
          data: {
            workItemId: input.workItemId,
            clinicalOrderId: input.clinicalOrderId,
            userId: input.responsibleId,
            status: "completed",
            outcome: input.medication,
            notes: input.notes
          }
        });
      }

      if (input.clinicalOrderId) {
        await tx.clinicalOrder.update({
          where: { id: input.clinicalOrderId },
          data: { status: "completed" }
        });
      }

      return application;
    });
  });
}

export async function createNursingNoteRecord(input: {
  patientId: string;
  visitId?: string;
  userId?: string;
  note: string;
}) {
  return withDatabaseError("createNursingNoteRecord", async () => {
    return prisma.nursingNote.create({
      data: input
    });
  });
}

export async function getNursingTimelineForPatient(patientId: string) {
  return withDatabaseError("getNursingTimelineForPatient", async () => {
    const [vitalSigns, applications, notes] = await Promise.all([
      prisma.vitalSigns.findMany({
        where: { patientId },
        orderBy: { recordedAt: "desc" },
        take: 8
      }),
      prisma.nursingApplication.findMany({
        where: { patientId },
        orderBy: { appliedAt: "desc" },
        take: 8
      }),
      prisma.nursingNote.findMany({
        where: { patientId },
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { user: true }
      })
    ]);

    return { vitalSigns, applications, notes };
  });
}
