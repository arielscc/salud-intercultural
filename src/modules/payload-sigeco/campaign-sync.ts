import { randomUUID } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import {
  payloadCampaignContractSchema,
  type PayloadCampaignContract
} from "@/modules/payload-sigeco/contract";
import { prisma } from "@/modules/database";

function campaignData(
  input: PayloadCampaignContract,
  sourceId: string,
  syncedAt: Date
): Prisma.CaptureCampaignUncheckedCreateInput {
  return {
    code: input.code,
    name: input.name,
    sourceId,
    accountLabel: input.accountLabel || null,
    accountHandle: input.accountHandle || null,
    trafficType: input.trafficType,
    active: input.active,
    startsAt: input.startsAt ? new Date(input.startsAt) : null,
    endsAt: input.endsAt ? new Date(input.endsAt) : null,
    payloadCampaignId: input.externalId,
    payloadUpdatedAt: new Date(input.revision),
    syncedAt,
    managedByPayload: true
  };
}

export async function syncPayloadCampaignToSigeco(rawInput: unknown) {
  const input = payloadCampaignContractSchema.parse(rawInput);

  return prisma.$transaction(async (tx) => {
    const source = await tx.captureSource.findUnique({
      where: { code: input.sourceCode }
    });
    if (!source) throw new Error("PAYLOAD_CAMPAIGN_SOURCE_NOT_CONFIGURED");

    const [byExternalId, byCode] = await Promise.all([
      tx.captureCampaign.findUnique({
        where: { payloadCampaignId: input.externalId }
      }),
      tx.captureCampaign.findUnique({ where: { code: input.code } })
    ]);
    if (byExternalId && byCode && byExternalId.id !== byCode.id) {
      throw new Error("PAYLOAD_CAMPAIGN_IDENTITY_CONFLICT");
    }

    const existing = byExternalId ?? byCode;
    const revision = new Date(input.revision);
    if (
      existing?.payloadUpdatedAt &&
      existing.payloadUpdatedAt.getTime() >= revision.getTime()
    ) {
      return { campaign: existing, outcome: "stale_ignored" as const };
    }

    const syncedAt = new Date();
    const data = campaignData(input, source.id, syncedAt);
    const campaign = existing
      ? await tx.captureCampaign.update({ where: { id: existing.id }, data })
      : await tx.captureCampaign.create({ data });

    await tx.auditEvent.create({
      data: {
        action: "integration.payload_campaign.sync",
        entityType: "capture_campaign",
        entityId: campaign.id,
        result: "success",
        requestId: randomUUID(),
        context: {
          code: campaign.code,
          sourceCode: input.sourceCode,
          active: campaign.active,
          outcome: existing ? "updated" : "created"
        }
      }
    });

    return {
      campaign,
      outcome: existing ? ("updated" as const) : ("created" as const)
    };
  });
}

export async function deactivatePayloadCampaignInSigeco(externalId: string) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.captureCampaign.findUnique({
      where: { payloadCampaignId: String(externalId) }
    });
    if (!existing || !existing.active) return existing;

    const campaign = await tx.captureCampaign.update({
      where: { id: existing.id },
      data: { active: false, syncedAt: new Date() }
    });
    await tx.auditEvent.create({
      data: {
        action: "integration.payload_campaign.deactivate",
        entityType: "capture_campaign",
        entityId: campaign.id,
        result: "success",
        requestId: randomUUID(),
        context: { code: campaign.code }
      }
    });
    return campaign;
  });
}
