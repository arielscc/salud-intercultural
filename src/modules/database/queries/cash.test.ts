import { describe, expect, it } from "vitest";
import { calculateCashExpected } from "@/modules/database/queries/cash";

describe("calculateCashExpected", () => {
  it("reconciles cash and electronic channels separately", () => {
    expect(
      calculateCashExpected({
        openingCashCents: 10_000,
        movements: [
          { type: "income", channel: "cash", amountCents: 20_000 },
          { type: "expense", channel: "cash", amountCents: 4_500 },
          { type: "refund", channel: "cash", amountCents: 2_000 },
          { type: "reversal", channel: "cash", amountCents: 500 },
          { type: "income", channel: "qr", amountCents: 15_000 },
          { type: "refund", channel: "qr", amountCents: 1_500 },
          { type: "income", channel: "transfer", amountCents: 8_000 }
        ]
      })
    ).toEqual({
      cash: 24_000,
      qr: 13_500,
      card: 0,
      transfer: 8_000,
      other: 0
    });
  });

  it("keeps legacy positive adjustments explicit", () => {
    expect(
      calculateCashExpected({
        openingCashCents: 0,
        movements: [
          { type: "adjustment", channel: "cash", amountCents: 1_000 }
        ]
      }).cash
    ).toBe(1_000);
  });
});
