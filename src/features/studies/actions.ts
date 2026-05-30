"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createStudyRecord } from "@/modules/database/queries/studies";
import { requirePermission } from "@/modules/permissions";
import { createStudySchema } from "@/features/studies/schemas/study.schema";

function parseFormData(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export async function createStudyAction(formData: FormData) {
  const user = await requirePermission("studies_write");
  const parsed = createStudySchema.safeParse(parseFormData(formData));

  if (!parsed.success) {
    redirect("/sigeco/enfermeria?error=invalid-study");
  }

  await createStudyRecord({
    ...parsed.data,
    recordedById: user.id
  });

  revalidatePath("/sigeco/enfermeria");
  if (parsed.data.workItemId) revalidatePath(`/sigeco/enfermeria/${parsed.data.workItemId}`);
  if (parsed.data.visitId) revalidatePath(`/sigeco/consultas/${parsed.data.visitId}`);
  revalidatePath(`/sigeco/pacientes/${parsed.data.patientId}`);
}
