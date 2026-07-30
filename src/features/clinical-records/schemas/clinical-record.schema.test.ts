import { describe, expect, it } from "vitest";
import {
  correctClinicalConsultationSchema,
  finalizeClinicalConsultationSchema
} from "@/features/clinical-records/schemas/clinical-record.schema";

describe("clinical record schemas", () => {
  it("requires the revision used by the doctor when finalizing", () => {
    expect(
      finalizeClinicalConsultationSchema.parse({
        visitId: "visit-1",
        consultationId: "consultation-1",
        expectedRevision: "2"
      }).expectedRevision
    ).toBe(2);
  });

  it("requires a correction type, reason and complete current snapshot", () => {
    expect(() =>
      correctClinicalConsultationSchema.parse({
        visitId: "visit-1",
        consultationId: "consultation-1",
        expectedRevision: 2,
        correctionType: "diagnosis",
        correctionReason: "corto",
        motive: "Dolor abdominal",
        primaryDiagnosis: "Gastritis"
      })
    ).toThrow();

    expect(
      correctClinicalConsultationSchema.parse({
        visitId: "visit-1",
        consultationId: "consultation-1",
        expectedRevision: 2,
        correctionType: "diagnosis",
        correctionReason: "Se digitó incorrectamente el diagnóstico.",
        motive: "Dolor abdominal",
        primaryDiagnosis: "Gastritis aguda"
      }).correctionType
    ).toBe("diagnosis");
  });
});

