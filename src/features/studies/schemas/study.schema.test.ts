import { describe, expect, it } from "vitest";
import { createStudySchema } from "@/features/studies/schemas/study.schema";

describe("study schemas", () => {
  it("validates resonance and associates patient visit context", () => {
    expect(
      createStudySchema.parse({
        patientId: "patient_1",
        visitId: "visit_1",
        type: "resonance",
        status: "performed",
        title: "Resonancia lumbar",
        resultSummary: "Sin lesión aguda"
      })
    ).toMatchObject({
      patientId: "patient_1",
      visitId: "visit_1",
      type: "resonance",
      status: "performed",
      title: "Resonancia lumbar"
    });
  });

  it("rejects empty study titles", () => {
    expect(() =>
      createStudySchema.parse({
        patientId: "patient_1",
        title: ""
      })
    ).toThrow();
  });
});
