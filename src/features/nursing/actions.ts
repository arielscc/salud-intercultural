"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createNursingApplicationRecord,
  createNursingNoteRecord,
  createVitalSignsRecord,
  updateNursingWorkItemStatus
} from "@/modules/database/queries/nursing";
import { auditedResult, runAuditedAction } from "@/modules/audit/service";
import {
  hasPaidStudyFlowError,
  returnCompletedStudiesToDoctor
} from "@/modules/database/queries/paid-studies";
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
  const workItemId = String(formData.get("workItemId") ?? "");
  await runAuditedAction(
    {
      permission: "nursing_write",
      action: "nursing.work_item.update",
      entityType: "work_item",
      entityId: workItemId || undefined
    },
    async (user) => {
      const parsed = updateNursingWorkItemSchema.safeParse(parseFormData(formData));

      if (!parsed.success) {
        redirect("/sigeco/enfermeria?error=invalid-status");
      }

      const updated = await updateNursingWorkItemStatus({
        ...parsed.data,
        userId: user.id
      });
      return auditedResult(updated, {
        entityId: parsed.data.workItemId,
        context: { nextStatus: parsed.data.status }
      });
    }
  );

  revalidatePath("/sigeco/enfermeria");
  revalidatePath(`/sigeco/enfermeria/${workItemId}`);
}

export async function createVitalSignsAction(formData: FormData) {
  const workItemId = String(formData.get("workItemId") ?? "");
  const patientId = String(formData.get("patientId") ?? "");
  await runAuditedAction(
    {
      permission: "nursing_write",
      action: "nursing.vital_signs.create",
      entityType: "vital_signs",
      context: { patientId: patientId || undefined, workItemId: workItemId || undefined }
    },
    async (user) => {
      const parsed = createVitalSignsSchema.safeParse(parseFormData(formData));

      if (!parsed.success) {
        redirect("/sigeco/enfermeria?error=invalid-vitals");
      }

      const vitalSigns = await createVitalSignsRecord({
        ...parsed.data,
        recordedById: user.id
      });
      return auditedResult(vitalSigns, {
        entityId: vitalSigns.id,
        context: { patientId: parsed.data.patientId, workItemId: workItemId || undefined }
      });
    }
  );

  revalidatePath("/sigeco/enfermeria");
  if (workItemId) revalidatePath(`/sigeco/enfermeria/${workItemId}`);
  revalidatePath(`/sigeco/recepcion/pacientes/${patientId}`);
}

export async function createNursingApplicationAction(formData: FormData) {
  const patientId = String(formData.get("patientId") ?? "");
  const workItemId = String(formData.get("workItemId") ?? "");
  await runAuditedAction(
    {
      permission: "nursing_write",
      action: "nursing.application.create",
      entityType: "nursing_application",
      context: { patientId: patientId || undefined, workItemId: workItemId || undefined }
    },
    async (user) => {
      const parsed = createNursingApplicationSchema.safeParse(parseFormData(formData));

      if (!parsed.success) {
        redirect("/sigeco/enfermeria?error=invalid-application");
      }

      const application = await createNursingApplicationRecord({
        ...parsed.data,
        responsibleId: user.id
      });
      return auditedResult(application, {
        entityId: application.id,
        context: { patientId: parsed.data.patientId, workItemId: parsed.data.workItemId }
      });
    }
  );

  revalidatePath("/sigeco/enfermeria");
  if (workItemId) revalidatePath(`/sigeco/enfermeria/${workItemId}`);
  revalidatePath(`/sigeco/recepcion/pacientes/${patientId}`);
}

export async function createNursingNoteAction(formData: FormData) {
  const workItemId = String(formData.get("workItemId") ?? "");
  const patientId = String(formData.get("patientId") ?? "");
  await runAuditedAction(
    {
      permission: "nursing_write",
      action: "nursing.note.create",
      entityType: "nursing_note",
      context: { patientId: patientId || undefined, workItemId: workItemId || undefined }
    },
    async (user) => {
      const parsed = createNursingNoteSchema.safeParse(parseFormData(formData));

      if (!parsed.success) {
        redirect("/sigeco/enfermeria?error=invalid-note");
      }

      const nursingNote = await createNursingNoteRecord({
        ...parsed.data,
        userId: user.id
      });
      return auditedResult(nursingNote, {
        entityId: nursingNote.id,
        context: { patientId: parsed.data.patientId, workItemId: workItemId || undefined }
      });
    }
  );

  revalidatePath("/sigeco/enfermeria");
  if (workItemId) revalidatePath(`/sigeco/enfermeria/${workItemId}`);
  revalidatePath(`/sigeco/recepcion/pacientes/${patientId}`);
}

export async function returnStudiesToDoctorAction(formData: FormData) {
  const workItemId = String(formData.get("workItemId") ?? "");
  const visitId = String(formData.get("visitId") ?? "");
  await runAuditedAction(
    {
      permission: "nursing_write",
      action: "nursing.studies.return_to_doctor",
      entityType: "work_item",
      entityId: workItemId || undefined,
      context: { visitId: visitId || undefined }
    },
    async (user) => {
      if (!workItemId || !visitId) redirect("/sigeco/enfermeria?error=invalid-study-return");
      try {
        await returnCompletedStudiesToDoctor({ workItemId, userId: user.id });
      } catch (error) {
        if (hasPaidStudyFlowError(error, "STUDIES_INCOMPLETE")) {
          redirect(`/sigeco/enfermeria/${workItemId}?error=estudios-incompletos`);
        }
        throw error;
      }
      return auditedResult(undefined, { entityId: workItemId, context: { visitId } });
    }
  );
  revalidatePath("/sigeco/enfermeria");
  revalidatePath("/sigeco/consultas");
  revalidatePath(`/sigeco/consultas/${visitId}`);
  redirect("/sigeco/enfermeria?aviso=paciente-devuelto-medico");
}
