import { describe, expect, it } from "vitest";
import {
  correctPrescriptionSchema,
  professionalProfileSchema
} from "@/features/generated-documents/schemas";

describe("versioned document schemas", () => {
  it("requires a meaningful reason for prescription corrections", () => {
    const items = JSON.stringify([
      { medication: "Tratamiento A", frequency: "Cada 12 horas" }
    ]);
    expect(
      correctPrescriptionSchema.safeParse({
        visitId: "visit-1",
        reason: "error",
        prescriptionItems: items
      }).success
    ).toBe(false);
    expect(
      correctPrescriptionSchema.safeParse({
        visitId: "visit-1",
        reason: "Se corrigió la frecuencia indicada",
        prescriptionItems: items
      }).success
    ).toBe(true);
  });

  it("requires at least one prescription item to correct", () => {
    expect(
      correctPrescriptionSchema.safeParse({
        visitId: "visit-1",
        reason: "Se corrigió la receta indicada",
        prescriptionItems: "[]"
      }).success
    ).toBe(false);
  });

  it("only requires the name and title; specialty and registrations are optional", () => {
    const minimal = {
      userId: "doctor-1",
      displayName: "Cinthia Apellido",
      professionalTitle: "Dra.",
      active: "on"
    };
    const parsed = professionalProfileSchema.safeParse(minimal);
    expect(parsed.success).toBe(true);
    // Los campos retirados del formulario se rellenan como cadena vacía.
    if (parsed.success) {
      expect(parsed.data.specialty).toBe("");
      expect(parsed.data.ministryRegistration).toBe("");
      expect(parsed.data.medicalCollegeRegistration).toBe("");
    }

    // El nombre profesional sigue siendo obligatorio.
    expect(
      professionalProfileSchema.safeParse({ ...minimal, displayName: "" }).success
    ).toBe(false);
  });
});

