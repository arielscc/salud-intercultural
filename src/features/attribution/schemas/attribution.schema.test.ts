import { describe, expect, it } from "vitest";
import {
  createCaptureCampaignSchema,
  createCaptureSourceSchema
} from "@/features/attribution/schemas/attribution.schema";

describe("capture attribution schemas", () => {
  it("normalizes a new source and explicit reception visibility", () => {
    const parsed = createCaptureSourceSchema.parse({
      code: "Radio Local",
      patientLabel: "Radio",
      internalLabel: "Radio local",
      category: "offline",
      sortOrder: "90",
      receptionSelectable: "true"
    });

    expect(parsed).toMatchObject({
      code: "radio_local",
      sortOrder: 90,
      receptionSelectable: true
    });
  });

  it("normalizes a paid campaign code", () => {
    const parsed = createCaptureCampaignSchema.parse({
      code: "cbba julio",
      name: "Campaña Cochabamba julio",
      sourceId: "capture-facebook",
      trafficType: "paid",
      startsAt: "2026-07-01",
      endsAt: "2026-08-01"
    });

    expect(parsed.code).toBe("CBBA-JULIO");
    expect(parsed.trafficType).toBe("paid");
  });

  it("rejects a campaign whose final date precedes its start", () => {
    const parsed = createCaptureCampaignSchema.safeParse({
      code: "CBBA",
      name: "Campaña Cochabamba",
      sourceId: "capture-facebook",
      trafficType: "paid",
      startsAt: "2026-08-01",
      endsAt: "2026-07-01"
    });

    expect(parsed.success).toBe(false);
  });
});
