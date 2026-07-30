"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createReceptionIntake,
  searchReceptionPatients,
  updateReceptionPatient
} from "@/modules/database/queries/reception";
import { toDateOnlyString } from "@/lib/dates";
import { findPossibleDuplicatePatients } from "@/modules/database/queries/patients";
import {
  assertAuditedPermission,
  auditedResult,
  runAuditedAction
} from "@/modules/audit/service";
import { requirePermission } from "@/modules/permissions";
import {
  patientEditSchema,
  receptionIntakeSchema,
  toPatientEditRecord,
  toReceptionIntakeRecord
} from "@/features/reception/schemas/intake.schema";
import { resolveAttributionEvidence } from "@/features/attribution/evidence";

export async function searchReceptionPatientsAction(query: string) {
  await requirePermission("patients_read");
  const search = query.trim();

  if (search.length < 2) {
    return [];
  }

  const patients = await searchReceptionPatients(search);

  return patients.map((patient) => ({
    ...patient,
    birthDate: toDateOnlyString(patient.birthDate)
  }));
}

export async function submitReceptionIntakeAction(formData: FormData) {
  const result = await runAuditedAction(
    {
      permission: "visits_create",
      action: "reception.intake.create",
      entityType: "visit"
    },
    async (user) => {
      if (formData.get("funnelCompleted") !== "true") {
        redirect("/sigeco/recepcion/nuevo?error=incomplete-funnel");
      }

      const parsed = receptionIntakeSchema.safeParse(Object.fromEntries(formData.entries()));

      if (!parsed.success) {
        redirect("/sigeco/recepcion/nuevo?error=invalid");
      }

      const record = toReceptionIntakeRecord(parsed.data);
      const evidence = await resolveAttributionEvidence(
        record.attribution.evidenceCode
      );

      if (record.attribution.evidenceCode && !evidence) {
        redirect("/sigeco/recepcion/nuevo?error=invalid-attribution");
      }
      assertAuditedPermission(
        user,
        record.patientId ? "patients_update" : "patients_create"
      );

      if (!record.patientId) {
        const duplicates = await findPossibleDuplicatePatients(record.patient.phone);

        if (duplicates.length > 0 && formData.get("allowDuplicate") !== "true") {
          redirect("/sigeco/recepcion/nuevo?duplicate=true");
        }
      }

      const created = await createReceptionIntake({
        ...record,
        attribution: {
          primarySourceCode: record.attribution.primarySourceCode,
          supportSourceCodes: record.attribution.supportSourceCodes,
          campaignId: evidence?.campaignId,
          evidenceKind: evidence?.evidenceKind,
          externalEvidenceCode: evidence?.externalEvidenceCode
        },
        userId: user.id
      });
      return auditedResult(created, {
        entityId: created.visit.id,
        context: {
          patientId: created.patientId,
          patientRecord: record.patientId ? "existing" : "new",
          originCity: record.visit.originCity,
          originDepartment: record.visit.originDepartment,
          originCountry: record.visit.originCountry,
          originMatchesPatient: record.visit.originMatchesPatient,
          primaryCaptureSource: record.attribution.primarySourceCode,
          supportCaptureSources: record.attribution.supportSourceCodes,
          campaignCode: evidence?.campaignCode,
          evidenceKind: evidence?.evidenceKind
        }
      });
    }
  );

  revalidatePath("/sigeco");
  revalidatePath("/sigeco/recepcion");
  revalidatePath(`/sigeco/recepcion/pacientes/${result.patientId}`);
  redirect(`/sigeco/recepcion/visitas/${result.visit.id}?aviso=llegada-registrada`);
}

export async function updateReceptionPatientAction(formData: FormData) {
  const patientId = String(formData.get("patientId") ?? "");
  await runAuditedAction(
    {
      permission: "patients_update",
      action: "patient.update",
      entityType: "patient",
      entityId: patientId || undefined
    },
    async () => {
      const parsed = patientEditSchema.safeParse(Object.fromEntries(formData.entries()));

      if (!parsed.success) {
        redirect(
          `/sigeco/recepcion/pacientes/${encodeURIComponent(patientId)}/editar?error=invalid`
        );
      }

      const record = toPatientEditRecord(parsed.data);
      const patient = await updateReceptionPatient(record.patientId, record.data);
      return auditedResult(patient, { entityId: record.patientId });
    }
  );

  revalidatePath("/sigeco/recepcion");
  revalidatePath(`/sigeco/recepcion/pacientes/${patientId}`);
  redirect(`/sigeco/recepcion/pacientes/${patientId}?aviso=ficha-actualizada`);
}
