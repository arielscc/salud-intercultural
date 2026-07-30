"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recordTreatmentProposalOutcomeSchema } from "@/features/treatment-proposals/schemas/treatment-proposal.schema";
import { auditedResult, runAuditedAction } from "@/modules/audit/service";
import {
  findTreatmentProposalOutcomeError,
  recordTreatmentProposalOutcome
} from "@/modules/database/queries/treatment-proposals";
import { findClosedVisitTransitionError } from "@/modules/database/queries/visits";

function formValues(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export async function recordTreatmentProposalOutcomeAction(
  formData: FormData
) {
  const visitId = String(formData.get("visitId") ?? "");
  await runAuditedAction(
    {
      permission: "clinical_write",
      action: "treatment_proposal.outcome.record",
      entityType: "treatment_proposal_outcome",
      context: { visitId: visitId || undefined }
    },
    async (user) => {
      const parsed = recordTreatmentProposalOutcomeSchema.safeParse(
        formValues(formData)
      );
      if (!parsed.success) {
        redirect(
          `/sigeco/consultas/${encodeURIComponent(visitId)}?error=resultado-invalido`
        );
      }

      try {
        const result = await recordTreatmentProposalOutcome({
          ...parsed.data,
          doctorId: user.id
        });
        return auditedResult(result, {
          entityId: result.outcome.id,
          context: {
            visitId: parsed.data.visitId,
            outcomeStatus: result.outcome.status,
            outcomeReason: result.outcome.reason,
            administrationOrderCreated:
              result.administrationOrderCreated,
            followUpCreated: result.followUpCreated
          }
        });
      } catch (error) {
        const outcomeError = findTreatmentProposalOutcomeError(error);
        if (
          outcomeError?.code === "ACCEPTED_OUTCOME_ALREADY_RECORDED"
        ) {
          redirect(
            `/sigeco/consultas/${encodeURIComponent(visitId)}?error=resultado-cerrado`
          );
        }
        if (
          outcomeError ||
          findClosedVisitTransitionError(error)
        ) {
          redirect(
            `/sigeco/consultas/${encodeURIComponent(visitId)}?error=visita-no-disponible`
          );
        }
        throw error;
      }
    }
  );

  revalidatePath("/sigeco");
  revalidatePath("/sigeco/consultas");
  revalidatePath(`/sigeco/consultas/${visitId}`);
  revalidatePath("/sigeco/administracion");
  revalidatePath("/sigeco/seguimientos");
  revalidatePath("/sigeco/atribucion");
}
