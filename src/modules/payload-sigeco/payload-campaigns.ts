import config from "@payload-config";
import { getPayload } from "payload";
import { normalizeCampaignCode } from "@/features/attribution/catalog";
import type { PayloadCampaignContract } from "@/modules/payload-sigeco/contract";

function isCurrentlyActive(campaign: {
  active?: boolean | null;
  startsAt?: string | null;
  endsAt?: string | null;
}) {
  const now = Date.now();
  return (
    campaign.active === true &&
    (!campaign.startsAt || new Date(campaign.startsAt).getTime() <= now) &&
    (!campaign.endsAt || new Date(campaign.endsAt).getTime() > now)
  );
}

export async function findActivePayloadCampaignByCode(
  rawCode: string
): Promise<PayloadCampaignContract | null> {
  const payload = await getPayload({ config });
  const code = normalizeCampaignCode(rawCode);
  const result = await payload.find({
    collection: "marketing-campaigns",
    limit: 1,
    overrideAccess: true,
    where: { code: { equals: code } }
  });
  const campaign = result.docs[0];
  if (!campaign || !isCurrentlyActive(campaign)) return null;

  return {
    externalId: String(campaign.id),
    revision: campaign.updatedAt,
    code: campaign.code,
    name: campaign.name,
    sourceCode: campaign.sourceCode,
    accountLabel: campaign.accountLabel,
    accountHandle: campaign.accountHandle,
    trafficType: campaign.trafficType,
    active: campaign.active,
    startsAt: campaign.startsAt,
    endsAt: campaign.endsAt
  };
}

export async function findPayloadLeadCampaignCode(id: string) {
  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: "lead-submissions",
    limit: 1,
    overrideAccess: true,
    where: { id: { equals: id } },
    select: { campaignCode: true }
  });
  const lead = result.docs[0];
  return lead ? lead.campaignCode ?? "" : null;
}
