import { describe, expect, it } from "vitest";
import { deriveVisitPendingTypes } from "@/features/visit-discontinuations/policy";

describe("deriveVisitPendingTypes", () => {
  it("combines what the employee selected with detected unfinished work", () => {
    expect(
      deriveVisitPendingTypes(["consultation", "follow_up"], {
        consultation: false,
        study: true,
        application: false,
        payment: true,
        delivery: false,
        followUp: true
      })
    ).toEqual(["consultation", "study", "payment", "follow_up"]);
  });

  it("does not invent pending work when nothing was selected or detected", () => {
    expect(
      deriveVisitPendingTypes([], {
        consultation: false,
        study: false,
        application: false,
        payment: false,
        delivery: false,
        followUp: false
      })
    ).toEqual([]);
  });
});
