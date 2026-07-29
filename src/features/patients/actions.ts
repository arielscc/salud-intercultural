"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createPatientRecord,
  findPossibleDuplicatePatients
} from "@/modules/database/queries/patients";
import { auditedResult, runAuditedAction } from "@/modules/audit/service";
import { createPatientSchema, sanitizePatientInput } from "@/features/patients/schemas/patient.schema";

function parseFormData(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

/*
 * LEGACY (simplificacion V3.7): el alta manual de pacientes fue reemplazada
 * por el funnel de recepcion (submitReceptionIntakeAction). Se conserva por
 * si un flujo interno necesita crear fichas sin abrir visita.
 */
export async function createPatientAction(formData: FormData) {
  const patient = await runAuditedAction(
    {
      permission: "patients_create",
      action: "patient.create",
      entityType: "patient"
    },
    async (user) => {
      const parsed = createPatientSchema.safeParse(parseFormData(formData));

      if (!parsed.success) {
        redirect("/sigeco/recepcion/nuevo?error=invalid");
      }

      const input = sanitizePatientInput(parsed.data);
      const duplicates = await findPossibleDuplicatePatients(input.phone);

      if (duplicates.length > 0 && formData.get("allowDuplicate") !== "true") {
        redirect(`/sigeco/recepcion/nuevo?duplicatePhone=${encodeURIComponent(input.phone)}`);
      }

      const created = await createPatientRecord({
        ...input,
        createdById: user.id
      });
      return auditedResult(created, { entityId: created.id });
    }
  );

  revalidatePath("/sigeco");
  revalidatePath("/sigeco/recepcion");
  redirect(`/sigeco/recepcion/pacientes/${patient.id}`);
}
