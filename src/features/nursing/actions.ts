"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createNursingApplicationRecord,
  createNursingNoteRecord,
  createVitalSignsRecord,
  updateNursingWorkItemStatus
} from "@/modules/database/queries/nursing";
import { requirePermission } from "@/modules/permissions";
import {
  createNursingApplicationSchema,
  createNursingNoteSchema,
  createVitalSignsSchema,
  updateNursingWorkItemSchema
} from "@/features/nursing/schemas/nursing.schema";

function parseFormData(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export async function updateNursingWorkItemAction(formData: FormData) {
  const user = await requirePermission("nursing_write");
  const parsed = updateNursingWorkItemSchema.safeParse(parseFormData(formData));

  if (!parsed.success) {
    redirect("/sigeco/enfermeria?error=invalid-status");
  }

  await updateNursingWorkItemStatus({
    ...parsed.data,
    userId: user.id
  });

  revalidatePath("/sigeco/enfermeria");
  revalidatePath(`/sigeco/enfermeria/${parsed.data.workItemId}`);
}

export async function createVitalSignsAction(formData: FormData) {
  const user = await requirePermission("nursing_write");
  const workItemId = String(formData.get("workItemId") ?? "");
  const parsed = createVitalSignsSchema.safeParse(parseFormData(formData));

  if (!parsed.success) {
    redirect("/sigeco/enfermeria?error=invalid-vitals");
  }

  await createVitalSignsRecord({
    ...parsed.data,
    recordedById: user.id
  });

  revalidatePath("/sigeco/enfermeria");
  if (workItemId) revalidatePath(`/sigeco/enfermeria/${workItemId}`);
  revalidatePath(`/sigeco/pacientes/${parsed.data.patientId}`);
}

export async function createNursingApplicationAction(formData: FormData) {
  const user = await requirePermission("nursing_write");
  const parsed = createNursingApplicationSchema.safeParse(parseFormData(formData));

  if (!parsed.success) {
    redirect("/sigeco/enfermeria?error=invalid-application");
  }

  await createNursingApplicationRecord({
    ...parsed.data,
    responsibleId: user.id
  });

  revalidatePath("/sigeco/enfermeria");
  if (parsed.data.workItemId) revalidatePath(`/sigeco/enfermeria/${parsed.data.workItemId}`);
  revalidatePath(`/sigeco/pacientes/${parsed.data.patientId}`);
}

export async function createNursingNoteAction(formData: FormData) {
  const user = await requirePermission("nursing_write");
  const workItemId = String(formData.get("workItemId") ?? "");
  const parsed = createNursingNoteSchema.safeParse(parseFormData(formData));

  if (!parsed.success) {
    redirect("/sigeco/enfermeria?error=invalid-note");
  }

  await createNursingNoteRecord({
    ...parsed.data,
    userId: user.id
  });

  revalidatePath("/sigeco/enfermeria");
  if (workItemId) revalidatePath(`/sigeco/enfermeria/${workItemId}`);
  revalidatePath(`/sigeco/pacientes/${parsed.data.patientId}`);
}
