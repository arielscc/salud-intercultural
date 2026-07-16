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
import { paidStudyOrderSchema } from "@/features/clinical-care/schemas/paid-study.schema";
import { createPaidStudyOrder } from "@/modules/database/queries/paid-studies";

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

export async function createPaidStudyOrderAction(formData: FormData) {
  const user = await requirePermission("clinical_write");
  const parsed = paidStudyOrderSchema.safeParse(parseFormData(formData));
  if (!parsed.success) redirect("/sigeco/consultas?error=invalid-study-order");

  await createPaidStudyOrder({
    ...parsed.data,
    doctorId: user.id,
    requestedById: user.id,
    source: "consultation"
  });
  revalidatePath("/sigeco/consultas");
  revalidatePath("/sigeco/administracion");
  revalidatePath(`/sigeco/consultas/${parsed.data.visitId}`);
  redirect("/sigeco/consultas?aviso=orden-estudios-enviada");
}

export async function createReceptionPaidStudyOrderAction(formData: FormData) {
  const user = await requirePermission("visits_update");
  const parsed = paidStudyOrderSchema.safeParse(parseFormData(formData));

  if (!parsed.success || !["recepcion", "super_admin"].includes(user.role)) {
    redirect("/sigeco/recepcion?error=invalid-study-order");
  }

  await createPaidStudyOrder({
    ...parsed.data,
    requestedById: user.id,
    source: "reception"
  });
  revalidatePath("/sigeco/recepcion");
  revalidatePath("/sigeco/administracion");
  revalidatePath(`/sigeco/recepcion/visitas/${parsed.data.visitId}`);
  redirect(
    `/sigeco/recepcion/visitas/${parsed.data.visitId}?aviso=orden-estudios-enviada`
  );
}
