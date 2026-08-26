import { describe, expect, it } from "vitest";
import { submitPatientFeedbackSchema } from "@/features/patient-feedback/schema";

const base = {
  token: "a".repeat(43),
  rating: 3,
  kind: "survey",
  area: "reception",
  comment: "",
  healthRiskFlag: false,
  privacyAcknowledged: true
};

describe("patient feedback schema", () => {
  it("accepts a short survey without a comment", () => {
    expect(submitPatientFeedbackSchema.safeParse(base).success).toBe(true);
  });

  it("requires a useful description for a complaint", () => {
    expect(
      submitPatientFeedbackSchema.safeParse({
        ...base,
        kind: "complaint",
        comment: "mal"
      }).success
    ).toBe(false);
  });

  it("does not attach a clinical-risk signal to a normal survey", () => {
    expect(
      submitPatientFeedbackSchema.safeParse({
        ...base,
        healthRiskFlag: true
      }).success
    ).toBe(false);
  });
});

