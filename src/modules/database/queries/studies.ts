import type { StudyStatus, StudyType } from "@/generated/prisma/client";
import { prisma, withDatabaseError } from "@/modules/database";

export async function createStudyRecord(input: {
  patientId: string;
  visitId?: string;
  workItemId?: string;
  clinicalOrderId?: string;
  requestedById?: string;
  recordedById?: string;
  type: StudyType;
  status: StudyStatus;
  title: string;
  resultSummary?: string;
  findings?: string;
  performedAt?: Date;
}) {
  return withDatabaseError("createStudyRecord", async () => {
    return prisma.$transaction(async (tx) => {
      const study = await tx.study.create({
        data: {
          ...input,
          performedAt: input.performedAt ?? new Date()
        }
      });

      if (input.clinicalOrderId && input.status !== "requested") {
        await tx.clinicalOrder.update({
          where: { id: input.clinicalOrderId },
          data: { status: input.status === "cancelled" ? "cancelled" : "completed" }
        });
      }

      if (input.workItemId && input.status !== "requested") {
        const remainingOrders = await tx.clinicalOrder.count({
          where: {
            workItemId: input.workItemId,
            status: { in: ["pending", "acknowledged", "blocked"] }
          }
        });
        await tx.visitWorkItem.update({
          where: { id: input.workItemId },
          data: remainingOrders === 0
            ? { status: "completed", completedAt: new Date() }
            : { status: "in_progress", completedAt: null }
        });
      }

      return study;
    });
  });
}

export async function getStudiesForPatient(patientId: string) {
  return withDatabaseError("getStudiesForPatient", async () => {
    return prisma.study.findMany({
      where: { patientId },
      include: {
        recordedBy: true,
        requestedBy: true,
        attachments: {
          where: { status: "available" },
          select: {
            id: true,
            label: true,
            contentType: true,
            sizeBytes: true,
            createdAt: true
          }
        }
      },
      orderBy: [{ performedAt: "desc" }, { createdAt: "desc" }]
    });
  });
}

export async function getStudiesForVisit(visitId: string) {
  return withDatabaseError("getStudiesForVisit", async () => {
    return prisma.study.findMany({
      where: { visitId },
      include: {
        recordedBy: true,
        requestedBy: true,
        attachments: {
          where: { status: "available" },
          select: {
            id: true,
            label: true,
            contentType: true,
            sizeBytes: true,
            createdAt: true
          }
        }
      },
      orderBy: [{ performedAt: "desc" }, { createdAt: "desc" }]
    });
  });
}
