"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createVisitRecord, updateVisitRouteStatus } from "@/modules/database/queries/visits";
import { requirePermission } from "@/modules/permissions";
import {
  createVisitSchema,
  updateVisitStatusSchema
} from "@/features/visits/schemas/visit.schema";

function parseFormData(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export async function createVisitAction(formData: FormData) {
  const user = await requirePermission("visits_create");
  const parsed = createVisitSchema.safeParse(parseFormData(formData));

  if (!parsed.success) {
    redirect("/sigeco/visitas?error=invalid");
  }

  const visit = await createVisitRecord({
    ...parsed.data,
    userId: user.id
  });

  revalidatePath("/sigeco");
  revalidatePath("/sigeco/visitas");
  revalidatePath(`/sigeco/pacientes/${parsed.data.patientId}`);
  redirect(`/sigeco/visitas/${visit.id}`);
}

export async function updateVisitStatusAction(formData: FormData) {
  const user = await requirePermission("visits_update");
  const parsed = updateVisitStatusSchema.safeParse(parseFormData(formData));

  if (!parsed.success) {
    redirect("/sigeco/visitas?error=invalid-status");
  }

  await updateVisitRouteStatus({
    ...parsed.data,
    userId: user.id
  });

  revalidatePath("/sigeco");
  revalidatePath("/sigeco/visitas");
  revalidatePath(`/sigeco/visitas/${parsed.data.visitId}`);
}
