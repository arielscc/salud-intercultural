import { describe, expect, it } from "vitest";
import {
  normalizeCampaignCode,
  normalizeCaptureCode,
  toCompatiblePatientCaptureSource,
  verifiedAttributionDetail,
  visitAttributionSummary
} from "@/features/attribution/catalog";

describe("capture attribution helpers", () => {
  it("normalizes catalog and campaign codes", () => {
    expect(normalizeCaptureCode(" Radio Comunitaria ")).toBe(
      "radio_comunitaria"
    );
    expect(normalizeCampaignCode(" cbba julio 2026 ")).toBe("CBBA-JULIO-2026");
  });

  it("keeps compatible patient sources and maps custom sources to other", () => {
    expect(toCompatiblePatientCaptureSource("facebook")).toBe("facebook");
    expect(toCompatiblePatientCaptureSource("radio")).toBe("other");
  });

  it("shows primary and support sources without erasing either one", () => {
    expect(
      visitAttributionSummary({
        touches: [
          {
            role: "primary",
            source: { patientLabel: "TikTok", internalLabel: "TikTok" }
          },
          {
            role: "support",
            source: { patientLabel: "WhatsApp", internalLabel: "WhatsApp" }
          }
        ]
      })
    ).toBe("TikTok + WhatsApp");
  });

  it("shows exact account and traffic only when campaign evidence exists", () => {
    expect(verifiedAttributionDetail({ campaign: null })).toBe(
      "No identificado"
    );
    expect(
      verifiedAttributionDetail({
        campaign: {
          accountLabel: "TikTok del Dr. Franco",
          name: "Contenido del doctor",
          trafficType: "organic"
        }
      })
    ).toBe("TikTok del Dr. Franco · Orgánico");
  });
});
