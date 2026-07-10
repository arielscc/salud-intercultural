import { describe, expect, it } from "vitest";
import {
  receptionIntakeSchema,
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
