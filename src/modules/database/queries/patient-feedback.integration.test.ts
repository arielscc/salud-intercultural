import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { hashPassword } from "@/features/internal-auth/password";
import {
  createFeedbackAccessToken,
  hashFeedbackAccessToken
} from "@/features/patient-feedback/token";
import { prisma } from "@/modules/database";
import { appendPatientConsentRecord } from "@/modules/database/queries/patient-consents";
import {
  createPatientFeedbackRequest,
  getPatientFeedbackForm,
  submitPatientFeedback
} from "@/modules/database/queries/patient-feedback";
import { createPatientRecord } from "@/modules/database/queries/patients";
import { createVisitRecord } from "@/modules/database/queries/visits";

async function cleanFeedback() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "AuditEvent", "PatientFeedbackCaseEvent", "PatientFeedbackCase", "PatientFeedback", "PatientFeedbackRequest", "PatientConsent", "VisitAreaTimeEvent", "VisitDiscontinuation", "VisitWorkItem", "VisitStatusHistory", "ReceptionCheckIn", "PatientRouteStep", "PatientRoute", "Visit", "Patient", "InternalSession", "InternalUser" CASCADE'
  );
}

beforeEach(cleanFeedback);
afterEach(cleanFeedback);

async function prepareVisit() {
  const direction = await prisma.internalUser.create({
    data: {
      email: "direccion.feedback@test.invalid",
      name: "Dirección QA",
      passwordHash: await hashPassword("clave-direccion-feedback-123"),
      role: "direccion"
    }
  });
  const reception = await prisma.internalUser.create({
    data: {
      email: "recepcion.feedback@test.invalid",
      name: "Recepción QA",
      passwordHash: await hashPassword("clave-recepcion-feedback-123"),
      role: "recepcion"
    }
  });
  const patient = await createPatientRecord({
    fullName: "Paciente Opinión",
    phone: "70000041"
  });
  await appendPatientConsentRecord({
    patientId: patient.id,
    purpose: "feedback",
    decision: "granted",
    contactChannels: ["whatsapp"],
    captureMethod: "in_person_verbal",
    recordedById: reception.id
  });
  const visit = await createVisitRecord({
    patientId: patient.id,
    userId: reception.id,
    reason: "Atención para encuesta"
  });
  await prisma.visit.update({
    where: { id: visit.id },
    data: { status: "completed", completedAt: new Date() }
  });
  return { direction, visit };
}

describe("patient feedback integration", () => {
  it("rotates a manual link and stores one immutable survey", async () => {
    const { direction, visit } = await prepareVisit();
    const firstToken = createFeedbackAccessToken();
    const secondToken = createFeedbackAccessToken();
    const data = {
      visitId: visit.id,
      ownerId: direction.id,
      deliveryChannel: "whatsapp" as const,
      expiresInDays: 7
    };
    await createPatientFeedbackRequest({
      data,
      createdById: direction.id,
      tokenHash: hashFeedbackAccessToken(firstToken)
    });
    const rotated = await createPatientFeedbackRequest({
      data,
      createdById: direction.id,
      tokenHash: hashFeedbackAccessToken(secondToken)
    });

    expect(rotated.rotated).toBe(true);
    expect((await getPatientFeedbackForm(firstToken)).state).toBe("invalid");
    expect((await getPatientFeedbackForm(secondToken)).state).toBe("open");

    const submitted = await submitPatientFeedback({
      data: {
        token: secondToken,
        rating: 5,
        kind: "survey",
        area: "reception",
        healthRiskFlag: false,
        privacyAcknowledged: true
      }
    });
    expect(submitted.feedbackCase.status).toBe("closed");
    expect(await prisma.patientFeedback.count()).toBe(1);
    await expect(
      prisma.patientFeedback.update({
        where: { id: submitted.feedback.id },
        data: { rating: 1 }
      })
    ).rejects.toThrow();
  });

  it("opens a critical clinical-safety case without exposing internal fields publicly", async () => {
    const { direction, visit } = await prepareVisit();
    const token = createFeedbackAccessToken();
    await createPatientFeedbackRequest({
      data: {
        visitId: visit.id,
        ownerId: direction.id,
        deliveryChannel: "in_person",
        expiresInDays: 3
      },
      createdById: direction.id,
      tokenHash: hashFeedbackAccessToken(token)
    });
    const submitted = await submitPatientFeedback({
      data: {
        token,
        rating: 1,
        kind: "complaint",
        area: "clinical_care",
        comment: "Considero que mi salud pudo estar en riesgo.",
        healthRiskFlag: true,
        privacyAcknowledged: true
      }
    });
    const publicState = await getPatientFeedbackForm(token);

    expect(submitted.feedbackCase).toMatchObject({
      classification: "clinical_safety",
      severity: "critical",
      status: "new",
      ownerId: direction.id
    });
    expect(publicState).toEqual({ state: "submitted" });
  });
});
