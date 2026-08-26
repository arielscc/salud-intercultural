import { describe, expect, it } from "vitest";
import {
  payloadCampaignContractSchema,
  payloadMetricsQuerySchema
} from "@/modules/payload-sigeco/contract";

const validCampaign = {
  externalId: 18,
  revision: "2026-08-01T12:00:00.000Z",
  code: " cbba agosto ",
  name: "Campaña Cochabamba agosto",
  sourceCode: "TikTok",
  accountLabel: "TikTok de la clínica",
  accountHandle: "@cuenta",
  trafficType: "paid",
  active: true,
  startsAt: "2026-08-01T00:00:00.000Z",
  endsAt: "2026-09-01T00:00:00.000Z"
};

describe("Payload-SIGECO integration contract", () => {
  it("normalizes only approved campaign identifiers", () => {
    expect(payloadCampaignContractSchema.parse(validCampaign)).toMatchObject({
      externalId: "18",
      code: "CBBA-AGOSTO",
      sourceCode: "tiktok"
    });
  });

  it.each(["patient", "phone", "diagnosis", "clinicalNote", "treatment"])(
    "rejects the forbidden field %s",
    (field) => {
      expect(
        payloadCampaignContractSchema.safeParse({
          ...validCampaign,
          [field]: "private data"
        }).success
      ).toBe(false);
    }
  );

  it("limits aggregate exports to one year", () => {
    expect(
      payloadMetricsQuerySchema.safeParse({
        from: "2026-01-01",
        to: "2026-12-31"
      }).success
    ).toBe(true);
    expect(
      payloadMetricsQuerySchema.safeParse({
        from: "2025-01-01",
        to: "2026-12-31"
      }).success
    ).toBe(false);
  });
});

