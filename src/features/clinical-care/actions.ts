"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  assignConsultationVisit,
  createClinicalOrderRecord,
  deleteIndicationCatalogItem,
  recordClinicalNoteCatalogUsage,
  recordDiagnosisCatalogUsage,
  recordIndicationCatalogUsage,
  upsertClinicalConsultationRecord
} from "@/modules/database/queries/clinical-care";
import { recordAreaTimeTransition } from "@/modules/database/queries/area-times";
import {
  correctClinicalConsultation,
  finalizeClinicalConsultation,
  findClinicalRecordWorkflowError
} from "@/modules/database/queries/clinical-records";
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
import {
  paidStudyOrderSchema,
  parsePaidStudyForm
} from "@/features/clinical-care/schemas/paid-study.schema";
import {
  createPaidStudyOrder,
  hasPaidStudyFlowError
} from "@/modules/database/queries/paid-studies";
import {
  correctClinicalConsultationSchema,
  finalizeClinicalConsultationSchema
} from "@/features/clinical-records/schemas/clinical-record.schema";

function parseFormData(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export async function assignConsultationVisitAction(formData: FormData) {
  const visitId = String(formData.get("visitId") ?? "");
  const release = String(formData.get("intent") ?? "") === "release";
  await runAuditedAction(
    {
      permission: "clinical_write",
      action: release ? "clinical.consultation.release" : "clinical.consultation.claim",
      entityType: "visit",
      entityId: visitId || undefined
    },
    async (user) => {
      if (!visitId) redirect("/sigeco/consultas?error=invalid-claim");
      const updated = await assignConsultationVisit({
        visitId,
        userId: user.id,
        release
      });
      // Al tomar al paciente se inicia también el cronómetro de atención
      // (best-effort: si ya está iniciado o la medición no aplica, se ignora).
      if (!release) {
        try {
          await recordAreaTimeTransition({
            data: { visitId, action: "start_attention" },
            userId: user.id,
            userRole: user.role
          });
        } catch {
          // El reloj puede no estar en "espera" o la medición no aplica.
        }
      }
      return auditedResult(updated, { entityId: visitId, context: { release } });
    }
  );

  revalidatePath("/sigeco/consultas");
  revalidatePath(`/sigeco/consultas/${visitId}`);
}

export async function deleteIndicationCatalogItemAction(id: string) {
  await runAuditedAction(
    {
      permission: "clinical_write",
      action: "clinical.indication_catalog.delete",
      entityType: "indication_catalog_item",
      entityId: id || undefined
    },
    async () => {
      if (!id) denyAuditedAction("invalid_input");
      await deleteIndicationCatalogItem(id);
      return auditedResult(undefined, { entityId: id });
    }
  );
}

export async function saveClinicalConsultationAction(formData: FormData) {
  const visitId = String(formData.get("visitId") ?? "");
  try {
    await runAuditedAction(
      {
        permission: "clinical_write",
        action: "clinical.consultation.save",
        entityType: "visit",
        entityId: visitId || undefined
      },
      async (user) => {
        const parsed = upsertClinicalConsultationSchema.safeParse(
          parseFormData(formData)
        );

        if (!parsed.success) {
          redirect(
            `/sigeco/consultas/${encodeURIComponent(
              visitId
            )}?error=consulta-invalida`
          );
        }

        const input = sanitizeClinicalConsultationInput(parsed.data);

        // No se puede recetar el mismo medicamento (por nombre) dos veces.
        const medicationKeys = input.prescriptionItems.map((item) =>
          item.medication.trim().toLowerCase()
        );
        if (new Set(medicationKeys).size !== medicationKeys.length) {
          redirect(
            `/sigeco/consultas/${encodeURIComponent(visitId)}?error=receta-duplicada`
          );
        }

        const consultation = await upsertClinicalConsultationRecord({
          ...input,
          doctorId: user.id
        });
        // Los catálogos de indicaciones, diagnósticos, hallazgos y observaciones
        // crecen con el uso (best-effort).
        await recordIndicationCatalogUsage(input.indications);
        await recordDiagnosisCatalogUsage([
          input.primaryDiagnosis,
          input.secondaryDiagnosis
        ]);
        await recordClinicalNoteCatalogUsage("finding", input.findings);
        await recordClinicalNoteCatalogUsage("observation", input.observations);
        return auditedResult(consultation, {
          entityId: consultation.id,
          context: {
            visitId: input.visitId,
            revision: consultation.revision,
            status: consultation.status
          }
        });
      }
    );
  } catch (error) {
    const workflowError = findClinicalRecordWorkflowError(error);
    if (workflowError) {
      const code =
        workflowError.code === "CLINICAL_RECORD_STALE"
          ? "consulta-desactualizada"
          : "consulta-finalizada";
      redirect(
        `/sigeco/consultas/${encodeURIComponent(visitId)}?error=${code}`
      );
    }
    throw error;
  }

  revalidatePath("/sigeco/consultas");
  revalidatePath(`/sigeco/consultas/${visitId}`);
}

export async function finalizeClinicalConsultationAction(formData: FormData) {
  const visitId = String(formData.get("visitId") ?? "");
  try {
    await runAuditedAction(
      {
        permission: "clinical_finalize",
        action: "clinical.consultation.finalize",
        entityType: "clinical_consultation"
      },
      async (user) => {
        const parsed = finalizeClinicalConsultationSchema.safeParse(
          parseFormData(formData)
        );
        if (!parsed.success) {
          redirect(
            `/sigeco/consultas/${encodeURIComponent(
              visitId
            )}?error=consulta-invalida`
          );
        }
        const consultation = await finalizeClinicalConsultation({
          ...parsed.data,
          finalizedById: user.id
        });
        return auditedResult(consultation, {
          entityId: consultation.id,
          context: {
            visitId: parsed.data.visitId,
            revision: consultation.revision,
            status: consultation.status
          }
        });
      }
    );
  } catch (error) {
    const workflowError = findClinicalRecordWorkflowError(error);
    if (workflowError) {
      const code =
        workflowError.code === "CLINICAL_RECORD_STALE"
          ? "consulta-desactualizada"
          : "consulta-ya-finalizada";
      redirect(
        `/sigeco/consultas/${encodeURIComponent(visitId)}?error=${code}`
      );
    }
    throw error;
  }

  revalidatePath("/sigeco/consultas");
  revalidatePath(`/sigeco/consultas/${visitId}`);
  revalidatePath(`/sigeco/consultas/${visitId}/historial`);
  redirect(
    `/sigeco/consultas/${encodeURIComponent(
      visitId
    )}?aviso=consulta-finalizada`
  );
}

export async function correctClinicalConsultationAction(formData: FormData) {
  const visitId = String(formData.get("visitId") ?? "");
  try {
    await runAuditedAction(
      {
        permission: "clinical_correct",
        action: "clinical.consultation.correct",
        entityType: "clinical_consultation"
      },
      async (user) => {
        const parsed = correctClinicalConsultationSchema.safeParse(
          parseFormData(formData)
        );
        if (!parsed.success) {
          redirect(
            `/sigeco/consultas/${encodeURIComponent(
              visitId
            )}?error=correccion-invalida#corregir-consulta`
          );
        }
        const corrected = await correctClinicalConsultation({
          ...parsed.data,
          correctedById: user.id
        });
        return auditedResult(corrected, {
          entityId: parsed.data.consultationId,
          context: {
            visitId: parsed.data.visitId,
            version: corrected.version.version,
            correctionType: parsed.data.correctionType,
            changedFields: corrected.changedFields,
            relatedSales: corrected.relatedRecords.sales,
            relatedApplications: corrected.relatedRecords.applications,
            relatedOrders: corrected.relatedRecords.orders
          }
        });
      }
    );
  } catch (error) {
    const workflowError = findClinicalRecordWorkflowError(error);
    if (workflowError) {
      const code =
        workflowError.code === "CLINICAL_RECORD_STALE"
          ? "consulta-desactualizada"
          : workflowError.code === "CLINICAL_RECORD_NO_CHANGES"
            ? "correccion-sin-cambios"
            : "correccion-no-disponible";
      redirect(
        `/sigeco/consultas/${encodeURIComponent(
          visitId
        )}?error=${code}#corregir-consulta`
      );
    }
    throw error;
  }

  revalidatePath("/sigeco/consultas");
  revalidatePath(`/sigeco/consultas/${visitId}`);
  revalidatePath(`/sigeco/consultas/${visitId}/historial`);
  redirect(
    `/sigeco/consultas/${encodeURIComponent(
      visitId
    )}?aviso=consulta-corregida`
  );
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
      const parsed = paidStudyOrderSchema.safeParse(parsePaidStudyForm(formData));
      if (!parsed.success) redirect("/sigeco/consultas?error=invalid-study-order");

      try {
        await createPaidStudyOrder({
          ...parsed.data,
          doctorId: user.id,
          requestedById: user.id,
          source: "consultation"
        });
      } catch (error) {
        if (hasPaidStudyFlowError(error, "invalid-study")) {
          redirect("/sigeco/consultas?error=invalid-study-order");
        }
        throw error;
      }
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
      const parsed = paidStudyOrderSchema.safeParse(parsePaidStudyForm(formData));

      if (!parsed.success) {
        redirect("/sigeco/recepcion?error=invalid-study-order");
      }
      if (!["recepcion", "super_admin"].includes(user.role)) {
        denyAuditedAction("role_policy_denied");
      }

      try {
        await createPaidStudyOrder({
          ...parsed.data,
          requestedById: user.id,
          source: "reception"
        });
      } catch (error) {
        if (hasPaidStudyFlowError(error, "invalid-study")) {
          redirect(`/sigeco/recepcion/visitas/${visitId}?error=invalid-study-order`);
        }
        throw error;
      }
      return auditedResult(undefined, {
        entityId: parsed.data.visitId,
        context: { source: "reception" }
      });
    }
  );
  revalidatePath("/sigeco/recepcion");
  revalidatePath("/sigeco/administracion");
  revalidatePath(`/sigeco/recepcion/visitas/${visitId}`);
  redirect("/sigeco/recepcion?aviso=orden-estudios-enviada");
}
