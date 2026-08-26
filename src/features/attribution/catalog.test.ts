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

  it("shows how the patient knew the clinic without contact channels", () => {
    expect(
      visitAttributionSummary({
        touches: [
          {
            role: "primary",
            source: {
              code: "tiktok",
              patientLabel: "TikTok",
              internalLabel: "TikTok",
              category: "social"
            }
          },
          {
            role: "support",
            source: {
              code: "whatsapp",
              patientLabel: "WhatsApp",
              internalLabel: "WhatsApp",
              category: "messaging"
            }
          }
        ]
      })
    ).toBe("TikTok");
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
