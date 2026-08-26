"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auditedResult, runAuditedAction } from "@/modules/audit/service";
import { recordVisitDiscontinuationSchema } from "@/features/visit-discontinuations/schemas/visit-discontinuation.schema";
import {
  findVisitDiscontinuationError,
  recordVisitDiscontinuation
} from "@/modules/database/queries/visit-discontinuations";

export async function recordVisitDiscontinuationAction(formData: FormData) {
  const visitId = String(formData.get("visitId") ?? "");
  const result = await runAuditedAction(
    {
      permission: "visit_discontinuations_write",
      action: "visit.discontinuation.record",
      entityType: "visit",
      entityId: visitId || undefined
    },
    async (user) => {
      const parsed = recordVisitDiscontinuationSchema.safeParse({
        visitId,
        reason: formData.get("reason"),
        note: formData.get("note"),
        pendingTypes: formData.getAll("pendingTypes"),
        createFollowUp: formData.get("createFollowUp") === "on"
      });

      if (!parsed.success) {
        redirect(
          `/sigeco/recepcion/visitas/${encodeURIComponent(
            visitId
          )}?error=abandono-invalido#no-continuara`
        );
      }

      try {
        const recorded = await recordVisitDiscontinuation({
          ...parsed.data,
          recordedById: user.id
        });
        return auditedResult(recorded, {
          entityId: parsed.data.visitId,
          context: {
            visitId: parsed.data.visitId,
            reason: parsed.data.reason,
            area: recorded.discontinuation.area,
            pendingTypes: recorded.discontinuation.pendingTypes,
            blockedWorkItems: recorded.blockedWorkItems,
            blockedOrders: recorded.blockedOrders,
            followUpCreated: recorded.followUpCreated
          }
        });
      } catch (error) {
        const workflowError = findVisitDiscontinuationError(error);
        if (workflowError) {
          redirect(
            `/sigeco/recepcion/visitas/${encodeURIComponent(
              visitId
            )}?error=cerrada`
          );
        }
        throw error;
      }
    }
  );

  revalidatePath("/sigeco");
  revalidatePath("/sigeco/recepcion");
  revalidatePath("/sigeco/recepcion/abandonos");
  revalidatePath(`/sigeco/recepcion/visitas/${visitId}`);
  revalidatePath("/sigeco/consultas");
  revalidatePath("/sigeco/enfermeria");
  revalidatePath("/sigeco/administracion");
  revalidatePath("/sigeco/seguimientos");

  const followUpNotice = result.followUpRequested
    ? !result.followUpConsentGranted
      ? "sin-consentimiento"
      : result.followUpCreated
        ? "creado"
        : result.followUpAvailable
          ? "existente"
          : "no-creado"
    : "no-solicitado";
  redirect(
    `/sigeco/recepcion/visitas/${encodeURIComponent(
      visitId
    )}?aviso=abandono-registrado&seguimiento=${followUpNotice}`
  );
}
