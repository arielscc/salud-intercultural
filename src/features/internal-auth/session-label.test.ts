import { describe, expect, it } from "vitest";
import { describeSessionDevice } from "@/features/internal-auth/session-label";

describe("describeSessionDevice", () => {
  it("creates a short useful label without storing the full user agent", () => {
    expect(
      describeSessionDevice(
        "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/126.0 Mobile"
      )
    ).toBe("Chrome en Android");
    expect(
      describeSessionDevice(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Gecko/20100101 Firefox/127.0"
      )
    ).toBe("Firefox en Windows");
  });

  it("handles sessions created before device labels existed", () => {
    expect(describeSessionDevice()).toBe("Dispositivo no identificado");
  });
});
