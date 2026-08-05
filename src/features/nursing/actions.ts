"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  assignNursingWorkItem,
  createNursingApplicationRecord,
  createNursingNoteRecord,
  createVitalSignsRecord,
  deleteNursingNoteRecord,
  updateVitalSignsRecord
} from "@/modules/database/queries/nursing";
import { auditedResult, runAuditedAction } from "@/modules/audit/service";
import {
  createPaidStudyOrder,
  deriveNursingPatientToDoctor,
  hasPaidStudyFlowError,
  returnCompletedStudiesToDoctor
} from "@/modules/database/queries/paid-studies";
import { findInsufficientStockError } from "@/modules/database/queries/inventory";
import { recordAreaTimeTransition } from "@/modules/database/queries/area-times";
import {
  createNursingApplicationSchema,
  createNursingNoteSchema,
  createVitalSignsSchema,
  deleteNursingNoteSchema,
  updateVitalSignsSchema
} from "@/features/nursing/schemas/nursing.schema";
import {
  paidStudyOrderSchema,
  parsePaidStudyForm
} from "@/features/clinical-care/schemas/paid-study.schema";

function parseFormData(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export async function assignNursingWorkItemAction(formData: FormData) {
  const workItemId = String(formData.get("workItemId") ?? "");
  const release = String(formData.get("intent") ?? "") === "release";
  await runAuditedAction(
    {
      permission: "nursing_write",
      action: release ? "nursing.work_item.release" : "nursing.work_item.claim",
      entityType: "work_item",
      entityId: workItemId || undefined
    },
    async (user) => {
      if (!workItemId) redirect("/sigeco/enfermeria?error=invalid-status");
      const updated = await assignNursingWorkItem({
        workItemId,
        userId: user.id,
        release
      });
      // Al tomar al paciente se inicia también el cronómetro de atención
      // (best-effort: si ya está iniciado o la medición no aplica, se ignora).
      if (!release && updated?.visitId) {
        try {
          await recordAreaTimeTransition({
            data: { visitId: updated.visitId, action: "start_attention" },
            userId: user.id,
            userRole: user.role
          });
        } catch {
          // El reloj puede no estar en "espera" o la medición no aplica.
        }
      }
      return auditedResult(updated, { entityId: workItemId, context: { release } });
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

export async function updateVitalSignsAction(formData: FormData) {
  const workItemId = String(formData.get("workItemId") ?? "");
  const patientId = String(formData.get("patientId") ?? "");
  await runAuditedAction(
    {
      permission: "nursing_write",
      action: "nursing.vital_signs.update",
      entityType: "vital_signs",
      context: { patientId: patientId || undefined, workItemId: workItemId || undefined }
    },
    async (user) => {
      const parsed = updateVitalSignsSchema.safeParse(parseFormData(formData));
      if (!parsed.success) {
        redirect(
          workItemId
            ? `/sigeco/enfermeria/${workItemId}?error=invalid-vitals`
            : "/sigeco/enfermeria?error=invalid-vitals"
        );
      }

      const updated = await updateVitalSignsRecord({
        id: parsed.data.id,
        temperatureCelsius: parsed.data.temperatureCelsius,
        systolicPressureMmHg: parsed.data.systolicPressureMmHg,
        diastolicPressureMmHg: parsed.data.diastolicPressureMmHg,
        heartRateBpm: parsed.data.heartRateBpm,
        respiratoryRateRpm: parsed.data.respiratoryRateRpm,
        oxygenSaturation: parsed.data.oxygenSaturation,
        weightKg: parsed.data.weightKg,
        heightCm: parsed.data.heightCm,
        notes: parsed.data.notes,
        recordedAt: parsed.data.recordedAt
      });
      return auditedResult(updated, {
        entityId: updated.id,
        context: { patientId: patientId || undefined, workItemId: workItemId || undefined }
      });
    }
  );

  revalidatePath("/sigeco/enfermeria");
  if (workItemId) revalidatePath(`/sigeco/enfermeria/${workItemId}`);
  if (patientId) revalidatePath(`/sigeco/recepcion/pacientes/${patientId}`);
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

      let application;
      try {
        application = await createNursingApplicationRecord({
          ...parsed.data,
          responsibleId: user.id,
          // Permite registrar varios inyectables sin cerrar la tarea.
          completeWorkItem: false
        });
      } catch (error) {
        const stockError = findInsufficientStockError(error);
        if (stockError) {
          redirect(
            workItemId
              ? `/sigeco/enfermeria/${workItemId}?error=stock-insuficiente`
              : "/sigeco/enfermeria?error=stock-insuficiente"
          );
        }
        throw error;
      }
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

export async function deleteNursingNoteAction(formData: FormData) {
  const workItemId = String(formData.get("workItemId") ?? "");
  const patientId = String(formData.get("patientId") ?? "");
  await runAuditedAction(
    {
      permission: "nursing_write",
      action: "nursing.note.delete",
      entityType: "nursing_note",
      context: { patientId: patientId || undefined, workItemId: workItemId || undefined }
    },
    async () => {
      const parsed = deleteNursingNoteSchema.safeParse(parseFormData(formData));
      if (!parsed.success) {
        redirect(
          workItemId
            ? `/sigeco/enfermeria/${workItemId}?error=invalid-note`
            : "/sigeco/enfermeria?error=invalid-note"
        );
      }

      await deleteNursingNoteRecord({ id: parsed.data.noteId });
      return auditedResult(undefined, {
        entityId: parsed.data.noteId,
        context: { patientId: patientId || undefined, workItemId: workItemId || undefined }
      });
    }
  );

  revalidatePath("/sigeco/enfermeria");
  if (workItemId) revalidatePath(`/sigeco/enfermeria/${workItemId}`);
  if (patientId) revalidatePath(`/sigeco/recepcion/pacientes/${patientId}`);
}

export async function deriveNursingToDoctorAction(formData: FormData) {
  const workItemId = String(formData.get("workItemId") ?? "");
  const visitId = String(formData.get("visitId") ?? "");
  await runAuditedAction(
    {
      permission: "nursing_write",
      action: "nursing.derive.doctor",
      entityType: "work_item",
      entityId: workItemId || undefined,
      context: { visitId: visitId || undefined }
    },
    async (user) => {
      if (!workItemId) redirect("/sigeco/enfermeria?error=invalid-derive");
      await deriveNursingPatientToDoctor({ workItemId, userId: user.id });
      return auditedResult(undefined, { entityId: workItemId, context: { visitId } });
    }
  );
  revalidatePath("/sigeco/enfermeria");
  revalidatePath("/sigeco/consultas");
  if (visitId) revalidatePath(`/sigeco/consultas/${visitId}`);
  redirect("/sigeco/enfermeria?aviso=paciente-derivado-medico");
}

export async function createNursingChargeOrderAction(formData: FormData) {
  const workItemId = String(formData.get("workItemId") ?? "");
  const visitId = String(formData.get("visitId") ?? "");
  await runAuditedAction(
    {
      permission: "nursing_write",
      action: "nursing.charge_order.create",
      entityType: "visit",
      entityId: visitId || undefined,
      context: { workItemId: workItemId || undefined }
    },
    async (user) => {
      const parsed = paidStudyOrderSchema.safeParse(parsePaidStudyForm(formData));
      if (!parsed.success) {
        redirect(
          workItemId
            ? `/sigeco/enfermeria/${workItemId}?error=invalid-charge`
            : "/sigeco/enfermeria?error=invalid-charge"
        );
      }

      try {
        await createPaidStudyOrder({
          ...parsed.data,
          requestedById: user.id,
          source: "nursing"
        });
      } catch (error) {
        if (hasPaidStudyFlowError(error, "invalid-study")) {
          redirect(
            workItemId
              ? `/sigeco/enfermeria/${workItemId}?error=invalid-charge`
              : "/sigeco/enfermeria?error=invalid-charge"
          );
        }
        throw error;
      }
      return auditedResult(undefined, {
        entityId: parsed.data.visitId,
        context: { workItemId: workItemId || undefined, source: "nursing" }
      });
    }
  );
  revalidatePath("/sigeco/enfermeria");
  revalidatePath("/sigeco/administracion");
  if (workItemId) revalidatePath(`/sigeco/enfermeria/${workItemId}`);
  redirect("/sigeco/enfermeria?aviso=orden-cobro-enviada");
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
