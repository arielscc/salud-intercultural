import config from "@payload-config";
import { getPayload } from "payload";
import type { AttributionEvidenceKind } from "@/generated/prisma/client";
import { normalizeCampaignCode } from "@/features/attribution/catalog";
import { findActiveCaptureCampaignByCode } from "@/modules/database/queries/attribution";

export type ResolvedAttributionEvidence = {
  campaignId: string;
  campaignCode: string;
  sourceCode: string;
  evidenceKind: AttributionEvidenceKind;
  externalEvidenceCode: string;
  accountLabel: string | null;
  accountHandle: string | null;
};

export async function resolveAttributionEvidence(
  rawCode: string | undefined
): Promise<ResolvedAttributionEvidence | null> {
  const cleaned = rawCode?.trim();
  if (!cleaned) return null;

  const webLeadMatch = /^WEB-(\d+)$/i.exec(cleaned);
  let campaignCode = normalizeCampaignCode(cleaned);
  let evidenceKind: AttributionEvidenceKind = "campaign_link";

  if (webLeadMatch) {
    const payload = await getPayload({ config });
    const lead = await payload
      .findByID({
        collection: "lead-submissions",
        id: webLeadMatch[1],
        overrideAccess: true
      })
      .catch(() => null);

    if (!lead) return null;
    campaignCode = normalizeCampaignCode(lead.campaignCode ?? "WEB-FORM");
    evidenceKind = "web_form";
  }

  const campaign = await findActiveCaptureCampaignByCode(campaignCode);
  if (!campaign) return null;

  return {
    campaignId: campaign.id,
    campaignCode: campaign.code,
    sourceCode: campaign.source.code,
    evidenceKind,
    externalEvidenceCode: cleaned.slice(0, 120),
    accountLabel: campaign.accountLabel,
    accountHandle: campaign.accountHandle
  };
}
