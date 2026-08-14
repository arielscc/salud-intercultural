import { describe, expect, it } from "vitest";
import {
  patientEditSchema,
  receptionIntakeSchema,
  toPatientEditRecord,
  toReceptionIntakeRecord
} from "@/features/reception/schemas/intake.schema";

describe("reception intake schema", () => {
  it("accepts the minimal funnel with a classified geographic origin", () => {
    const parsed = receptionIntakeSchema.safeParse({
      fullName: "Maria Quispe",
      phone: "55435344",
      reason: "Dolor de espalda",
      city: "El Alto",
      department: "La Paz",
      country: "Bolivia",
      capturePrimarySource: "other"
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.gender).toBe("unknown");
    expect(parsed.data.intakeType).toBe("first_visit");
    expect(parsed.data.captureSupportSources).toEqual([]);
    expect(toReceptionIntakeRecord(parsed.data).patient.captureSource).toBe("other");
  });

  it("rejects a funnel without reason", () => {
    const parsed = receptionIntakeSchema.safeParse({
      fullName: "Maria Quispe",
      phone: "71234567",
      city: "El Alto",
      department: "La Paz",
      country: "Bolivia",
      capturePrimarySource: "other",
      reason: ""
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects symptom duration with value but no unit", () => {
    const parsed = receptionIntakeSchema.safeParse({
      fullName: "Maria Quispe",
      phone: "71234567",
      city: "El Alto",
      department: "La Paz",
      country: "Bolivia",
      capturePrimarySource: "other",
      reason: "Dolor de espalda",
      symptomDurationValue: "3",
      symptomDurationUnit: ""
    });

    expect(parsed.success).toBe(false);
  });

  it("maps the full funnel to a clean intake record", () => {
    const parsed = receptionIntakeSchema.safeParse({
      patientId: "",
      fullName: "  Maria   Quispe ",
      phone: " 71234567 ",
      secondaryPhone: " 2245678 ",
      birthDate: "1988-04-12",
      gender: "female",
      city: "El Alto",
      department: "La Paz",
      country: "Bolivia",
      reason: "  Dolor de   espalda ",
      symptomDurationValue: "3",
      symptomDurationUnit: "months",
      intakeType: "new_problem",
      previouslyTreated: "yes",
      bringsStudies: "no",
      allergies: "Ninguna conocida",
      relevantHistory: "Diabetes tipo 2",
      currentMedication: "Metformina",
      capturePrimarySource: "referral",
      captureSupportSources: "facebook,whatsapp",
      attributionEvidenceCode: "TIKTOK-DR"
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    const record = toReceptionIntakeRecord(parsed.data);
    expect(record.patientId).toBeUndefined();
    expect(record.patient.fullName).toBe("Maria Quispe");
    expect(record.patient.phone).toBe("71234567");
    expect(record.patient.secondaryPhone).toBe("2245678");
    expect(record.patient.department).toBe("La Paz");
    expect(record.patient.country).toBe("Bolivia");
    expect(record.visit.originCity).toBe("El Alto");
    expect(record.visit.originMatchesPatient).toBe(true);
    expect(record.patient.captureSources).toEqual([
      "referral",
      "facebook",
      "whatsapp"
    ]);
    expect(record.patient.captureSource).toBe("referral");
    expect(record.attribution.primarySourceCode).toBe("referral");
    expect(record.attribution.supportSourceCodes).toEqual([
      "facebook",
      "whatsapp"
    ]);
    expect(record.attribution.evidenceCode).toBe("TIKTOK-DR");
    expect(record.visit.reason).toBe("Dolor de espalda");
    expect(record.visit.symptomDurationValue).toBe(3);
    expect(record.visit.symptomDurationUnit).toBe("months");
    expect(record.visit.previouslyTreated).toBe(true);
    expect(record.visit.bringsStudies).toBe(false);
  });

  it("leaves unanswered yes/no questions undefined", () => {
    const parsed = receptionIntakeSchema.safeParse({
      fullName: "Maria Quispe",
      phone: "71234567",
      city: "El Alto",
      department: "La Paz",
      country: "Bolivia",
      capturePrimarySource: "other",
      reason: "Control",
      previouslyTreated: "",
      bringsStudies: ""
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    const record = toReceptionIntakeRecord(parsed.data);
    expect(record.visit.previouslyTreated).toBeUndefined();
    expect(record.visit.bringsStudies).toBeUndefined();
  });

  it("stores Facebook as a general patient-reported source", () => {
    const parsed = receptionIntakeSchema.parse({
      fullName: "Maria Quispe",
      phone: "71234567",
      city: "El Alto",
      department: "La Paz",
      country: "Bolivia",
      reason: "Control",
      capturePrimarySource: "facebook"
    });

    expect(parsed.capturePrimarySource).toBe("facebook");
    expect(toReceptionIntakeRecord(parsed).patient.captureSource).toBe("facebook");
  });

  it("preserves a different origin for the current visit", () => {
    const parsed = receptionIntakeSchema.parse({
      fullName: "Maria Quispe",
      phone: "71234567",
      city: "El Alto",
      department: "La Paz",
      country: "Bolivia",
      visitOriginMode: "different",
      visitOriginCity: "cbba",
      visitOriginDepartment: "",
      visitOriginCountry: "bol",
      reason: "Control",
      capturePrimarySource: "tiktok"
    });

    const record = toReceptionIntakeRecord(parsed);
    expect(record.patient.city).toBe("El Alto");
    expect(record.visit.originCity).toBe("Cochabamba");
    expect(record.visit.originDepartment).toBe("Cochabamba");
    expect(record.visit.originCountry).toBe("Bolivia");
    expect(record.visit.originMatchesPatient).toBe(false);
  });

  it("rejects an unclassified Bolivian origin", () => {
    const parsed = receptionIntakeSchema.safeParse({
      fullName: "Maria Quispe",
      phone: "71234567",
      city: "Tiquipaya",
      department: "",
      country: "Bolivia",
      capturePrimarySource: "other",
      reason: "Control"
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects WhatsApp numbers that are not exactly eight digits and invalid fixed phones", () => {
    expect(
      receptionIntakeSchema.safeParse({
        fullName: "Maria Quispe",
        phone: "+591 71234567",
        city: "El Alto",
        department: "La Paz",
        country: "Bolivia",
        capturePrimarySource: "other",
        reason: "Control"
      }).success
    ).toBe(false);

    expect(
      receptionIntakeSchema.safeParse({
        fullName: "Maria Quispe",
        phone: "1234567",
        secondaryPhone: "abc",
        city: "El Alto",
        department: "La Paz",
        country: "Bolivia",
        capturePrimarySource: "other",
        reason: "Control"
      }).success
    ).toBe(false);
  });
});

describe("patient edit schema", () => {
  it("maps a full edit to a clean record", () => {
    const parsed = patientEditSchema.safeParse({
      patientId: "abc123",
      fullName: "  Rosa   Huanca ",
      phone: " 765-43210 ",
      birthDate: "1986-02-20",
      gender: "female",
      city: "La Paz",
      department: "La Paz",
      country: "Bolivia",
      allergies: "Penicilina",
      relevantHistory: "Hipertensión",
      currentMedication: "Enalapril"
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    const record = toPatientEditRecord(parsed.data);
    expect(record.patientId).toBe("abc123");
    expect(record.data.fullName).toBe("Rosa Huanca");
    expect(record.data.phone).toBe("765-43210");
    expect(record.data.city).toBe("La Paz");
    expect(record.data.department).toBe("La Paz");
    expect(record.data.country).toBe("Bolivia");
    expect(record.data).not.toHaveProperty("captureSources");
    expect(record.data).not.toHaveProperty("captureSource");
  });

  it("does not accept capture fields as editable patient data", () => {
    const parsed = patientEditSchema.safeParse({
      patientId: "abc123",
      fullName: "Rosa Huanca",
      phone: "76543210",
      city: "La Paz",
      department: "La Paz",
      country: "Bolivia",
      captureSources: "referral,invalido"
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(toPatientEditRecord(parsed.data).data).not.toHaveProperty(
      "captureSources"
    );
  });

  it("clears optional fields that were emptied", () => {
    const parsed = patientEditSchema.safeParse({
      patientId: "abc123",
      fullName: "Rosa Huanca",
      phone: "76543210",
      birthDate: "",
      city: "El Alto",
      department: "La Paz",
      country: "Bolivia",
      allergies: "",
      relevantHistory: "",
      currentMedication: ""
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    const record = toPatientEditRecord(parsed.data);
    expect(record.data.birthDate).toBeNull();
    expect(record.data.city).toBe("El Alto");
    expect(record.data.allergies).toBeNull();
    expect(record.data.relevantHistory).toBeNull();
    expect(record.data.currentMedication).toBeNull();
    expect(record.data.gender).toBe("unknown");
  });

  it("rejects an edit without patient id or with a bad phone", () => {
    expect(
      patientEditSchema.safeParse({
        patientId: "",
        fullName: "Rosa Huanca",
        phone: "76543210",
        city: "El Alto",
        department: "La Paz",
        country: "Bolivia"
      })
        .success
    ).toBe(false);
    expect(
      patientEditSchema.safeParse({
        patientId: "abc",
        fullName: "Rosa Huanca",
        phone: "tel#malo",
        city: "El Alto",
        department: "La Paz",
        country: "Bolivia"
      })
        .success
    ).toBe(false);
  });
});
