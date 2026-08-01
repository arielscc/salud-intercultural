import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { hashPassword } from "@/features/internal-auth/password";
import { prisma } from "@/modules/database";
import { getPatientJourneyReport } from "@/modules/database/queries/patient-journey";

async function cleanJourney() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "VisitDiscontinuation", "FollowUpStatusHistory", "FollowUpAttempt", "FollowUpTask", "SaleItem", "Payment", "Sale", "TreatmentProposalOutcome", "ClinicalConsultationVersion", "Diagnosis", "TreatmentPlan", "ClinicalConsultation", "VisitAttributionTouch", "VisitAttribution", "CaptureCampaign", "CaptureSource", "Visit", "Patient", "InternalSession", "InternalUser" CASCADE'
  );
}

beforeEach(cleanJourney);
afterEach(cleanJourney);

describe("patient journey report integration", () => {
  it("reconciles one visit with its current clinical and financial sources", async () => {
    const passwordHash = await hashPassword("clave-segura-recorrido-123");
    const doctor = await prisma.internalUser.create({
      data: {
        email: `doctor-${randomUUID()}@example.com`,
        name: "Médico de prueba",
        passwordHash,
        role: "medico"
      }
    });
    const patient = await prisma.patient.create({
      data: {
        internalCode: `P-${randomUUID().slice(0, 8)}`,
        fullName: "Paciente de recorrido",
        phone: "70000000"
      }
    });
    const source = await prisma.captureSource.create({
      data: {
        code: `tiktok-${randomUUID().slice(0, 8)}`,
        patientLabel: "TikTok",
        internalLabel: "TikTok clínica",
        category: "social"
      }
    });
    const visit = await prisma.visit.create({
      data: {
        patientId: patient.id,
        branchCode: "el-alto",
        originCity: "El Alto",
        originDepartment: "La Paz",
        checkedInAt: new Date("2026-07-30T14:00:00.000Z"),
        status: "completed"
      }
    });
    await prisma.visitAttribution.create({
      data: {
        visitId: visit.id,
        patientId: patient.id,
        touches: {
          create: {
            sourceId: source.id,
            role: "primary",
            evidenceKind: "patient_reported"
          }
        }
      }
    });
    const consultation = await prisma.clinicalConsultation.create({
      data: {
        visitId: visit.id,
        patientId: patient.id,
        doctorId: doctor.id,
        finalizedById: doctor.id,
        finalizedAt: new Date("2026-07-30T15:00:00.000Z"),
        status: "finalized",
        motive: "Consulta de prueba"
      }
    });
    const administrationOrder = await prisma.clinicalOrder.create({
      data: {
        visitId: visit.id,
        patientId: patient.id,
        doctorId: doctor.id,
        type: "administration",
        targetArea: "administracion",
        title: "Iniciar tratamiento"
      }
    });
    await prisma.treatmentProposalOutcome.create({
      data: {
        consultationId: consultation.id,
        visitId: visit.id,
        doctorId: doctor.id,
        status: "accepted",
        reason: "agreed_to_start",
        administrationInstruction: "Coordinar el inicio del tratamiento",
        administrationOrderId: administrationOrder.id
      }
    });
    await prisma.sale.create({
      data: {
        patientId: patient.id,
        visitId: visit.id,
        status: "partial",
        subtotalCents: 10_000,
        totalCents: 10_000,
        paidCents: 6_000,
        balanceCents: 4_000
      }
    });
    await prisma.sale.create({
      data: {
        patientId: patient.id,
        visitId: visit.id,
        status: "cancelled",
        subtotalCents: 99_000,
        totalCents: 99_000,
        balanceCents: 99_000
      }
    });
    await prisma.followUpTask.create({
      data: {
        patientId: patient.id,
        visitId: visit.id,
        type: "return",
        domain: "clinical",
        title: "Confirmar retorno",
        dueAt: new Date("2026-08-02T14:00:00.000Z")
      }
    });

    const report = await getPatientJourneyReport({
      from: new Date("2026-07-30T04:00:00.000Z"),
      to: new Date("2026-07-31T04:00:00.000Z"),
      sourceCode: source.code,
      city: "El Alto",
      doctorId: doctor.id,
      branchCode: "el-alto"
    });

    expect(report.rows).toHaveLength(1);
    expect(report.totals).toMatchObject({
      arrivals: 1,
      consultations: 1,
      finalizedConsultations: 1,
      proposals: 1,
      accepted: 1,
      visitsWithSale: 1,
      sales: 1,
      soldCents: 10_000,
      collectedCents: 6_000,
      pendingCents: 4_000,
      followUps: 1
    });
    expect(report.sources[0]).toMatchObject({
      code: source.code,
      totals: { arrivals: 1, collectedCents: 6_000 }
    });
  });
});
