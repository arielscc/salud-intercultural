"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createCaptureCampaignSchema,
  createCaptureSourceSchema,
  updateCaptureSourceSchema
} from "@/features/attribution/schemas/attribution.schema";
import { auditedResult, runAuditedAction } from "@/modules/audit/service";
import {
  createCaptureCampaignRecord,
  createCaptureSourceRecord,
  setCaptureCampaignActiveRecord,
  updateCaptureSourceRecord
} from "@/modules/database/queries/attribution";
import { dateOnlyRange } from "@/lib/dates";

function formValues(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export async function createCaptureSourceAction(formData: FormData) {
  const source = await runAuditedAction(
    {
      permission: "attribution_manage",
      action: "attribution.source.create",
      entityType: "capture_source"
    },
    async () => {
      const parsed = createCaptureSourceSchema.safeParse(formValues(formData));
      if (!parsed.success) redirect("/sigeco/atribucion?error=fuente-invalida");
      const created = await createCaptureSourceRecord(parsed.data);
      return auditedResult(created, {
        entityId: created.id,
        context: {
          code: created.code,
          category: created.category,
          receptionSelectable: created.receptionSelectable
        }
      });
    }
  );

  revalidatePath("/sigeco/atribucion");
  revalidatePath("/sigeco/recepcion/nuevo");
  redirect(`/sigeco/atribucion?aviso=fuente-creada&fuente=${source.id}`);
}

export async function updateCaptureSourceAction(formData: FormData) {
  const sourceId = String(formData.get("sourceId") ?? "");
  await runAuditedAction(
    {
      permission: "attribution_manage",
      action: "attribution.source.update",
      entityType: "capture_source",
      entityId: sourceId || undefined
    },
    async () => {
      const parsed = updateCaptureSourceSchema.safeParse(formValues(formData));
      if (!parsed.success) redirect("/sigeco/atribucion?error=fuente-invalida");
      const updated = await updateCaptureSourceRecord(parsed.data);
      return auditedResult(updated, {
        entityId: updated.id,
        context: {
          code: updated.code,
          active: updated.active,
          receptionSelectable: updated.receptionSelectable
        }
      });
    }
  );

  revalidatePath("/sigeco/atribucion");
  revalidatePath("/sigeco/recepcion/nuevo");
  redirect("/sigeco/atribucion?aviso=fuente-actualizada");
}

export async function createCaptureCampaignAction(formData: FormData) {
  const campaign = await runAuditedAction(
    {
      permission: "attribution_manage",
      action: "attribution.campaign.create",
      entityType: "capture_campaign"
    },
    async () => {
      const values = formValues(formData);
      const campaignRange = dateOnlyRange(
        String(values.startsAt ?? ""),
        String(values.endsAt ?? "")
      );
      const parsed = createCaptureCampaignSchema.safeParse({
        ...values,
        startsAt: campaignRange.start,
        endsAt: campaignRange.end
      });
      if (!parsed.success) redirect("/sigeco/atribucion?error=campana-invalida");
      const created = await createCaptureCampaignRecord(parsed.data);
      return auditedResult(created, {
        entityId: created.id,
        context: {
          code: created.code,
          sourceId: created.sourceId,
          trafficType: created.trafficType
        }
      });
    }
  );

  revalidatePath("/sigeco/atribucion");
  redirect(`/sigeco/atribucion?aviso=campana-creada&campana=${campaign.id}`);
}

export async function setCaptureCampaignActiveAction(formData: FormData) {
  const campaignId = String(formData.get("campaignId") ?? "");
  const active = formData.get("active") === "true";

  await runAuditedAction(
    {
      permission: "attribution_manage",
      action: "attribution.campaign.access.update",
      entityType: "capture_campaign",
      entityId: campaignId || undefined
    },
    async () => {
      if (!campaignId) redirect("/sigeco/atribucion?error=campana-invalida");
      const updated = await setCaptureCampaignActiveRecord({
        campaignId,
        active
      });
      return auditedResult(updated, {
        entityId: updated.id,
        context: { code: updated.code, active: updated.active }
      });
    }
  );

  revalidatePath("/sigeco/atribucion");
  redirect("/sigeco/atribucion?aviso=campana-actualizada");
}
