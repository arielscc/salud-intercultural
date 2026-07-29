"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createClinicalOrderRecord,
  upsertClinicalConsultationRecord
} from "@/modules/database/queries/clinical-care";
import {
  auditedResult,
  denyAuditedAction,
  runAuditedAction
} from "@/modules/audit/service";
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
  const visitId = String(formData.get("visitId") ?? "");
  await runAuditedAction(
    {
      permission: "clinical_write",
      action: "clinical.consultation.save",
      entityType: "visit",
      entityId: visitId || undefined
    },
    async (user) => {
      const parsed = upsertClinicalConsultationSchema.safeParse(parseFormData(formData));

      if (!parsed.success) {
        redirect("/sigeco/consultas?error=invalid");
      }

      const input = sanitizeClinicalConsultationInput(parsed.data);

      const consultation = await upsertClinicalConsultationRecord({
        ...input,
        doctorId: user.id
      });
      return auditedResult(consultation, {
        entityId: input.visitId,
        context: { consultationId: consultation.id }
      });
    }
  );

  revalidatePath("/sigeco/consultas");
  revalidatePath(`/sigeco/consultas/${visitId}`);
}

export async function createClinicalOrderAction(formData: FormData) {
  const visitId = String(formData.get("visitId") ?? "");
  await runAuditedAction(
    {
      permission: "clinical_write",
      action: "clinical.order.create",
      entityType: "clinical_order",
      context: { visitId: visitId || undefined }
    },
    async (user) => {
      const parsed = createClinicalOrderSchema.safeParse(parseFormData(formData));

      if (!parsed.success) {
        redirect("/sigeco/consultas?error=invalid-order");
      }

      const order = await createClinicalOrderRecord({
        ...parsed.data,
        doctorId: user.id
      });
      return auditedResult(order, {
        entityId: order.id,
        context: { visitId: parsed.data.visitId, orderType: parsed.data.type }
      });
    }
  );

  revalidatePath("/sigeco/consultas");
  revalidatePath(`/sigeco/consultas/${visitId}`);
  revalidatePath(`/sigeco/recepcion/visitas/${visitId}`);
}

export async function createPaidStudyOrderAction(formData: FormData) {
  const visitId = String(formData.get("visitId") ?? "");
  await runAuditedAction(
    {
      permission: "clinical_write",
      action: "clinical.paid_study_order.create",
      entityType: "visit",
      entityId: visitId || undefined
    },
    async (user) => {
      const parsed = paidStudyOrderSchema.safeParse(parseFormData(formData));
      if (!parsed.success) redirect("/sigeco/consultas?error=invalid-study-order");

      await createPaidStudyOrder({
        ...parsed.data,
        doctorId: user.id,
        requestedById: user.id,
        source: "consultation"
      });
      return auditedResult(undefined, {
        entityId: parsed.data.visitId,
        context: { source: "consultation" }
      });
    }
  );
  revalidatePath("/sigeco/consultas");
  revalidatePath("/sigeco/administracion");
  revalidatePath(`/sigeco/consultas/${visitId}`);
  redirect("/sigeco/consultas?aviso=orden-estudios-enviada");
}

export async function createReceptionPaidStudyOrderAction(formData: FormData) {
  const visitId = String(formData.get("visitId") ?? "");
  await runAuditedAction(
    {
      permission: "visits_update",
      action: "reception.paid_study_order.create",
      entityType: "visit",
      entityId: visitId || undefined
    },
    async (user) => {
      const parsed = paidStudyOrderSchema.safeParse(parseFormData(formData));

      if (!parsed.success) {
        redirect("/sigeco/recepcion?error=invalid-study-order");
      }
      if (!["recepcion", "super_admin"].includes(user.role)) {
        denyAuditedAction("role_policy_denied");
      }

      await createPaidStudyOrder({
        ...parsed.data,
        requestedById: user.id,
        source: "reception"
      });
      return auditedResult(undefined, {
        entityId: parsed.data.visitId,
        context: { source: "reception" }
      });
    }
  );
  revalidatePath("/sigeco/recepcion");
  revalidatePath("/sigeco/administracion");
  revalidatePath(`/sigeco/recepcion/visitas/${visitId}`);
  redirect(
    `/sigeco/recepcion/visitas/${visitId}?aviso=orden-estudios-enviada`
  );
}
