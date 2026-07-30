import { describe, expect, it } from "vitest";
import { recordVisitDiscontinuationSchema } from "@/features/visit-discontinuations/schemas/visit-discontinuation.schema";

describe("recordVisitDiscontinuationSchema", () => {
  it("requires a simple reason", () => {
    expect(
      recordVisitDiscontinuationSchema.safeParse({
        visitId: "visit-1",
        reason: "",
        pendingTypes: [],
        createFollowUp: false
      }).success
    ).toBe(false);
  });

  it("accepts pending work and an optional recovery follow-up", () => {
    const parsed = recordVisitDiscontinuationSchema.safeParse({
      visitId: "visit-1",
      reason: "cost",
      note: "Consultará con su familia.",
      pendingTypes: ["payment", "follow_up"],
      createFollowUp: true
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.pendingTypes).toEqual(["payment", "follow_up"]);
      expect(parsed.data.createFollowUp).toBe(true);
    }
  });
});
