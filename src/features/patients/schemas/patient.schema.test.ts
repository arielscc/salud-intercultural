import { describe, expect, it } from "vitest";
import { createPatientSchema, sanitizePatientInput } from "@/features/patients/schemas/patient.schema";

describe("patient schemas", () => {
  it("validates and sanitizes patient input", () => {
    const parsed = createPatientSchema.parse({
      fullName: "  Paciente   Prueba  ",
      phone: "+591 70000004",
      city: " El Alto ",
      gender: "female",
      captureSource: "whatsapp"
    });

    expect(sanitizePatientInput(parsed)).toMatchObject({
      fullName: "Paciente Prueba",
      phone: "+591 70000004",
      city: "El Alto",
      gender: "female",
      captureSource: "whatsapp"
    });
  });

  it("rejects invalid core patient data", () => {
    expect(() =>
      createPatientSchema.parse({
        fullName: "A",
        phone: "abc"
      })
    ).toThrow();
  });
});
