import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCaptureAttributionReport } from "@/modules/database/queries/attribution";
import { prisma } from "@/modules/database";
import { getApprovedPayloadCampaignMetrics } from "@/modules/payload-sigeco/metrics";

vi.mock("@/modules/database/queries/attribution", () => ({
  getCaptureAttributionReport: vi.fn()
}));
vi.mock("@/modules/database", () => ({
  prisma: { auditEvent: { create: vi.fn() } }
}));

const reportMock = vi.mocked(getCaptureAttributionReport);
const auditMock = vi.mocked(prisma.auditEvent.create);
const range = {
  from: new Date("2026-08-01T00:00:00.000Z"),
  to: new Date("2026-09-01T00:00:00.000Z"),
  fromLabel: "2026-08-01",
  toLabel: "2026-08-31"
};

beforeEach(() => {
  reportMock.mockReset();
  auditMock.mockReset();
  auditMock.mockResolvedValue({} as never);
});

describe("approved Payload campaign metrics", () => {
  it("suppresses totals and campaign groups smaller than five", async () => {
    reportMock.mockResolvedValue({
      totals: {
        arrivals: 4,
        patients: 4,
        proposals: 3,
        sales: 2,
        soldCents: 100_000,
        collectedCents: 80_000
      },
      sources: [],
      campaigns: [
        {
          code: "SMALL",
          name: "Grupo pequeño",
          accountLabel: "Cuenta",
          trafficType: "paid",
          arrivals: 4,
          sales: 2,
          collectedCents: 80_000
        }
      ]
    });

    const result = await getApprovedPayloadCampaignMetrics(range);
    expect(result.totals).toBeNull();
    expect(result.campaigns).toEqual([]);
    expect(result.privacy.suppressed).toBe(true);
  });

  it("returns only approved aggregates for sufficiently large groups", async () => {
    reportMock.mockResolvedValue({
      totals: {
        arrivals: 8,
        patients: 7,
        proposals: 6,
        sales: 3,
        soldCents: 200_000,
        collectedCents: 150_000
      },
      sources: [],
      campaigns: [
        {
          code: "TIKTOK-DR",
          name: "Nombre no exportado",
          accountLabel: "Cuenta no exportada",
          trafficType: "organic",
          arrivals: 8,
          sales: 3,
          collectedCents: 150_000
        }
      ]
    });

    expect(await getApprovedPayloadCampaignMetrics(range)).toMatchObject({
      totals: { arrivals: 8, sales: 3, collectedCents: 150_000 },
      campaigns: [
        { code: "TIKTOK-DR", arrivals: 8, sales: 3, collectedCents: 150_000 }
      ]
    });
  });
});
