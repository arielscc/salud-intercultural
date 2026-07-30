import { describe, expect, it } from "vitest";
import {
  correctPrescriptionSchema,
  professionalProfileSchema
} from "@/features/generated-documents/schemas";

describe("versioned document schemas", () => {
  it("requires a meaningful reason for prescription corrections", () => {
    expect(
      correctPrescriptionSchema.safeParse({
        visitId: "visit-1",
        reason: "error",
        medication: "Tratamiento A"
      }).success
    ).toBe(false);
    expect(
      correctPrescriptionSchema.safeParse({
        visitId: "visit-1",
        reason: "Se corrigió la frecuencia indicada",
        medication: "Tratamiento A",
        frequency: "Cada 12 horas"
      }).success
    ).toBe(true);
  });

  it("requires both professional registrations", () => {
    const base = {
      userId: "doctor-1",
      displayName: "Cinthia Apellido",
      professionalTitle: "Dra.",
      specialty: "Medicina natural",
      ministryRegistration: "MS-123",
      medicalCollegeRegistration: "CM-456",
      active: "on"
    };
    expect(professionalProfileSchema.safeParse(base).success).toBe(true);
    expect(
      professionalProfileSchema.safeParse({
        ...base,
        medicalCollegeRegistration: ""
      }).success
    ).toBe(false);
  });
});

