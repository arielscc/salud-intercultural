"use server";

import { revalidatePath } from "next/cache";
import { auditedResult, runAuditedAction } from "@/modules/audit/service";
import { areaTimeTransitionSchema } from "@/features/area-times/schema";
import { recordAreaTimeTransition } from "@/modules/database/queries/area-times";

export async function recordAreaTimeTransitionAction(formData: FormData) {
  const visitId = String(formData.get("visitId") ?? "");
  await runAuditedAction(
    {
      permission: "area_time_write",
      action: "visit.area_time.transition",
      entityType: "visit",
      entityId: visitId || undefined
    },
    async (user) => {
      const parsed = areaTimeTransitionSchema.safeParse(
        Object.fromEntries(formData.entries())
      );
      if (!parsed.success) {
        throw new Error("AREA_TIME_INVALID_INPUT");
      }
      const event = await recordAreaTimeTransition({
        data: parsed.data,
        userId: user.id,
        userRole: user.role
      });
      revalidatePath("/sigeco");
      revalidatePath("/sigeco/recepcion");
      revalidatePath(`/sigeco/recepcion/visitas/${visitId}`);
      revalidatePath("/sigeco/consultas");
      revalidatePath(`/sigeco/consultas/${visitId}`);
      revalidatePath("/sigeco/enfermeria");
      revalidatePath("/sigeco/administracion");
      revalidatePath("/sigeco/reportes/tiempos");
      return auditedResult(event, {
        entityId: visitId,
        context: { area: event.area, eventType: event.type }
      });
    }
  );
}
