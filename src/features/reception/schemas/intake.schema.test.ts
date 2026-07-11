import { describe, expect, it } from "vitest";
import {
  patientEditSchema,
  receptionIntakeSchema,
  toPatientEditRecord,
  toReceptionIntakeRecord
} from "@/features/reception/schemas/intake.schema";

describe("reception intake schema", () => {
  it("accepts the minimal funnel with only name, phone and reason", () => {
    const parsed = receptionIntakeSchema.safeParse({
      fullName: "Maria Quispe",
      phone: "+591 71234567",
      reason: "Dolor de espalda"
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.gender).toBe("unknown");
    expect(parsed.data.intakeType).toBe("first_visit");
    expect(parsed.data.captureSource).toBe("other");
    expect(parsed.data.followUpPreference).toBe("unknown");
  });

  it("rejects a funnel without reason", () => {
    const parsed = receptionIntakeSchema.safeParse({
      fullName: "Maria Quispe",
      phone: "+591 71234567",
      reason: ""
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects symptom duration with value but no unit", () => {
    const parsed = receptionIntakeSchema.safeParse({
      fullName: "Maria Quispe",
      phone: "+591 71234567",
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
      phone: " +591 71234567 ",
      birthDate: "1988-04-12",
      gender: "female",
      city: "El Alto",
      reason: "  Dolor de   espalda ",
      symptomDurationValue: "3",
      symptomDurationUnit: "months",
      intakeType: "new_problem",
      previouslyTreated: "yes",
      bringsStudies: "no",
      allergies: "Ninguna conocida",
      relevantHistory: "Diabetes tipo 2",
      currentMedication: "Metformina",
      captureSource: "referral",
      followUpPreference: "whatsapp"
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    const record = toReceptionIntakeRecord(parsed.data);
    expect(record.patientId).toBeUndefined();
    expect(record.patient.fullName).toBe("Maria Quispe");
    expect(record.patient.phone).toBe("+591 71234567");
    expect(record.patient.followUpPreference).toBe("whatsapp");
    expect(record.visit.reason).toBe("Dolor de espalda");
    expect(record.visit.symptomDurationValue).toBe(3);
    expect(record.visit.symptomDurationUnit).toBe("months");
    expect(record.visit.previouslyTreated).toBe(true);
    expect(record.visit.bringsStudies).toBe(false);
  });

  it("leaves unanswered yes/no questions undefined", () => {
    const parsed = receptionIntakeSchema.safeParse({
      fullName: "Maria Quispe",
      phone: "+591 71234567",
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
      allergies: "Penicilina",
      relevantHistory: "Hipertensión",
      currentMedication: "Enalapril",
      captureSource: "referral",
      followUpPreference: "call"
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    const record = toPatientEditRecord(parsed.data);
    expect(record.patientId).toBe("abc123");
    expect(record.data.fullName).toBe("Rosa Huanca");
    expect(record.data.phone).toBe("765-43210");
    expect(record.data.city).toBe("La Paz");
    expect(record.data.followUpPreference).toBe("call");
  });

  it("clears optional fields that were emptied", () => {
    const parsed = patientEditSchema.safeParse({
      patientId: "abc123",
      fullName: "Rosa Huanca",
      phone: "76543210",
      birthDate: "",
      city: "",
      allergies: "",
      relevantHistory: "",
      currentMedication: "",
      followUpPreference: "unknown"
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    const record = toPatientEditRecord(parsed.data);
    expect(record.data.birthDate).toBeNull();
    expect(record.data.city).toBeNull();
    expect(record.data.allergies).toBeNull();
    expect(record.data.relevantHistory).toBeNull();
    expect(record.data.currentMedication).toBeNull();
    expect(record.data.gender).toBe("unknown");
  });

  it("rejects an edit without patient id or with a bad phone", () => {
    expect(
      patientEditSchema.safeParse({ patientId: "", fullName: "Rosa Huanca", phone: "76543210" })
        .success
    ).toBe(false);
    expect(
      patientEditSchema.safeParse({ patientId: "abc", fullName: "Rosa Huanca", phone: "tel#malo" })
        .success
    ).toBe(false);
  });
});
