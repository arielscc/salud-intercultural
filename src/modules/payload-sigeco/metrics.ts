import { randomUUID } from "node:crypto";
import { getCaptureAttributionReport } from "@/modules/database/queries/attribution";
import { prisma } from "@/modules/database";
import { PAYLOAD_SIGECO_MIN_AGGREGATE } from "@/modules/payload-sigeco/contract";
import { runWithDatabaseRlsContext } from "@/modules/database/rls-context";

export async function getApprovedPayloadCampaignMetrics(input: {
  branchCode: string;
  from: Date;
  to: Date;
  fromLabel: string;
  toLabel: string;
}) {
  return runWithDatabaseRlsContext(
    {
      branchCode: input.branchCode,
      userId: "payload-sigeco:metrics",
      effectiveRole: "system_job",
      accessMode: "work"
    },
    async () => {
      const report = await getCaptureAttributionReport({
        branchCode: input.branchCode,
        from: input.from,
        to: input.to
      });
      const suppressed = report.totals.arrivals < PAYLOAD_SIGECO_MIN_AGGREGATE;
      const campaigns = report.campaigns
        .filter((campaign) => campaign.arrivals >= PAYLOAD_SIGECO_MIN_AGGREGATE)
        .map((campaign) => ({
          code: campaign.code,
          arrivals: campaign.arrivals,
          sales: campaign.sales,
          collectedCents: campaign.collectedCents
        }));

      await prisma.auditEvent.create({
        data: {
          scope: "branch",
          branchCode: input.branchCode,
          action: "integration.payload_metrics.export",
          entityType: "attribution_metrics",
          result: "success",
          requestId: randomUUID(),
          context: {
            from: input.fromLabel,
            to: input.toLabel,
            suppressed,
            campaignGroups: campaigns.length
          }
        }
      });

      return {
        branchCode: input.branchCode,
        period: { from: input.fromLabel, to: input.toLabel },
        privacy: {
          minimumGroupSize: PAYLOAD_SIGECO_MIN_AGGREGATE,
          suppressed
        },
        totals: suppressed
          ? null
          : {
              arrivals: report.totals.arrivals,
              sales: report.totals.sales,
              collectedCents: report.totals.collectedCents
            },
        campaigns
      };
    }
  );
}
