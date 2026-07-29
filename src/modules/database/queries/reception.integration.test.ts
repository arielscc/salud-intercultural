import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { hashPassword } from "@/features/internal-auth/password";
import { prisma } from "@/modules/database";
import {
  createReceptionIntake,
  getReceptionDashboardSummary,
  searchReceptionPatients,
  updateReceptionPatient
} from "@/modules/database/queries/reception";
import { createPatientRecord } from "@/modules/database/queries/patients";
import { updateVisitRouteStatus } from "@/modules/database/queries/visits";

async function cleanReceptionData() {
  await prisma.visit.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.internalSession.deleteMany();
  await prisma.internalUser.deleteMany();
}

beforeEach(cleanReceptionData);
afterEach(cleanReceptionData);

async function createReceptionUser() {
  return prisma.internalUser.create({
    data: {
      email: "recepcion-intake@example.com",
      name: "Recepcion Intake",
      passwordHash: await hashPassword("clave-segura-123"),
      role: "recepcion"
    }
  });
}

describe("reception intake integration", () => {
  it("creates patient and visit with the full funnel in one transaction", async () => {
    const user = await createReceptionUser();

    const result = await createReceptionIntake({
      userId: user.id,
      patient: {
        fullName: "Maria Quispe",
        phone: "+591 71234567",
        birthDate: new Date("1988-04-12"),
        gender: "female",
        city: "El Alto",
        captureSource: "referral",
        allergies: "Ninguna conocida",
        relevantHistory: "Diabetes tipo 2",
        currentMedication: "Metformina",
        followUpPreference: "whatsapp"
      },
      visit: {
        reason: "Dolor de espalda",
        intakeType: "new_problem",
        symptomDurationValue: 3,
        symptomDurationUnit: "months",
        previouslyTreated: true,
        bringsStudies: false
      }
    });

    const patient = await prisma.patient.findUniqueOrThrow({
      where: { id: result.patientId }
    });
    const visit = await prisma.visit.findUniqueOrThrow({
      where: { id: result.visit.id },
      include: {
        checkIn: true,
        route: { include: { steps: true } },
        statusHistory: true,
        workItems: true
      }
    });

    expect(patient.internalCode).toBe("SI-000001");
    expect(patient.currentMedication).toBe("Metformina");
    expect(patient.followUpPreference).toBe("whatsapp");
    expect(patient.firstVisitAt).not.toBeNull();

    expect(visit.status).toBe("in_reception");
    expect(visit.reason).toBe("Dolor de espalda");
    expect(visit.intakeType).toBe("new_problem");
    expect(visit.symptomDurationValue).toBe(3);
    expect(visit.symptomDurationUnit).toBe("months");
    expect(visit.previouslyTreated).toBe(true);
    expect(visit.bringsStudies).toBe(false);
    expect(visit.checkIn).not.toBeNull();
    expect(visit.route?.currentArea).toBe("recepcion");
    expect(visit.route?.steps).toHaveLength(1);
    expect(visit.statusHistory).toHaveLength(1);
    expect(visit.workItems).toHaveLength(1);
  });

  it("updates an existing patient and opens a new visit without duplicating the record", async () => {
    const user = await createReceptionUser();
    const existing = await createPatientRecord({
      fullName: "Jose Mamani",
      phone: "+591 70000001",
      city: "La Paz",
      captureSource: "whatsapp"
    });

    const result = await createReceptionIntake({
      userId: user.id,
      patientId: existing.id,
      patient: {
        fullName: "Jose Mamani",
        phone: "+591 70000001",
        city: "El Alto",
        currentMedication: "Ibuprofeno",
        followUpPreference: "call"
      },
      visit: {
        reason: "Control de tratamiento",
        intakeType: "treatment_control"
      }
    });

    const patients = await prisma.patient.findMany();
    const updated = await prisma.patient.findUniqueOrThrow({ where: { id: existing.id } });

    expect(result.patientId).toBe(existing.id);
    expect(patients).toHaveLength(1);
    expect(updated.city).toBe("El Alto");
    expect(updated.currentMedication).toBe("Ibuprofeno");
    expect(updated.followUpPreference).toBe("call");
    expect(result.visit.intakeType).toBe("treatment_control");
  });

  it("creates the minimal intake with only name, phone and reason", async () => {
    const user = await createReceptionUser();

    const result = await createReceptionIntake({
      userId: user.id,
      patient: {
        fullName: "Ana Condori",
        phone: "+591 79999999"
      },
      visit: {
        reason: "Consulta general"
      }
    });

    const patient = await prisma.patient.findUniqueOrThrow({
      where: { id: result.patientId }
    });

    expect(patient.gender).toBe("unknown");
    expect(patient.captureSource).toBe("other");
    expect(patient.followUpPreference).toBe("unknown");
    expect(result.visit.intakeType).toBe("first_visit");
    expect(result.visit.bringsStudies).toBe(false);
    expect(result.visit.previouslyTreated).toBeNull();
  });

  it("corrects patient data in place without creating duplicates", async () => {
    const existing = await createPatientRecord({
      fullName: "Rosa Wanca",
      phone: "+591 76543211",
      city: "La Paz",
      captureSource: "referral",
      allergies: "Penicilina"
    });

    const updated = await updateReceptionPatient(existing.id, {
      fullName: "Rosa Huanca",
      phone: "76543210",
      birthDate: new Date("1986-02-20"),
      gender: "female",
      city: "El Alto",
      captureSource: "referral",
      captureSources: ["referral", "facebook"],
      allergies: null,
      relevantHistory: "Hipertensión",
      currentMedication: null
    });

    const patients = await prisma.patient.findMany();

    expect(patients).toHaveLength(1);
    expect(updated.id).toBe(existing.id);
    expect(updated.internalCode).toBe(existing.internalCode);
    expect(updated.fullName).toBe("Rosa Huanca");
    expect(updated.phone).toBe("76543210");
    expect(updated.city).toBe("El Alto");
    expect(updated.captureSources).toEqual(["referral", "facebook"]);
    expect(updated.allergies).toBeNull();
    expect(updated.relevantHistory).toBe("Hipertensión");
    expect(updated.followUpPreference).toBe("unknown");
  });

  it("finds patients for prefill by name, phone and internal code", async () => {
    await createPatientRecord({
      fullName: "Lucia Fernanda Choque Mamani",
      phone: "+591 71112222",
      city: "El Alto"
    });

    const byName = await searchReceptionPatients("lucia");
    const bySeparatedNames = await searchReceptionPatients("lucia choque");
    const byPhone = await searchReceptionPatients("7111");
    const byCode = await searchReceptionPatients("SI-0000");
    const noMatch = await searchReceptionPatients("inexistente");

    expect(byName).toHaveLength(1);
    expect(bySeparatedNames).toHaveLength(1);
    expect(byPhone).toHaveLength(1);
    expect(byCode).toHaveLength(1);
    expect(noMatch).toHaveLength(0);
  });

  it("summarizes unique arrivals, active routes and today abandonments", async () => {
    const user = await createReceptionUser();
    const first = await createReceptionIntake({
      userId: user.id,
      patient: { fullName: "Paciente Uno", phone: "70000001" },
      visit: { reason: "Primera llegada" }
    });
    await createReceptionIntake({
      userId: user.id,
      patientId: first.patientId,
      patient: { fullName: "Paciente Uno", phone: "70000001" },
      visit: { reason: "Segunda llegada" }
    });
    const second = await createReceptionIntake({
      userId: user.id,
      patient: { fullName: "Paciente Dos", phone: "70000002" },
      visit: { reason: "Consulta del día" }
    });

    await updateVisitRouteStatus({
      visitId: second.visit.id,
      userId: user.id,
      status: "left_without_care",
      area: "recepcion",
      note: "Se retiró en recepción"
    });

    const summary = await getReceptionDashboardSummary();

    expect(summary.patientsToday).toBe(2);
    expect(summary.activeTotal).toBe(2);
    expect(summary.activeByArea.recepcion).toBe(2);
    expect(summary.abandonmentsToday).toBe(1);
    expect(summary.latestArrivals).toHaveLength(3);
    expect(summary.latestArrivals.map((visit) => visit.patient.fullName)).toContain("Paciente Dos");
  });
});
