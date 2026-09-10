import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { hashPassword } from "@/features/internal-auth/password";
import { prisma } from "@/modules/database";
import {
  createReceptionIntake,
  getReceptionDashboardSummary,
  getReceptionPatientById,
  searchReceptionPatients,
  updateReceptionPatient
} from "@/modules/database/queries/reception";
import {
  createPatientRecord,
  getPatientById
} from "@/modules/database/queries/patients";
import {
  createVisitRecord,
  getVisitById,
  getVisits,
  updateVisitRouteStatus
} from "@/modules/database/queries/visits";
import { recordVisitDiscontinuation } from "@/modules/database/queries/visit-discontinuations";
import { appendPatientConsentRecord } from "@/modules/database/queries/patient-consents";

const habitualOrigin = {
  city: "El Alto",
  department: "La Paz",
  country: "Bolivia"
};

const visitOrigin = {
  originCity: "El Alto",
  originDepartment: "La Paz",
  originCountry: "Bolivia",
  originMatchesPatient: true
};

const reportedAttribution = {
  primarySourceCode: "other",
  supportSourceCodes: [] as string[]
};

async function cleanReceptionData() {
  await prisma.visitDiscontinuation.deleteMany();
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "PatientConsent" CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "VisitAreaTimeEvent" CASCADE');
  await prisma.visit.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.internalSession.deleteMany();
  await prisma.internalUser.deleteMany();
}

async function seedReceptionCaptureSources() {
  await Promise.all(
    [
      ["referral", "Recomendación", "Recomendación", "referral"],
      ["whatsapp", "WhatsApp", "WhatsApp", "messaging"],
      ["tiktok", "TikTok", "TikTok", "social"],
      ["other", "Otro", "Otro", "other"]
    ].map(([code, patientLabel, internalLabel, category]) =>
      prisma.captureSource.upsert({
        where: { code },
        create: {
          code,
          patientLabel,
          internalLabel,
          category: category as "referral" | "messaging" | "social" | "other"
        },
        update: {}
      })
    )
  );
}

beforeEach(async () => {
  await cleanReceptionData();
  await seedReceptionCaptureSources();
});
afterEach(cleanReceptionData);

async function createReceptionUser() {
  return prisma.internalUser.create({
    data: {
      email: "recepcion-intake@example.com",
      name: "Recepcion Intake",
      passwordHash: await hashPassword("clave-segura-123"),
      branchAssignments: {
        create: { branchCode: "el-alto", role: "recepcion", active: true, isDefault: true }
      }
    }
  });
}

