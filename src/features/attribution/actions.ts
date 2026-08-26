"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createCaptureSourceSchema,
  updateCaptureSourceSchema
} from "@/features/attribution/schemas/attribution.schema";
import { auditedResult, runAuditedAction } from "@/modules/audit/service";
import {
  createCaptureSourceRecord,
  updateCaptureSourceRecord
} from "@/modules/database/queries/attribution";

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
