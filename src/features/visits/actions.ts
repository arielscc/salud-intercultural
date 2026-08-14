"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { PatientRouteArea, VisitStatus } from "@/generated/prisma/client";
import {
  createVisitRecord,
  findClosedVisitTransitionError,
  findDraftClinicalConsultationError,
  getVisitFlowState,
  updateVisitRouteStatus
} from "@/modules/database/queries/visits";
import { auditedResult, runAuditedAction } from "@/modules/audit/service";
import {
  createVisitSchema,
  isActiveVisitStatus,
  updateVisitStatusSchema,
  visitFlowSchema
} from "@/features/visits/schemas/visit.schema";
import { getBranchContext } from "@/features/branches/context";

function parseFormData(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

function isActiveBillingWorkItem(item: {
  title: string;
  sales: { id: string }[];
}) {
  return item.sales.length > 0 || item.title.toLowerCase().includes("cobro");
}

export async function createVisitAction(formData: FormData) {
  const patientId = String(formData.get("patientId") ?? "");
  const visit = await runAuditedAction(
    {
      permission: "visits_create",
      action: "visit.create",
      entityType: "visit",
      context: { patientId: patientId || undefined }
    },
    async (user) => {
      const { activeBranch } = await getBranchContext(user);
      const parsed = createVisitSchema.safeParse(parseFormData(formData));

      if (!parsed.success) {
        redirect("/sigeco/recepcion?error=invalid");
      }

      const created = await createVisitRecord({
        ...parsed.data,
        userId: user.id,
        branchCode: activeBranch.code
      });
      return auditedResult(created, {
        entityId: created.id,
        context: { patientId: parsed.data.patientId }
      });
    }
  );

  revalidatePath("/sigeco");
  revalidatePath("/sigeco/recepcion");
  revalidatePath(`/sigeco/recepcion/pacientes/${patientId}`);
  redirect(`/sigeco/recepcion/visitas/${visit.id}?aviso=llegada-registrada`);
}

/*
 * Flujo flexible V3.7: el paciente puede retirarse en cualquier punto, y tras
 * la consulta puede pasar a enfermeria, a administracion o salir directo.
 * El abandono detallado se registra por la acción específica de la Tarea 16.
 */
export async function applyVisitFlowAction(formData: FormData) {
  const visitId = String(formData.get("visitId") ?? "");
  let successRedirect: string | null = null;
  await runAuditedAction(
    {
      permission: "visits_update",
      action: "visit.flow.update",
      entityType: "visit",
      entityId: visitId || undefined
    },
    async (user) => {
      const parsed = visitFlowSchema.safeParse(parseFormData(formData));

      if (!parsed.success) {
        redirect("/sigeco/recepcion?error=invalid-flow");
      }

      const { visitId: parsedVisitId, flow, note } = parsed.data;
      const visit = await getVisitFlowState(parsedVisitId);

      if (!visit) {
        redirect("/sigeco/recepcion?error=invalid-flow");
      }

      if (!isActiveVisitStatus(visit.status)) {
        redirect(`/sigeco/recepcion/visitas/${parsedVisitId}?error=cerrada`);
      }

      if (flow === "to_reception" && visit.workItems.some(isActiveBillingWorkItem)) {
        redirect(`/sigeco/recepcion/visitas/${parsedVisitId}?error=cobro-activo`);
      }

      const currentArea = visit.route?.currentArea ?? "recepcion";
      const transitions: Record<
        typeof flow,
        { status: VisitStatus; area: PatientRouteArea; note: string }
      > = {
        complete: { status: "completed", area: "cierre", note: note ?? "Visita cerrada" },
        to_reception: {
          status: "in_reception",
          area: "recepcion",
          note: note ?? "Devuelto a recepción para corregir derivación"
        },
        to_consultation: {
          status: "in_consultation",
          area: "medico",
          note: note ?? "Derivado a consulta médica"
        },
        to_nursing: {
          status: "in_nursing",
          area: "enfermeria",
          note: note ?? "Derivado a enfermería"
        },
        to_administration: {
          status: "in_administration",
          area: "administracion",
          note: note ?? "Derivado a administración"
        }
      };

      try {
        await updateVisitRouteStatus({
          visitId: parsedVisitId,
          userId: user.id,
          ...transitions[flow]
        });
      } catch (error) {
        if (findClosedVisitTransitionError(error)) {
          redirect(`/sigeco/recepcion/visitas/${parsedVisitId}?error=cerrada`);
        }
        if (findDraftClinicalConsultationError(error)) {
          const path =
            currentArea === "medico"
              ? `/sigeco/consultas/${parsedVisitId}`
              : `/sigeco/recepcion/visitas/${parsedVisitId}`;
          redirect(`${path}?error=consulta-sin-finalizar`);
        }
        throw error;
      }

      return auditedResult(undefined, {
        entityId: parsedVisitId,
        context: {
          previousStatus: visit.status,
          nextStatus: transitions[flow].status,
          previousArea: currentArea,
          nextArea: transitions[flow].area
        }
      });
    }
  );

  revalidatePath("/sigeco");
  revalidatePath("/sigeco/recepcion");
  revalidatePath(`/sigeco/recepcion/visitas/${visitId}`);
  revalidatePath("/sigeco/consultas");
  revalidatePath(`/sigeco/consultas/${visitId}`);
  revalidatePath("/sigeco/administracion");
  revalidatePath("/sigeco/enfermeria");

  const redirectTo = String(formData.get("redirectTo") ?? "");
  if (redirectTo.startsWith("/sigeco/")) {
    successRedirect = redirectTo;
  }
  if (successRedirect) redirect(successRedirect);
}

export async function updateVisitStatusAction(formData: FormData) {
  const visitId = String(formData.get("visitId") ?? "");
  await runAuditedAction(
    {
      permission: "visits_update",
      action: "visit.status.update",
      entityType: "visit",
      entityId: visitId || undefined
    },
    async (user) => {
      const parsed = updateVisitStatusSchema.safeParse(parseFormData(formData));

      if (!parsed.success) {
        redirect("/sigeco/recepcion?error=invalid-status");
      }

      try {
        await updateVisitRouteStatus({
          ...parsed.data,
          userId: user.id
        });
      } catch (error) {
        if (findClosedVisitTransitionError(error)) {
          redirect(`/sigeco/recepcion/visitas/${parsed.data.visitId}?error=cerrada`);
        }
        throw error;
      }
      return auditedResult(undefined, {
        entityId: parsed.data.visitId,
        context: { nextStatus: parsed.data.status }
      });
    }
  );

  revalidatePath("/sigeco");
  revalidatePath("/sigeco/recepcion");
  revalidatePath(`/sigeco/recepcion/visitas/${visitId}`);
}
