"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { PatientRouteArea, VisitStatus } from "@/generated/prisma/client";
import {
  createVisitRecord,
  findClosedVisitTransitionError,
  getVisitFlowState,
  updateVisitRouteStatus
} from "@/modules/database/queries/visits";
import { requirePermission } from "@/modules/permissions";
import { routeAreaLabels } from "@/features/patients/labels";
import {
  createVisitSchema,
  isActiveVisitStatus,
  updateVisitStatusSchema,
  visitFlowSchema
} from "@/features/visits/schemas/visit.schema";

function parseFormData(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export async function createVisitAction(formData: FormData) {
  const user = await requirePermission("visits_create");
  const parsed = createVisitSchema.safeParse(parseFormData(formData));

  if (!parsed.success) {
    redirect("/sigeco/recepcion?error=invalid");
  }

  const visit = await createVisitRecord({
    ...parsed.data,
    userId: user.id
  });

  revalidatePath("/sigeco");
  revalidatePath("/sigeco/recepcion");
  revalidatePath(`/sigeco/recepcion/pacientes/${parsed.data.patientId}`);
  redirect(`/sigeco/recepcion/visitas/${visit.id}`);
}

/*
 * Flujo flexible V3.7: el paciente puede retirarse en cualquier punto, y tras
 * la consulta puede pasar a enfermeria, a administracion o salir directo.
 * En "left" el area se conserva para dejar rastro de donde abandono.
 */
export async function applyVisitFlowAction(formData: FormData) {
  const user = await requirePermission("visits_update");
  const parsed = visitFlowSchema.safeParse(parseFormData(formData));

  if (!parsed.success) {
    redirect("/sigeco/recepcion?error=invalid-flow");
  }

  const { visitId, flow, note } = parsed.data;
  const visit = await getVisitFlowState(visitId);

  if (!visit) {
    redirect("/sigeco/recepcion?error=invalid-flow");
  }

  if (!isActiveVisitStatus(visit.status)) {
    redirect(`/sigeco/recepcion/visitas/${visitId}?error=cerrada`);
  }

  const currentArea = visit.route?.currentArea ?? "recepcion";
  const transitions: Record<
    typeof flow,
    { status: VisitStatus; area: PatientRouteArea; note: string }
  > = {
    left: {
      status: "left_without_care",
      area: currentArea,
      note: note ?? `Se retiró en ${routeAreaLabels[currentArea].toLowerCase()}`
    },
    complete: { status: "completed", area: "cierre", note: note ?? "Visita cerrada" },
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
      visitId,
      userId: user.id,
      ...transitions[flow]
    });
  } catch (error) {
    if (findClosedVisitTransitionError(error)) {
      redirect(`/sigeco/recepcion/visitas/${visitId}?error=cerrada`);
    }
    throw error;
  }

  revalidatePath("/sigeco");
  revalidatePath("/sigeco/recepcion");
  revalidatePath(`/sigeco/recepcion/visitas/${visitId}`);
  revalidatePath("/sigeco/consultas");
  revalidatePath(`/sigeco/consultas/${visitId}`);
  revalidatePath("/sigeco/administracion");
}

export async function updateVisitStatusAction(formData: FormData) {
  const user = await requirePermission("visits_update");
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

  revalidatePath("/sigeco");
  revalidatePath("/sigeco/recepcion");
  revalidatePath(`/sigeco/recepcion/visitas/${parsed.data.visitId}`);
}
