import { describe, expect, it } from "vitest";
import {
  canContactPatient,
  hasCurrentConsent
} from "@/features/patient-consents/policy";

describe("patient consent contact policy", () => {
  const granted = {
    purpose: "follow_up" as const,
    decision: "granted" as const,
    contactChannels: ["whatsapp" as const]
  };

  it("allows only the purpose and channel explicitly granted", () => {
    expect(canContactPatient(granted, "follow_up", "whatsapp")).toBe(true);
    expect(canContactPatient(granted, "follow_up", "call")).toBe(false);
    expect(canContactPatient(granted, "promotions", "whatsapp")).toBe(false);
  });

  it("blocks missing, denied and withdrawn decisions", () => {
    expect(hasCurrentConsent(undefined, "follow_up")).toBe(false);
    expect(
      canContactPatient(
        { ...granted, decision: "denied" },
        "follow_up",
        "whatsapp"
      )
    ).toBe(false);
    expect(
      canContactPatient(
        { ...granted, decision: "withdrawn" },
        "follow_up",
        "whatsapp"
      )
    ).toBe(false);
  });
});