describe("reception intake integration", () => {
  it("creates patient and visit with the full funnel in one transaction", async () => {
    const user = await createReceptionUser();

    const result = await createReceptionIntake({
      branchCode: "el-alto",
      userId: user.id,
      patient: {
        fullName: "Maria Quispe",
        phone: "+591 71234567",
        birthDate: new Date("1988-04-12"),
        gender: "female",
        ...habitualOrigin,
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
        bringsStudies: false,
        ...visitOrigin
      },
      attribution: {
        primarySourceCode: "referral",
        supportSourceCodes: ["whatsapp"]
      }
    });

    const patient = await prisma.patient.findUniqueOrThrow({
      where: { id: result.patientId },
      include: { branchRecords: { where: { branchCode: "el-alto" } } }
    });
    const visit = await prisma.visit.findUniqueOrThrow({
      where: { id: result.visit.id },
      include: {
        checkIn: true,
        areaTimeEvents: { orderBy: { sequence: "asc" } },
        route: { include: { steps: true } },
        statusHistory: true,
        workItems: true,
        attribution: {
          include: { touches: { include: { source: true } } }
        }
      }
    });

    expect(patient.internalCode).toBe("SI-000001");
    expect(patient.branchRecords[0]?.currentMedication).toBe("Metformina");
    expect(patient.followUpPreference).toBe("whatsapp");
    expect(patient.firstVisitAt).not.toBeNull();

    expect(visit.status).toBe("in_reception");
    expect(visit.reason).toBe("Dolor de espalda");
    expect(visit.intakeType).toBe("new_problem");
    expect(visit.symptomDurationValue).toBe(3);
    expect(visit.symptomDurationUnit).toBe("months");
    expect(visit.previouslyTreated).toBe(true);
    expect(visit.bringsStudies).toBe(false);
    expect(visit.originCity).toBe("El Alto");
    expect(visit.originDepartment).toBe("La Paz");
    expect(visit.originCountry).toBe("Bolivia");
    expect(visit.checkIn).not.toBeNull();
    expect(visit.areaTimeEvents.map((event) => event.type)).toEqual([
      "entered",
      "attention_started"
    ]);
    expect(visit.route?.currentArea).toBe("recepcion");
    expect(visit.route?.steps).toHaveLength(1);
    expect(visit.statusHistory).toHaveLength(1);
    expect(visit.workItems).toHaveLength(1);
    expect(result.attribution.touches).toHaveLength(2);
    expect(
      result.attribution.touches.find((touch) => touch.role === "primary")
        ?.source.code
    ).toBe("referral");
  });

  it("updates an existing patient and opens a new visit without duplicating the record", async () => {
    const user = await createReceptionUser();
    const existing = await createPatientRecord({
      branchCode: "el-alto",
      fullName: "Jose Mamani",
      phone: "+591 70000001",
      city: "La Paz",
      captureSource: "whatsapp"
    });

    const result = await createReceptionIntake({
      branchCode: "el-alto",
      userId: user.id,
      patientId: existing.id,
      patient: {
        fullName: "Jose Mamani",
        phone: "+591 70000001",
        ...habitualOrigin,
        currentMedication: "Ibuprofeno",
        followUpPreference: "call"
      },
      visit: {
        reason: "Control de tratamiento",
        intakeType: "treatment_control",
        originCity: "Cochabamba",
        originDepartment: "Cochabamba",
        originCountry: "Bolivia",
        originMatchesPatient: false
      },
      attribution: {
        primarySourceCode: "tiktok",
        supportSourceCodes: ["whatsapp"]
      }
    });

    const patients = await prisma.patient.findMany();
    const updated = await prisma.patient.findUniqueOrThrow({
      where: { id: existing.id },
      include: { branchRecords: { where: { branchCode: "el-alto" } } }
    });

    expect(result.patientId).toBe(existing.id);
    expect(patients).toHaveLength(1);
    expect(updated.city).toBe("El Alto");
    expect(updated.branchRecords[0]?.currentMedication).toBe("Ibuprofeno");
    expect(updated.followUpPreference).toBe("call");
    expect(result.visit.intakeType).toBe("treatment_control");
    expect(result.visit.originCity).toBe("Cochabamba");
    expect(result.visit.originMatchesPatient).toBe(false);
    // La nueva llegada no reemplaza la fuente original de la ficha.
    expect(updated.captureSource).toBe("whatsapp");
  });

  it("creates the minimal intake with only name, phone and reason", async () => {
    const user = await createReceptionUser();

    const result = await createReceptionIntake({
      branchCode: "el-alto",
      userId: user.id,
      patient: {
        fullName: "Ana Condori",
        phone: "+591 79999999",
        ...habitualOrigin
      },
      visit: {
        reason: "Consulta general",
        ...visitOrigin
      },
      attribution: reportedAttribution
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
    const user = await createReceptionUser();
    const existing = await createPatientRecord({
      branchCode: "el-alto",
      fullName: "Rosa Wanca",
      phone: "+591 76543211",
      city: "La Paz",
      captureSource: "referral",
      allergies: "Penicilina"
    });

    const updated = await updateReceptionPatient(existing.id, "el-alto", user.id, {
      fullName: "Rosa Huanca",
      phone: "76543210",
      birthDate: new Date("1986-02-20"),
      gender: "female",
      city: "El Alto",
      department: "La Paz",
      country: "Bolivia",
      address: "Av. Siempre Viva 123",
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
    expect(updated.captureSources).toEqual(["referral"]);
    expect(updated.allergies).toBeNull();
    expect(updated.relevantHistory).toBe("Hipertensión");
    expect(updated.followUpPreference).toBe("unknown");
  });

  it("finds patients for prefill by name, phone and internal code", async () => {
    await createPatientRecord({
      branchCode: "el-alto",
      fullName: "Lucia Fernanda Choque Mamani",
      phone: "+591 71112222",
      city: "El Alto"
    });

    const byName = await searchReceptionPatients("lucia", "el-alto");
    const bySeparatedNames = await searchReceptionPatients("lucia choque", "el-alto");
    const byPhone = await searchReceptionPatients("7111", "el-alto");
    const byCode = await searchReceptionPatients("SI-0000", "el-alto");
    const noMatch = await searchReceptionPatients("inexistente", "el-alto");

    expect(byName).toHaveLength(1);
    expect(bySeparatedNames).toHaveLength(1);
    expect(byPhone).toHaveLength(1);
    expect(byCode).toHaveLength(1);
    expect(noMatch).toHaveLength(0);
  });

  it("links an exact global identity without exposing it through local fuzzy search", async () => {
    const user = await createReceptionUser();
    const patient = await createPatientRecord({
      branchCode: "cochabamba",
      documentNumber: "9876543-CB",
      fullName: "Paciente Viajera Exclusiva",
      phone: "71234567",
      city: "Cochabamba",
      department: "Cochabamba",
      country: "Bolivia"
    });

    expect(await searchReceptionPatients("Viajera", "el-alto")).toHaveLength(0);
    expect(await getReceptionPatientById(patient.id, "el-alto")).toBeNull();
    expect(await searchReceptionPatients("71234567", "el-alto")).toEqual([
      expect.objectContaining({ id: patient.id, linkedToActiveBranch: false })
    ]);

    const intake = await createReceptionIntake({
      branchCode: "el-alto",
      userId: user.id,
      patientId: patient.id,
      patient: {
        documentNumber: "9876543-CB",
        fullName: "Paciente Viajera Exclusiva",
        phone: "71234567",
        city: "Cochabamba",
        department: "Cochabamba",
        country: "Bolivia"
      },
      visit: { reason: "Atención durante viaje", ...visitOrigin },
      attribution: reportedAttribution
    });

    expect(intake.patientId).toBe(patient.id);
    expect(await prisma.patient.count()).toBe(1);
    expect(
      await prisma.patientBranchRecord.findMany({
        where: { patientId: patient.id },
        orderBy: { branchCode: "asc" },
        select: { branchCode: true }
      })
    ).toEqual([{ branchCode: "cochabamba" }, { branchCode: "el-alto" }]);
  });

  it("versions the global contact without rewriting a visit snapshot", async () => {
    const user = await createReceptionUser();
    const patient = await createPatientRecord({
      branchCode: "el-alto",
      documentNumber: "4567890-LP",
      fullName: "Paciente Con Snapshot",
      phone: "70000021",
      address: "Dirección anterior",
      city: "El Alto",
      department: "La Paz",
      country: "Bolivia",
      createdById: user.id
    });
    const visit = await createVisitRecord({
      branchCode: "el-alto",
      patientId: patient.id,
      userId: user.id,
      reason: "Control"
    });

    await updateReceptionPatient(patient.id, "el-alto", user.id, {
      documentNumber: "4567890-LP",
      fullName: patient.fullName,
      phone: "70000022",
      address: "Dirección vigente",
      birthDate: null,
      gender: "unknown",
      city: "El Alto",
      department: "La Paz",
      country: "Bolivia",
      allergies: null,
      relevantHistory: null,
      currentMedication: null
    });

    const [identity, historicVisit, versions] = await Promise.all([
      prisma.patient.findUniqueOrThrow({ where: { id: patient.id } }),
      prisma.visit.findUniqueOrThrow({ where: { id: visit.id } }),
      prisma.patientIdentityVersion.count({ where: { patientId: patient.id } })
    ]);
    expect(identity.phone).toBe("70000022");
    expect(identity.address).toBe("Dirección vigente");
    expect(historicVisit.patientPhoneSnapshot).toBe("70000021");
    expect(historicVisit.patientAddressSnapshot).toBe("Dirección anterior");
    expect(versions).toBe(2);
  });

  it("keeps contact consent local and clinical continuity corporate", async () => {
    const user = await createReceptionUser();
    const patient = await createPatientRecord({
      branchCode: "el-alto",
      fullName: "Paciente Consentimientos",
      phone: "70000031",
      createdById: user.id
    });
    await prisma.patientBranchRecord.create({
      data: {
        patientId: patient.id,
        branchCode: "cochabamba",
        recordNumber: `cochabamba-${patient.internalCode}`
      }
    });
    await appendPatientConsentRecord({
      patientId: patient.id,
      branchCode: "el-alto",
      purpose: "follow_up",
      decision: "granted",
      contactChannels: ["whatsapp"],
      captureMethod: "in_person_verbal",
      recordedById: user.id
    });
    await appendPatientConsentRecord({
      patientId: patient.id,
      branchCode: "cochabamba",
      purpose: "follow_up",
      decision: "denied",
      contactChannels: [],
      captureMethod: "in_person_verbal",
      recordedById: user.id
    });
    await appendPatientConsentRecord({
      patientId: patient.id,
      branchCode: "el-alto",
      purpose: "clinical_continuity",
      decision: "granted",
      contactChannels: [],
      captureMethod: "written_form",
      recordedById: user.id
    });

    const [elAlto, cochabamba] = await Promise.all([
      getPatientById(patient.id, "el-alto"),
      getPatientById(patient.id, "cochabamba")
    ]);
    expect(elAlto?.consents.map((consent) => consent.purpose).sort()).toEqual([
      "clinical_continuity",
      "follow_up"
    ]);
    expect(cochabamba?.consents.map((consent) => consent.purpose).sort()).toEqual([
      "clinical_continuity",
      "follow_up"
    ]);
    expect(elAlto?.consents.find((consent) => consent.purpose === "follow_up")?.decision)
      .toBe("granted");
    expect(
      cochabamba?.consents.find((consent) => consent.purpose === "follow_up")?.decision
    ).toBe("denied");
  });

  it("preserves and filters a closed visit from Cochabamba", async () => {
    const user = await createReceptionUser();
    const result = await createReceptionIntake({
      branchCode: "cochabamba",
      userId: user.id,
      patient: {
        fullName: "Paciente viajero",
        phone: "70000009",
        ...habitualOrigin
      },
      visit: {
        reason: "Control durante viaje",
        originCity: "Cochabamba",
        originDepartment: "Cochabamba",
        originCountry: "Bolivia",
        originMatchesPatient: false
      },
      attribution: reportedAttribution
    });

    await updateVisitRouteStatus({
      visitId: result.visit.id,
      branchCode: "cochabamba",
      userId: user.id,
      status: "completed",
      area: "cierre",
      note: "Atención terminada"
    });
    await updateReceptionPatient(result.patientId, "cochabamba", user.id, {
      fullName: "Paciente viajero",
      phone: "70000009",
      birthDate: null,
      gender: "unknown",
      city: "La Paz",
      department: "La Paz",
      country: "Bolivia",
      address: null,
      allergies: null,
      relevantHistory: null,
      currentMedication: null
    });

    const closedVisit = await getVisitById(result.visit.id, "cochabamba");
    const cochabambaVisits = await getVisits({
      branchCode: "cochabamba",
      originCity: "Cochabamba",
      originDepartment: "Cochabamba"
    });

    expect(closedVisit?.originCity).toBe("Cochabamba");
    expect(closedVisit?.originDepartment).toBe("Cochabamba");
    expect(closedVisit?.originMatchesPatient).toBe(false);
    expect(cochabambaVisits.map((visit) => visit.id)).toContain(result.visit.id);
  });

  it("does not count an active Cochabamba visit on the El Alto dashboard", async () => {
    const user = await createReceptionUser();
    await createReceptionIntake({
      branchCode: "cochabamba",
      userId: user.id,
      patient: {
        fullName: "Paciente solo Cochabamba",
        phone: "70000019",
        ...habitualOrigin
      },
      visit: {
        reason: "Consulta activa en Cochabamba",
        originCity: "Cochabamba",
        originDepartment: "Cochabamba",
        originCountry: "Bolivia",
        originMatchesPatient: false
      },
      attribution: reportedAttribution
    });

    const [elAlto, cochabamba] = await Promise.all([
      getReceptionDashboardSummary("el-alto"),
      getReceptionDashboardSummary("cochabamba")
    ]);

    expect(elAlto.activeTotal).toBe(0);
    expect(cochabamba.activeTotal).toBe(1);
  });

  it("summarizes unique arrivals, active routes and today abandonments", async () => {
    const user = await createReceptionUser();
    const first = await createReceptionIntake({
      branchCode: "el-alto",
      userId: user.id,
      patient: { fullName: "Paciente Uno", phone: "70000001", ...habitualOrigin },
      visit: { reason: "Primera llegada", ...visitOrigin },
      attribution: reportedAttribution
    });
    await createReceptionIntake({
      branchCode: "el-alto",
      userId: user.id,
      patientId: first.patientId,
      patient: { fullName: "Paciente Uno", phone: "70000001", ...habitualOrigin },
      visit: { reason: "Segunda llegada", ...visitOrigin },
      attribution: reportedAttribution
    });
    const second = await createReceptionIntake({
      branchCode: "el-alto",
      userId: user.id,
      patient: { fullName: "Paciente Dos", phone: "70000002", ...habitualOrigin },
      visit: { reason: "Consulta del día", ...visitOrigin },
      attribution: reportedAttribution
    });

    await recordVisitDiscontinuation({
      visitId: second.visit.id,
      branchCode: "el-alto",
      recordedById: user.id,
      reason: "wait",
      pendingTypes: ["consultation"],
      createFollowUp: false,
      note: "Se retiró en recepción"
    });

    const summary = await getReceptionDashboardSummary("el-alto");

    expect(summary.patientsToday).toBe(2);
    expect(summary.activeTotal).toBe(2);
    expect(summary.activeByArea.recepcion).toBe(2);
    expect(summary.abandonmentsToday).toBe(1);
    expect(summary.latestArrivals).toHaveLength(3);
    expect(summary.latestArrivals.map((visit) => visit.patient.fullName)).toContain("Paciente Dos");
  });
});
