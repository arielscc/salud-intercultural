import type { AttributionEvidenceKind } from "@/generated/prisma/client";
import { normalizeCampaignCode } from "@/features/attribution/catalog";
import { findActiveCaptureCampaignByCode } from "@/modules/database/queries/attribution";
import { syncPayloadCampaignToSigeco } from "@/modules/payload-sigeco/campaign-sync";
import {
  findActivePayloadCampaignByCode,
  findPayloadLeadCampaignCode
} from "@/modules/payload-sigeco/payload-campaigns";

export type ResolvedAttributionEvidence = {
  campaignId: string;
  campaignCode: string;
  sourceCode: string;
  evidenceKind: AttributionEvidenceKind;
  externalEvidenceCode: string;
  accountLabel: string | null;
  accountHandle: string | null;
};

export type AttributionEvidenceResolution =
  | { status: "none"; evidence: null }
  | { status: "resolved"; evidence: ResolvedAttributionEvidence }
  | { status: "not_found"; evidence: null }
  | { status: "unavailable"; evidence: null };

export async function resolveAttributionEvidence(
  rawCode: string | undefined
): Promise<ResolvedAttributionEvidence | null> {
  const cleaned = rawCode?.trim();
  if (!cleaned) return null;

  const webLeadMatch = /^WEB-(\d+)$/i.exec(cleaned);
  let campaignCode = normalizeCampaignCode(cleaned);
  let evidenceKind: AttributionEvidenceKind = "campaign_link";

  if (webLeadMatch) {
    const leadCampaignCode = await findPayloadLeadCampaignCode(webLeadMatch[1]);
    if (leadCampaignCode === null) return null;
    campaignCode = normalizeCampaignCode(leadCampaignCode || "WEB-FORM");
    evidenceKind = "web_form";
  }

  const payloadCampaign = await findActivePayloadCampaignByCode(campaignCode);
  const legacyCampaign = payloadCampaign
    ? null
    : await findActiveCaptureCampaignByCode(campaignCode);
  const campaign = payloadCampaign
    ? (await syncPayloadCampaignToSigeco(payloadCampaign)).campaign
    : legacyCampaign;
  if (!campaign) return null;

  const sourceCode = payloadCampaign?.sourceCode ?? legacyCampaign?.source.code;
  if (!sourceCode) return null;

  return {
    campaignId: campaign.id,
    campaignCode: campaign.code,
    sourceCode,
    evidenceKind,
    externalEvidenceCode: cleaned.slice(0, 120),
    accountLabel: campaign.accountLabel,
    accountHandle: campaign.accountHandle
  };
}

export async function resolveAttributionEvidenceSafely(
  rawCode: string | undefined
): Promise<AttributionEvidenceResolution> {
  if (!rawCode?.trim()) return { status: "none", evidence: null };

  try {
    const evidence = await resolveAttributionEvidence(rawCode);
    return evidence
      ? { status: "resolved", evidence }
      : { status: "not_found", evidence: null };
  } catch {
    return { status: "unavailable", evidence: null };
  }
}
