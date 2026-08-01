import { describe, expect, it } from "vitest";
import { resolveConnectionQuality } from "@/features/mobile-resilience/connection";

describe("connection quality", () => {
  it("prioritizes the real offline signal", () => {
    expect(
      resolveConnectionQuality({
        online: false,
        effectiveType: "4g"
      })
    ).toBe("offline");
  });

  it("detects slow or data-saving connections", () => {
    expect(resolveConnectionQuality({ online: true, effectiveType: "2g" })).toBe(
      "slow"
    );
    expect(resolveConnectionQuality({ online: true, saveData: true })).toBe(
      "slow"
    );
  });

  it("keeps normal connections unobtrusive", () => {
    expect(resolveConnectionQuality({ online: true, effectiveType: "4g" })).toBe(
      "online"
    );
  });
});
