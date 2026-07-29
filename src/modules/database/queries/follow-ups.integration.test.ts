import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { hashPassword } from "@/features/internal-auth/password";
import { prisma } from "@/modules/database";
import {
  createFollowUpAttemptRecord,
  createFollowUpTaskRecord,
  getFollowUpTaskById,
  getFollowUpTasks,
  getFollowUpWorkSummary
} from "@/modules/database/queries/follow-ups";
import { createPatientRecord, getPatientById } from "@/modules/database/queries/patients";

async function cleanFollowUps() {
  await prisma.inventoryMovement.deleteMany();
  await prisma.inventoryAdjustment.deleteMany();
  await prisma.inventoryAlert.deleteMany();
  await prisma.followUpStatusHistory.deleteMany();
  await prisma.followUpAttempt.deleteMany();
  await prisma.followUpTask.deleteMany();
  await prisma.cashMovement.deleteMany();
  await prisma.deliveredProduct.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.nursingWorkItemResult.deleteMany();
  await prisma.nursingApplication.deleteMany();
  await prisma.nursingNote.deleteMany();
  await prisma.vitalSigns.deleteMany();
  await prisma.clinicalAttachmentAccessGrant.deleteMany();
  await prisma.clinicalAttachment.deleteMany();
  await prisma.study.deleteMany();
  await prisma.visit.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.internalSession.deleteMany();
  await prisma.internalUser.deleteMany();
}

beforeEach(cleanFollowUps);
afterEach(cleanFollowUps);

describe("follow-up integration", () => {
  it("tracks overdue tasks and resolves contact attempts", async () => {
    const user = await prisma.internalUser.create({
      data: {
        email: "seguimiento@example.com",
        name: "Seguimiento Test",
        passwordHash: await hashPassword("clave-segura-123"),
        role: "captacion"
      }
    });
    const patient = await createPatientRecord({
      fullName: "Paciente Seguimiento",
      phone: "+591 70000055",
      captureSource: "whatsapp"
    });
    const overdue = new Date();
    overdue.setDate(overdue.getDate() - 1);

    const task = await createFollowUpTaskRecord({
      patientId: patient.id,
      assignedToId: user.id,
      createdById: user.id,
      title: "Control post consulta",
      dueAt: overdue,
      notes: "Verificar evolución"
    });

    const summary = await getFollowUpWorkSummary(user.id);
    const overdueTasks = await getFollowUpTasks({ filter: "overdue", assignedToId: user.id });

    await createFollowUpAttemptRecord({
      taskId: task.id,
      userId: user.id,
      method: "whatsapp",
      result: "wants_return",
      notes: "Quiere agendar retorno"
    });

    const detail = await getFollowUpTaskById(task.id);
    const patientDetail = await getPatientById(patient.id);

    expect(summary.overdue).toBe(1);
    expect(overdueTasks[0]?.id).toBe(task.id);
    expect(detail?.status).toBe("wants_return");
    expect(detail?.attempts[0]).toMatchObject({
      method: "whatsapp",
      result: "wants_return"
    });
    expect(patientDetail?.followUpTasks[0]?.id).toBe(task.id);
  });
});
