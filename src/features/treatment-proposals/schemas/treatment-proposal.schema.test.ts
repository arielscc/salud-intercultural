import { describe, expect, it } from "vitest";
import { recordTreatmentProposalOutcomeSchema } from "@/features/treatment-proposals/schemas/treatment-proposal.schema";

describe("treatment proposal outcome schema", () => {
  it("requires an explicit administration instruction when accepted", () => {
    expect(
      recordTreatmentProposalOutcomeSchema.safeParse({
        visitId: "visit-1",
        status: "accepted",
        reason: "agreed_to_start",
        administrationInstruction: ""
      }).success
    ).toBe(false);
  });

  it("accepts a confirmed decision with a clear administration instruction", () => {
    expect(
      recordTreatmentProposalOutcomeSchema.parse({
        visitId: "visit-1",
        status: "accepted",
        reason: "agreed_to_start",
        administrationInstruction:
          "Registrar tratamiento de diez sesiones."
      })
    ).toMatchObject({
      status: "accepted",
      reason: "agreed_to_start"
    });
  });

  it("accepts a needs-time decision without an administration instruction", () => {
    expect(
      recordTreatmentProposalOutcomeSchema.parse({
        visitId: "visit-1",
        status: "needs_time",
        reason: "needs_family_consultation",
        administrationInstruction: ""
      })
    ).toMatchObject({
      status: "needs_time",
      administrationInstruction: undefined
    });
  });

  it("rejects a reason that belongs to a different result", () => {
    expect(
      recordTreatmentProposalOutcomeSchema.safeParse({
        visitId: "visit-1",
        status: "rejected",
        reason: "agreed_to_start"
      }).success
    ).toBe(false);
  });

  it("rejects an administration instruction when the patient did not accept", () => {
    expect(
      recordTreatmentProposalOutcomeSchema.safeParse({
        visitId: "visit-1",
        status: "rejected",
        reason: "cost",
        administrationInstruction: "Crear una venta"
      }).success
    ).toBe(false);
  });
});
