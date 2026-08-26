import { describe, expect, it } from "vitest";
import { recordPatientConsentSchema } from "@/features/patient-consents/schemas/patient-consent.schema";

const base = {
  patientId: "patient-1",
  purpose: "follow_up",
  decision: "granted",
  captureMethod: "in_person_verbal",
  textVersion: "v2"
};

describe("record patient consent schema", () => {
  it("requires a channel for an accepted contact purpose", () => {
    expect(
      recordPatientConsentSchema.safeParse({
        ...base,
        contactChannels: []
      }).success
    ).toBe(false);
  });

  it("accepts independent channels for a contact purpose", () => {
    expect(
      recordPatientConsentSchema.safeParse({
        ...base,
        contactChannels: ["whatsapp"]
      }).success
    ).toBe(true);
  });

  it("does not attach contact channels to image and voice authorization", () => {
    expect(
      recordPatientConsentSchema.safeParse({
        ...base,
        purpose: "image_voice",
        contactChannels: ["whatsapp"]
      }).success
    ).toBe(false);
  });

  it("treats feedback as an independent contact purpose", () => {
    expect(
      recordPatientConsentSchema.safeParse({
        ...base,
        purpose: "feedback",
        contactChannels: ["whatsapp"]
      }).success
    ).toBe(true);
  });

  it("rejects a manipulated or obsolete text version", () => {
    expect(
      recordPatientConsentSchema.safeParse({
        ...base,
        textVersion: "v0",
        contactChannels: ["call"]
      }).success
    ).toBe(false);
  });
});
