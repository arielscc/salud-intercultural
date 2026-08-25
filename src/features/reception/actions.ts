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
import { resolveAttributionEvidenceSafely } from "@/features/attribution/evidence";
import { getBranchContext } from "@/features/branches/context";

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

export async function validateAttributionEvidenceCodeAction(code: string) {
  await requirePermission("visits_create");
  const result = await resolveAttributionEvidenceSafely(code);

  return {
    valid: result.status !== "not_found",
    status: result.status
  };
}

export async function submitReceptionIntakeAction(formData: FormData) {
  const result = await runAuditedAction(
    {
      permission: "visits_create",
      action: "reception.intake.create",
      entityType: "visit"
    },
    async (user) => {
      const { activeBranch } = await getBranchContext(user);
      if (formData.get("funnelCompleted") !== "true") {
        redirect("/sigeco/recepcion/nuevo?error=incomplete-funnel");
      }

      const parsed = receptionIntakeSchema.safeParse(Object.fromEntries(formData.entries()));

      if (!parsed.success) {
        redirect("/sigeco/recepcion/nuevo?error=invalid");
      }

      const record = toReceptionIntakeRecord(parsed.data);
      const evidenceResolution = await resolveAttributionEvidenceSafely(
        record.attribution.evidenceCode
      );
      const evidence = evidenceResolution.evidence;
      const pendingEvidenceCode =
        evidenceResolution.status === "unavailable"
          ? record.attribution.evidenceCode
          : undefined;

      if (evidenceResolution.status === "not_found") {
        redirect("/sigeco/recepcion/nuevo?error=invalid-attribution");
      }
      assertAuditedPermission(
        user,
        record.patientId ? "patients_update" : "patients_create"
      );

      if (!record.patientId) {
        const duplicates = await findPossibleDuplicatePatients({
          fullName: record.patient.fullName,
          phone: record.patient.phone,
          birthDate: record.patient.birthDate
        });

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
          evidenceKind:
            evidence?.evidenceKind ??
            (pendingEvidenceCode
              ? /^WEB-/i.test(pendingEvidenceCode)
                ? "web_form"
                : "campaign_link"
              : undefined),
          externalEvidenceCode:
            evidence?.externalEvidenceCode ?? pendingEvidenceCode
        },
        userId: user.id,
        branchCode: activeBranch.code
      });
      return auditedResult(
        {
          ...created,
          attributionPending: evidenceResolution.status === "unavailable"
        },
        {
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
            campaignCode: evidence?.campaignCode ?? pendingEvidenceCode,
            evidenceKind:
              evidence?.evidenceKind ??
              (pendingEvidenceCode ? "integration_pending" : undefined),
            attributionPending: evidenceResolution.status === "unavailable"
          }
        }
      );
    }
  );

  revalidatePath("/sigeco");
  revalidatePath("/sigeco/recepcion");
  revalidatePath(`/sigeco/recepcion/pacientes/${result.patientId}`);
  redirect(
    `/sigeco/recepcion/visitas/${result.visit.id}?aviso=${
      result.attributionPending
        ? "llegada-registrada-atribucion-pendiente"
        : "llegada-registrada"
    }`
  );
}

export async function updateReceptionPatientAction(formData: FormData) {
  const patientId = String(formData.get("patientId") ?? "");
  await runAuditedAction(
    {
      permission: "patients_update",
      module: "recepcion",
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
      const duplicates = await findPossibleDuplicatePatients({
        fullName: record.data.fullName,
        phone: record.data.phone,
        birthDate: record.data.birthDate,
        excludePatientId: record.patientId
      });
      if (
        duplicates.length > 0 &&
        formData.get("allowDuplicate") !== "true"
      ) {
        redirect(
          `/sigeco/recepcion/pacientes/${encodeURIComponent(record.patientId)}/editar?duplicate=true`
        );
      }
      const patient = await updateReceptionPatient(record.patientId, record.data);
      return auditedResult(patient, { entityId: record.patientId });
    }
  );

  revalidatePath("/sigeco/recepcion");
  revalidatePath(`/sigeco/recepcion/pacientes/${patientId}`);
  redirect(`/sigeco/recepcion/pacientes/${patientId}?aviso=ficha-actualizada`);
}
