"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  dismissPatientDuplicateSchema,
  mergePatientDuplicateSchema
} from "@/features/patient-duplicates/schemas/patient-duplicate.schema";
import { auditedResult, runAuditedAction } from "@/modules/audit/service";
import {
  dismissPatientDuplicateCandidate,
  getPatientDuplicateCandidate,
  mergeDuplicatePatients
} from "@/modules/database/queries/patient-duplicates";

function formValues(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export async function dismissPatientDuplicateAction(formData: FormData) {
  const candidateId = String(formData.get("candidateId") ?? "");
  await runAuditedAction(
    {
      permission: "patient_duplicates_review",
      action: "patient.duplicate.dismiss",
      entityType: "patient_duplicate_candidate",
      entityId: candidateId || undefined
    },
    async (user) => {
      const parsed = dismissPatientDuplicateSchema.safeParse(
        formValues(formData)
      );
      if (!parsed.success) {
        redirect("/sigeco/recepcion/duplicados?error=candidato-invalido");
      }
      const candidate = await dismissPatientDuplicateCandidate({
        candidateId: parsed.data.candidateId,
        reviewedById: user.id
      });
      return auditedResult(candidate, {
        entityId: candidate.id,
        context: {
          patientAId: candidate.patientAId,
          patientBId: candidate.patientBId,
          decision: "not_duplicate"
        }
      });
    }
  );

  revalidatePath("/sigeco/recepcion/duplicados");
  redirect("/sigeco/recepcion/duplicados?aviso=descartado");
}

export async function mergePatientDuplicateAction(formData: FormData) {
  const candidateId = String(formData.get("candidateId") ?? "");
  const result = await runAuditedAction(
    {
      permission: "patient_duplicates_merge",
      action: "patient.duplicate.merge",
      entityType: "patient_duplicate_candidate",
      entityId: candidateId || undefined
    },
    async (user) => {
      const parsed = mergePatientDuplicateSchema.safeParse(formValues(formData));
      if (!parsed.success) {
        redirect(
          `/sigeco/recepcion/duplicados/${encodeURIComponent(candidateId)}?error=confirmacion-invalida`
        );
      }
      const candidate = await getPatientDuplicateCandidate(
        parsed.data.candidateId
      );
      const target =
        candidate?.patientA.id === parsed.data.targetPatientId
          ? candidate.patientA
          : candidate?.patientB.id === parsed.data.targetPatientId
            ? candidate.patientB
            : null;
      if (!target || parsed.data.confirmation !== target.internalCode) {
        redirect(
          `/sigeco/recepcion/duplicados/${encodeURIComponent(candidateId)}?error=confirmacion-invalida`
        );
      }
      const merged = await mergeDuplicatePatients({
        ...parsed.data,
        mergedById: user.id
      });
      return auditedResult(merged, {
        entityId: merged.merge.id,
        context: {
          sourcePatientId: merged.sourcePatientId,
          targetPatientId: merged.targetPatientId,
          targetInternalCode: merged.targetInternalCode,
          movedRelations: merged.movedRelations
        }
      });
    }
  );

  revalidatePath("/sigeco/recepcion");
  revalidatePath("/sigeco/recepcion/duplicados");
  revalidatePath(`/sigeco/recepcion/pacientes/${result.sourcePatientId}`);
  revalidatePath(`/sigeco/recepcion/pacientes/${result.targetPatientId}`);
  redirect(
    `/sigeco/recepcion/pacientes/${result.targetPatientId}?aviso=fichas-fusionadas`
  );
}
