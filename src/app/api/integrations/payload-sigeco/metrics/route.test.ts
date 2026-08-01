import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetPayloadSigecoRateLimitForTests } from "@/modules/payload-sigeco/auth";
import { getApprovedPayloadCampaignMetrics } from "@/modules/payload-sigeco/metrics";
import { GET } from "@/app/api/integrations/payload-sigeco/metrics/route";

vi.mock("@/modules/payload-sigeco/metrics", () => ({
  getApprovedPayloadCampaignMetrics: vi.fn()
}));
vi.mock("@/modules/audit/service", () => ({
  appendAuditEvent: vi.fn().mockResolvedValue({})
}));

const metricsMock = vi.mocked(getApprovedPayloadCampaignMetrics);
const secret = "local-payload-sigeco-integration-secret-only";

function request(authorization = `Bearer ${secret}`) {
  return new Request(
    "http://localhost:3000/api/integrations/payload-sigeco/metrics?from=2026-08-01&to=2026-08-31",
    { headers: { authorization } }
  );
}

beforeEach(() => {
  metricsMock.mockReset();
  resetPayloadSigecoRateLimitForTests();
});

describe("GET Payload-SIGECO metrics", () => {
  it("requires the service token", async () => {
    expect((await GET(request(""))).status).toBe(401);
  });

  it("returns only the approved aggregate DTO", async () => {
    metricsMock.mockResolvedValue({
      period: { from: "2026-08-01", to: "2026-08-31" },
      privacy: { minimumGroupSize: 5, suppressed: false },
      totals: { arrivals: 10, sales: 4, collectedCents: 200_000 },
      campaigns: [
        { code: "TIKTOK-DR", arrivals: 7, sales: 3, collectedCents: 150_000 }
      ]
    });
    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(JSON.stringify(body)).not.toMatch(
      /patient|phone|email|diagnosis|clinical|treatment|visitId/i
    );
    expect(response.headers.get("cache-control")).toContain("no-store");
  });
});
