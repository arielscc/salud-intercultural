"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auditedResult, runAuditedAction } from "@/modules/audit/service";
import { appendPatientConsentRecord } from "@/modules/database/queries/patient-consents";
import { recordPatientConsentSchema } from "@/features/patient-consents/schemas/patient-consent.schema";

export async function recordPatientConsentAction(formData: FormData) {
  const patientId = String(formData.get("patientId") ?? "");
  const rawChannels = formData
    .getAll("contactChannels")
    .map((channel) => String(channel));

  await runAuditedAction(
    {
      permission: "patient_consents_write",
      action: "patient.consent.record",
      entityType: "patient",
      entityId: patientId || undefined
    },
    async (actor) => {
      const parsed = recordPatientConsentSchema.safeParse({
        patientId,
        purpose: formData.get("purpose"),
        decision: formData.get("decision"),
        captureMethod: formData.get("captureMethod"),
        textVersion: formData.get("textVersion"),
        contactChannels: rawChannels
      });

      if (!parsed.success) {
        redirect(
          `/sigeco/recepcion/pacientes/${patientId}?error=consentimiento-invalido`
        );
      }

      const consent = await appendPatientConsentRecord({
        ...parsed.data,
        recordedById: actor.id
      });

      return auditedResult(consent, {
        entityId: patientId,
        context: {
          consentId: consent.id,
          purpose: consent.purpose,
          decision: consent.decision,
          textVersion: consent.textVersion,
          contactChannels: consent.contactChannels
        }
      });
    }
  );

  revalidatePath(`/sigeco/recepcion/pacientes/${patientId}`);
  revalidatePath("/sigeco/seguimientos");
  redirect(
    `/sigeco/recepcion/pacientes/${patientId}?aviso=consentimiento-registrado`
  );
}
