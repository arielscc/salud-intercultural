import { afterEach, describe, expect, it } from "vitest";
import { getCashCloseApprovalThresholdCents } from "@/features/cash/policy";

const originalThreshold =
  process.env.CASH_CLOSE_APPROVAL_THRESHOLD_CENTS;

afterEach(() => {
  if (originalThreshold === undefined) {
    delete process.env.CASH_CLOSE_APPROVAL_THRESHOLD_CENTS;
  } else {
    process.env.CASH_CLOSE_APPROVAL_THRESHOLD_CENTS = originalThreshold;
  }
});

describe("cash close policy", () => {
  it("uses Bs 20 when no limit is configured", () => {
    delete process.env.CASH_CLOSE_APPROVAL_THRESHOLD_CENTS;
    expect(getCashCloseApprovalThresholdCents()).toBe(2_000);
  });

  it("accepts an explicitly configured amount in cents", () => {
    process.env.CASH_CLOSE_APPROVAL_THRESHOLD_CENTS = "3500";
    expect(getCashCloseApprovalThresholdCents()).toBe(3_500);
  });

  it("rejects a typo instead of silently changing the control", () => {
    process.env.CASH_CLOSE_APPROVAL_THRESHOLD_CENTS = "Bs 20";
    expect(() => getCashCloseApprovalThresholdCents()).toThrow(
      "CASH_CLOSE_APPROVAL_THRESHOLD_CENTS"
    );
  });
});
