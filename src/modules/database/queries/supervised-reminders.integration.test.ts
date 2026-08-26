import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { hashPassword } from "@/features/internal-auth/password";
import { prisma } from "@/modules/database";
import { appendPatientConsentRecord } from "@/modules/database/queries/patient-consents";
import { createPatientRecord } from "@/modules/database/queries/patients";
import {
  generateSupervisedReminderCandidates,
  reviewSupervisedReminderCandidate,
  saveReminderRuleVersion
} from "@/modules/database/queries/supervised-reminders";
import { createVisitRecord } from "@/modules/database/queries/visits";

async function cleanSupervisedReminders() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "SupervisedReminderReviewEvent", "SupervisedReminderCandidate", "SupervisedReminderRuleVersion", "SupervisedReminderRule", "FollowUpStatusHistory", "FollowUpAttempt", "FollowUpTask", "PatientConsent", "VisitAreaTimeEvent", "VisitDiscontinuation", "VisitWorkItem", "VisitStatusHistory", "ReceptionCheckIn", "PatientRouteStep", "PatientRoute", "Visit", "Patient", "InternalSession", "InternalUser" CASCADE'
  );
}

beforeEach(cleanSupervisedReminders);
afterEach(cleanSupervisedReminders);

async function prepareCompletedVisit() {
  const user = await prisma.internalUser.create({
    data: {
      email: "marlen.reminders@test.invalid",
      name: "Marlen Recepción QA",
      passwordHash: await hashPassword("clave-segura-recordatorios-123"),
      role: "recepcion"
    }
  });
  const patient = await createPatientRecord({
    fullName: "Paciente Recordatorio",
    phone: "70000031"
  });
  await appendPatientConsentRecord({
    patientId: patient.id,
    purpose: "follow_up",
    decision: "granted",
    contactChannels: ["whatsapp"],
    captureMethod: "in_person_verbal",
    recordedById: user.id
  });
  const visit = await createVisitRecord({
    patientId: patient.id,
    userId: user.id,
    reason: "Consulta de prueba de recordatorios"
  });
  const completedAt = new Date("2026-08-01T14:00:00.000Z");
  await prisma.visit.update({
    where: { id: visit.id },
    data: { status: "completed", completedAt }
  });
  await saveReminderRuleVersion({
    createdById: user.id,
    data: {
      name: "Control después de consulta",
      enabled: true,
      event: "visit_completed",
      followUpType: "evolution",
      channel: "whatsapp",
      templateBody: "Hola {{paciente}}, queremos saber cómo sigue.",
      delayDays: 1,
      lookbackDays: 30,
      windowStart: "09:00",
      windowEnd: "18:00",
      windowStartMinute: 540,
      windowEndMinute: 1080,
      weekdays: [1, 2, 3, 4, 5, 6],
      ownerId: user.id
    }
  });
  return { user, patient, visit, completedAt };
}

describe("supervised reminder integration", () => {
  it("generates once and creates one follow-up only after human approval", async () => {
    const { user } = await prepareCompletedVisit();
    const first = await generateSupervisedReminderCandidates({
      generatedById: user.id,
      now: new Date("2026-08-02T14:00:00.000Z")
    });
    const second = await generateSupervisedReminderCandidates({
      generatedById: user.id,
      now: new Date("2026-08-02T14:00:00.000Z")
    });
    const candidate = await prisma.supervisedReminderCandidate.findFirstOrThrow();

    const approved = await reviewSupervisedReminderCandidate({
      data: { candidateId: candidate.id, action: "approve" },
      reviewedById: user.id
    });
    const approvedAgain = await reviewSupervisedReminderCandidate({
      data: { candidateId: candidate.id, action: "approve" },
      reviewedById: user.id
    });

    expect(first.created).toBe(1);
    expect(second.created).toBe(0);
    expect(approved.consentBlocked).toBe(false);
    expect(approvedAgain.task?.id).toBe(approved.task?.id);
    expect(await prisma.supervisedReminderCandidate.count()).toBe(1);
    expect(await prisma.followUpTask.count()).toBe(1);
  });

  it("rechecks consent on approval and keeps the blocked review visible", async () => {
    const { user, patient } = await prepareCompletedVisit();
    await generateSupervisedReminderCandidates({
      generatedById: user.id,
      now: new Date("2026-08-02T14:00:00.000Z")
    });
    const candidate = await prisma.supervisedReminderCandidate.findFirstOrThrow();
    await appendPatientConsentRecord({
      patientId: patient.id,
      purpose: "follow_up",
      decision: "withdrawn",
      contactChannels: [],
      captureMethod: "phone_call",
      recordedById: user.id
    });

    const reviewed = await reviewSupervisedReminderCandidate({
      data: { candidateId: candidate.id, action: "approve" },
      reviewedById: user.id
    });
    const persisted = await prisma.supervisedReminderCandidate.findUniqueOrThrow({
      where: { id: candidate.id },
      include: { reviewEvents: true }
    });

    expect(reviewed.consentBlocked).toBe(true);
    expect(persisted.status).toBe("blocked");
    expect(persisted.blockReason).toBe("whatsapp_not_consented");
    expect(persisted.reviewEvents.at(-1)?.result).toBe("blocked");
    expect(await prisma.followUpTask.count()).toBe(0);
  });
});
