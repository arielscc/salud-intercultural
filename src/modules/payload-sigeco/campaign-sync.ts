import { randomUUID } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import {
  payloadCampaignContractSchema,
  type PayloadCampaignContract
} from "@/modules/payload-sigeco/contract";
import { prisma } from "@/modules/database";
import { appendAuditEvent } from "@/modules/audit/append";
import { runWithDatabaseRlsContext } from "@/modules/database/rls-context";

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

  const { campaign, existing, branchCodes, stale } = await prisma.$transaction(async (tx) => {
    const [source, branches] = await Promise.all([
      tx.captureSource.findUnique({ where: { code: input.sourceCode } }),
      tx.clinicBranch.findMany({
        where: { status: { not: "inactive" } },
        select: { code: true }
      })
    ]);
    if (!source) throw new Error("PAYLOAD_CAMPAIGN_SOURCE_NOT_CONFIGURED");
    const configuredCodes = new Set(branches.map(({ code }) => code));
    if (input.branchCodes.some((branchCode) => !configuredCodes.has(branchCode))) {
      throw new Error("PAYLOAD_CAMPAIGN_BRANCH_NOT_CONFIGURED");
    }

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
      return {
        campaign: existing,
        existing,
        branchCodes: branches.map(({ code }) => code),
        stale: true
      };
    }

    const syncedAt = new Date();
    const data = campaignData(input, source.id, syncedAt);
    const campaign = existing
      ? await tx.captureCampaign.update({ where: { id: existing.id }, data })
      : await tx.captureCampaign.create({ data });

    return {
      campaign,
      existing,
      branchCodes: branches.map(({ code }) => code),
      stale: false
    };
  });

  if (stale) return { campaign, outcome: "stale_ignored" as const };

  for (const branchCode of branchCodes) {
    await runWithDatabaseRlsContext(
      {
        branchCode,
        userId: "payload-sigeco:campaign-sync",
        effectiveRole: "system_job",
        accessMode: "work"
      },
      async () => {
        if (input.branchCodes.includes(branchCode)) {
          await prisma.captureCampaignBranch.upsert({
            where: { campaignId_branchCode: { campaignId: campaign.id, branchCode } },
            create: { campaignId: campaign.id, branchCode, active: true },
            update: { active: true }
          });
          return;
        }
        await prisma.captureCampaignBranch.updateMany({
          where: { campaignId: campaign.id, branchCode },
          data: { active: false }
        });
      }
    );
  }

  const outcome = existing ? ("updated" as const) : ("created" as const);
  await appendAuditEvent({
    scope: "platform",
    action: "integration.payload_campaign.sync",
    entityType: "capture_campaign",
    entityId: campaign.id,
    result: "success",
    requestId: randomUUID(),
    context: {
      code: campaign.code,
      sourceCode: input.sourceCode,
      branchCodes: input.branchCodes,
      active: campaign.active,
      outcome
    }
  });

  return { campaign, outcome };
}

export async function deactivatePayloadCampaignInSigeco(externalId: string) {
  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.captureCampaign.findUnique({
      where: { payloadCampaignId: String(externalId) }
    });
    if (!existing || !existing.active) return { campaign: existing, branchCodes: [] };

    const campaign = await tx.captureCampaign.update({
      where: { id: existing.id },
      data: { active: false, syncedAt: new Date() }
    });
    const branches = await tx.clinicBranch.findMany({
      where: { status: { not: "inactive" } },
      select: { code: true }
    });
    return { campaign, branchCodes: branches.map(({ code }) => code) };
  });

  if (!result.campaign) return result.campaign;
  for (const branchCode of result.branchCodes) {
    await runWithDatabaseRlsContext(
      {
        branchCode,
        userId: "payload-sigeco:campaign-sync",
        effectiveRole: "system_job",
        accessMode: "work"
      },
      () =>
        prisma.captureCampaignBranch.updateMany({
          where: { campaignId: result.campaign!.id, branchCode },
          data: { active: false }
        })
    );
  }
  await appendAuditEvent({
    scope: "platform",
    action: "integration.payload_campaign.deactivate",
    entityType: "capture_campaign",
    entityId: result.campaign.id,
    result: "success",
    requestId: randomUUID(),
    context: { code: result.campaign.code }
  });
  return result.campaign;
}
