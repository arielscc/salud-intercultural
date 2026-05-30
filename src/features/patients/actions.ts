"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createPatientRecord,
  findPossibleDuplicatePatients
} from "@/modules/database/queries/patients";
import { requirePermission } from "@/modules/permissions";
import { createPatientSchema, sanitizePatientInput } from "@/features/patients/schemas/patient.schema";

function parseFormData(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export async function createPatientAction(formData: FormData) {
  const user = await requirePermission("patients_create");
  const parsed = createPatientSchema.safeParse(parseFormData(formData));

  if (!parsed.success) {
    redirect("/sigeco/pacientes/nuevo?error=invalid");
  }

  const input = sanitizePatientInput(parsed.data);
  const duplicates = await findPossibleDuplicatePatients(input.phone);

  if (duplicates.length > 0 && formData.get("allowDuplicate") !== "true") {
    redirect(`/sigeco/pacientes/nuevo?duplicatePhone=${encodeURIComponent(input.phone)}`);
  }

  const patient = await createPatientRecord({
    ...input,
    createdById: user.id
  });

  revalidatePath("/sigeco");
  revalidatePath("/sigeco/pacientes");
  redirect(`/sigeco/pacientes/${patient.id}`);
}
