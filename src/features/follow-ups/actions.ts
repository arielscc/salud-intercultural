"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createFollowUpAttemptRecord,
  createFollowUpTaskRecord
} from "@/modules/database/queries/follow-ups";
import { requirePermission } from "@/modules/permissions";
import {
  createFollowUpAttemptSchema,
  createFollowUpTaskSchema
} from "@/features/follow-ups/schemas/follow-up.schema";

function parseFormData(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export async function createFollowUpTaskAction(formData: FormData) {
  const user = await requirePermission("followups_write");
  const parsed = createFollowUpTaskSchema.safeParse(parseFormData(formData));

  if (!parsed.success) {
    redirect("/sigeco/seguimientos?error=invalid-task");
  }

  const task = await createFollowUpTaskRecord({
    ...parsed.data,
    createdById: user.id,
    assignedToId: parsed.data.assignedToId ?? user.id
  });

  revalidatePath("/sigeco");
  revalidatePath("/sigeco/seguimientos");
  if (parsed.data.patientId) revalidatePath(`/sigeco/recepcion/pacientes/${parsed.data.patientId}`);
  redirect(`/sigeco/seguimientos/${task.id}?aviso=seguimiento-creado`);
}

export async function createFollowUpAttemptAction(formData: FormData) {
  const user = await requirePermission("followups_write");
  const parsed = createFollowUpAttemptSchema.safeParse(parseFormData(formData));

  if (!parsed.success) {
    redirect("/sigeco/seguimientos?error=invalid-attempt");
  }

  await createFollowUpAttemptRecord({
    ...parsed.data,
    userId: user.id
  });

  revalidatePath("/sigeco");
  revalidatePath("/sigeco/seguimientos");
  revalidatePath(`/sigeco/seguimientos/${parsed.data.taskId}`);
}
