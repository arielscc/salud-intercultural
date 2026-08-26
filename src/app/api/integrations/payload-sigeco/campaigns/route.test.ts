import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetPayloadSigecoRateLimitForTests } from "@/modules/payload-sigeco/auth";
import { syncPayloadCampaignToSigeco } from "@/modules/payload-sigeco/campaign-sync";
import { POST } from "@/app/api/integrations/payload-sigeco/campaigns/route";

vi.mock("@/modules/payload-sigeco/campaign-sync", () => ({
  syncPayloadCampaignToSigeco: vi.fn()
}));
vi.mock("@/modules/audit/service", () => ({
  appendAuditEvent: vi.fn().mockResolvedValue({})
}));

const syncMock = vi.mocked(syncPayloadCampaignToSigeco);
const secret = "local-payload-sigeco-integration-secret-only";
const campaign = {
  externalId: "18",
  revision: "2026-08-01T12:00:00.000Z",
  code: "CBBA-AGOSTO",
  name: "Campaña Cochabamba agosto",
  sourceCode: "tiktok",
  trafficType: "paid",
  active: true
};

function request(body: unknown, authorization = `Bearer ${secret}`) {
  return new Request(
    "http://localhost:3000/api/integrations/payload-sigeco/campaigns",
    {
      method: "POST",
      headers: { authorization, "content-type": "application/json" },
      body: JSON.stringify(body)
    }
  );
}

beforeEach(() => {
  syncMock.mockReset();
  resetPayloadSigecoRateLimitForTests();
});

describe("POST Payload-SIGECO campaigns", () => {
  it("requires the dedicated service token", async () => {
    const response = await POST(request(campaign, "Bearer wrong"));
    expect(response.status).toBe(401);
    expect(syncMock).not.toHaveBeenCalled();
  });

  it("rejects personal or clinical fields", async () => {
    const response = await POST(request({ ...campaign, patient: "A" }));
    expect(response.status).toBe(422);
    expect(syncMock).not.toHaveBeenCalled();
  });

  it("accepts an approved idempotent campaign snapshot", async () => {
    syncMock.mockResolvedValue({
      campaign: { code: campaign.code } as never,
      outcome: "updated"
    });
    const response = await POST(request(campaign));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      campaign: { code: campaign.code },
      outcome: "updated"
    });
  });

  it("returns a retryable result without leaking an internal error", async () => {
    syncMock.mockRejectedValue(new Error("postgresql://private/patient"));
    const response = await POST(request(campaign));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      ok: false,
      error: "sync_unavailable",
      retryable: true
    });
  });
});
