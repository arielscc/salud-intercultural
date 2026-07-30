import { describe, expect, it } from "vitest";
import {
  changedClinicalSnapshotFields,
  clinicalSnapshotChanged
} from "@/features/clinical-records/policy";

const original = {
  motive: "Dolor",
  primaryDiagnosis: "Gastritis",
  secondaryDiagnosis: null,
  findings: "Dolor abdominal",
  observations: null,
  treatmentPlanText: "Plan inicial",
  indications: "Control"
};

describe("clinical record version policy", () => {
  it("ignores empty and whitespace-only differences", () => {
    expect(
      clinicalSnapshotChanged(original, {
        ...original,
        secondaryDiagnosis: "",
        observations: "   "
      })
    ).toBe(false);
  });

  it("identifies exactly which approved fields changed", () => {
    const corrected = {
      ...original,
      primaryDiagnosis: "Gastritis aguda",
      indications: "Control en siete días"
    };

    expect(clinicalSnapshotChanged(original, corrected)).toBe(true);
    expect(changedClinicalSnapshotFields(original, corrected)).toEqual([
      "primaryDiagnosis",
      "indications"
    ]);
  });
});

