import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveAttributionEvidenceSafely } from "@/features/attribution/evidence";
import { findActiveCaptureCampaignByCode } from "@/modules/database/queries/attribution";
import { syncPayloadCampaignToSigeco } from "@/modules/payload-sigeco/campaign-sync";
import { findActivePayloadCampaignByCode } from "@/modules/payload-sigeco/payload-campaigns";

vi.mock("@/modules/database/queries/attribution", () => ({
  findActiveCaptureCampaignByCode: vi.fn()
}));
vi.mock("@/modules/payload-sigeco/campaign-sync", () => ({
  syncPayloadCampaignToSigeco: vi.fn()
}));
vi.mock("@/modules/payload-sigeco/payload-campaigns", () => ({
  findActivePayloadCampaignByCode: vi.fn(),
  findPayloadLeadCampaignCode: vi.fn()
}));

const payloadCampaignMock = vi.mocked(findActivePayloadCampaignByCode);
const legacyCampaignMock = vi.mocked(findActiveCaptureCampaignByCode);
const syncMock = vi.mocked(syncPayloadCampaignToSigeco);

beforeEach(() => {
  payloadCampaignMock.mockReset();
  legacyCampaignMock.mockReset();
  syncMock.mockReset();
});

describe("safe attribution evidence", () => {
  it("marks the integration unavailable instead of throwing", async () => {
    payloadCampaignMock.mockRejectedValue(new Error("Payload unavailable"));
    await expect(resolveAttributionEvidenceSafely("TIKTOK-DR")).resolves.toEqual({
      status: "unavailable",
      evidence: null
    });
  });

  it("keeps manual intake available when no evidence was supplied", async () => {
    await expect(resolveAttributionEvidenceSafely(undefined)).resolves.toEqual({
      status: "none",
      evidence: null
    });
    expect(payloadCampaignMock).not.toHaveBeenCalled();
  });
});
