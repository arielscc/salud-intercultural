"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auditedResult, runAuditedAction } from "@/modules/audit/service";
import { createStudyRecord } from "@/modules/database/queries/studies";
import { createStudySchema } from "@/features/studies/schemas/study.schema";

function parseFormData(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export async function createStudyAction(formData: FormData) {
  const patientId = String(formData.get("patientId") ?? "");
  const { workItemId, visitId } = await runAuditedAction(
    {
      permission: "studies_write",
      action: "study.create",
      entityType: "study",
      context: { patientId: patientId || undefined }
    },
    async (user) => {
      const parsed = createStudySchema.safeParse(parseFormData(formData));

      if (!parsed.success) {
        redirect("/sigeco/enfermeria?error=invalid-study");
      }

      const study = await createStudyRecord({
        ...parsed.data,
        recordedById: user.id
      });
      return auditedResult(
        { workItemId: parsed.data.workItemId, visitId: parsed.data.visitId },
        { entityId: study.id, context: { patientId: parsed.data.patientId } }
      );
    }
  );

  revalidatePath("/sigeco/enfermeria");
  if (workItemId) revalidatePath(`/sigeco/enfermeria/${workItemId}`);
  if (visitId) revalidatePath(`/sigeco/consultas/${visitId}`);
  revalidatePath(`/sigeco/recepcion/pacientes/${patientId}`);
}
