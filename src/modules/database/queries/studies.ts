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
        await tx.visitWorkItem.update({
          where: { id: input.workItemId },
          data: {
            status: input.status === "cancelled" ? "cancelled" : "completed",
            completedAt: input.status === "cancelled" ? undefined : new Date()
          }
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
        attachments: true
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
        attachments: true
      },
      orderBy: [{ performedAt: "desc" }, { createdAt: "desc" }]
    });
  });
}
