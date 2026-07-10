"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createClinicalOrderRecord,
  upsertClinicalConsultationRecord
} from "@/modules/database/queries/clinical-care";
import { requirePermission } from "@/modules/permissions";
import {
  createClinicalOrderSchema,
  sanitizeClinicalConsultationInput,
  upsertClinicalConsultationSchema
} from "@/features/clinical-care/schemas/clinical-care.schema";

function parseFormData(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export async function saveClinicalConsultationAction(formData: FormData) {
  const user = await requirePermission("clinical_write");
  const parsed = upsertClinicalConsultationSchema.safeParse(parseFormData(formData));

  if (!parsed.success) {
    redirect("/sigeco/consultas?error=invalid");
  }

  const input = sanitizeClinicalConsultationInput(parsed.data);

  await upsertClinicalConsultationRecord({
    ...input,
    doctorId: user.id
  });

  revalidatePath("/sigeco/consultas");
  revalidatePath(`/sigeco/consultas/${input.visitId}`);
}

export async function createClinicalOrderAction(formData: FormData) {
  const user = await requirePermission("clinical_write");
  const parsed = createClinicalOrderSchema.safeParse(parseFormData(formData));

  if (!parsed.success) {
    redirect("/sigeco/consultas?error=invalid-order");
  }

  await createClinicalOrderRecord({
    ...parsed.data,
    doctorId: user.id
  });

  revalidatePath("/sigeco/consultas");
  revalidatePath(`/sigeco/consultas/${parsed.data.visitId}`);
  revalidatePath(`/sigeco/recepcion/visitas/${parsed.data.visitId}`);
}
