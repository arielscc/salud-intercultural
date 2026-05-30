import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { hashPassword } from "@/features/internal-auth/password";
import { prisma } from "@/modules/database";
import { createPatientRecord } from "@/modules/database/queries/patients";
import { createVisitRecord, updateVisitRouteStatus } from "@/modules/database/queries/visits";
import {
  createClinicalOrderRecord,
  getClinicalVisitById,
  getConsultationVisits,
  upsertClinicalConsultationRecord
} from "@/modules/database/queries/clinical-care";

async function cleanClinicalCare() {
  await prisma.nursingWorkItemResult.deleteMany();
  await prisma.nursingApplication.deleteMany();
  await prisma.nursingNote.deleteMany();
  await prisma.vitalSigns.deleteMany();
  await prisma.studyAttachment.deleteMany();
  await prisma.study.deleteMany();
  await prisma.clinicalAttachment.deleteMany();
  await prisma.visit.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.internalSession.deleteMany();
  await prisma.internalUser.deleteMany();
}

beforeEach(cleanClinicalCare);
afterEach(cleanClinicalCare);

describe("clinical care integration", () => {
  it("records consultation, diagnosis, prescription, evolution and clinical order", async () => {
    const doctor = await prisma.internalUser.create({
      data: {
        email: "medico@example.com",
        name: "Medico Test",
        passwordHash: await hashPassword("clave-segura-123"),
        role: "medico"
      }
    });

    const patient = await createPatientRecord({
      fullName: "Paciente Clinico",
      phone: "+591 70000006",
      captureSource: "whatsapp"
    });

    const visit = await createVisitRecord({
      patientId: patient.id,
      userId: doctor.id,
      reason: "Dolor general"
    });

    await updateVisitRouteStatus({
      visitId: visit.id,
      userId: doctor.id,
      status: "in_consultation",
      area: "medico",
      note: "Paciente en consulta"
    });

    await upsertClinicalConsultationRecord({
      visitId: visit.id,
      doctorId: doctor.id,
      motive: "Dolor general",
      primaryDiagnosis: "Diagnostico principal",
      secondaryDiagnosis: "Diagnostico secundario",
      treatmentPlanText: "Plan de tratamiento",
      indications: "Indicaciones generales",
      prescriptionMedication: "Suero ABC",
      prescriptionDose: "1 unidad",
      prescriptionFrequency: "Una vez",
      prescriptionDuration: "Hoy",
      evolutionNote: "Paciente estable"
    });

    await createClinicalOrderRecord({
      visitId: visit.id,
      doctorId: doctor.id,
      type: "serum",
      targetArea: "enfermeria",
      title: "Aplicar suero ABC",
      details: "Aplicar en sala de enfermeria."
    });

    const consultationVisits = await getConsultationVisits();
    const detail = await getClinicalVisitById(visit.id);

    expect(consultationVisits).toHaveLength(1);
    expect(detail?.clinicalConsultation?.diagnoses).toHaveLength(2);
    expect(detail?.prescriptions[0]?.items[0]?.medication).toBe("Suero ABC");
    expect(detail?.clinicalEvolutions[0]?.note).toBe("Paciente estable");
    expect(detail?.clinicalOrders[0]).toMatchObject({
      title: "Aplicar suero ABC",
      targetArea: "enfermeria",
      status: "pending"
    });
    expect(detail?.workItems.some((item) => item.title === "Aplicar suero ABC")).toBe(true);
  });
});
