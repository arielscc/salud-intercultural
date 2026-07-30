import { describe, expect, it } from "vitest";
import {
  createClinicalOrderSchema,
  sanitizeClinicalConsultationInput,
  upsertClinicalConsultationSchema
} from "@/features/clinical-care/schemas/clinical-care.schema";

describe("clinical care schemas", () => {
  it("validates and sanitizes consultation input", () => {
    const parsed = upsertClinicalConsultationSchema.parse({
      visitId: "visit_1",
      expectedRevision: 0,
      motive: "  Dolor   general  ",
      primaryDiagnosis: "  Diagnostico principal  ",
      treatmentPlanText: "Plan inicial",
      prescriptionMedication: "Suero ABC"
    });

    expect(sanitizeClinicalConsultationInput(parsed)).toMatchObject({
      visitId: "visit_1",
      motive: "Dolor general",
      primaryDiagnosis: "Diagnostico principal",
      treatmentPlanText: "Plan inicial",
      prescriptionMedication: "Suero ABC"
    });
  });

  it("validates clinical orders for destination areas", () => {
    expect(
      createClinicalOrderSchema.parse({
        visitId: "visit_1",
        type: "serum",
        targetArea: "enfermeria",
        title: "Aplicar suero ABC"
      })
    ).toMatchObject({
      type: "serum",
      targetArea: "enfermeria"
    });
  });

  it("rejects missing core clinical fields", () => {
    expect(() =>
      upsertClinicalConsultationSchema.parse({
        visitId: "visit_1",
        expectedRevision: 0,
        motive: "",
        primaryDiagnosis: ""
      })
    ).toThrow();
  });
});
