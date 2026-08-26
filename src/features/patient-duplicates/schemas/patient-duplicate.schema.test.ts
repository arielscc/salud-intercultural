import { describe, expect, it } from "vitest";
import {
  dismissPatientDuplicateSchema,
  mergePatientDuplicateSchema
} from "@/features/patient-duplicates/schemas/patient-duplicate.schema";

describe("patient duplicate action schemas", () => {
  it("accepts a complete merge decision", () => {
    expect(
      mergePatientDuplicateSchema.safeParse({
        candidateId: "candidate-1",
        sourcePatientId: "patient-source",
        targetPatientId: "patient-target",
        confirmation: "SI-000001"
      }).success
    ).toBe(true);
  });

  it("rejects choosing the same patient as source and target", () => {
    expect(
      mergePatientDuplicateSchema.safeParse({
        candidateId: "candidate-1",
        sourcePatientId: "patient-1",
        targetPatientId: "patient-1",
        confirmation: "SI-000001"
      }).success
    ).toBe(false);
  });

  it("requires a candidate when dismissing", () => {
    expect(
      dismissPatientDuplicateSchema.safeParse({ candidateId: "" }).success
    ).toBe(false);
  });
});
