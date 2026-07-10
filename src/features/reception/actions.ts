"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createReceptionIntake,
  searchReceptionPatients
} from "@/modules/database/queries/reception";
import { findPossibleDuplicatePatients } from "@/modules/database/queries/patients";
import { requirePermission } from "@/modules/permissions";
import {
  receptionIntakeSchema,
  toReceptionIntakeRecord
} from "@/features/reception/schemas/intake.schema";

export async function searchReceptionPatientsAction(query: string) {
  await requirePermission("patients_read");
  const search = query.trim();

  if (search.length < 2) {
    return [];
  }

  const patients = await searchReceptionPatients(search);

  return patients.map((patient) => ({
    ...patient,
    birthDate: patient.birthDate ? patient.birthDate.toISOString().slice(0, 10) : ""
  }));
}

export async function submitReceptionIntakeAction(formData: FormData) {
  const user = await requirePermission("visits_create");
  const parsed = receptionIntakeSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!parsed.success) {
    redirect("/sigeco/recepcion/nuevo?error=invalid");
  }

  const record = toReceptionIntakeRecord(parsed.data);

  if (record.patientId) {
    await requirePermission("patients_update");
  } else {
    await requirePermission("patients_create");
    const duplicates = await findPossibleDuplicatePatients(record.patient.phone);

    if (duplicates.length > 0 && formData.get("allowDuplicate") !== "true") {
      redirect(
        `/sigeco/recepcion/nuevo?duplicatePhone=${encodeURIComponent(record.patient.phone)}`
      );
    }
  }

  const result = await createReceptionIntake({
    ...record,
    userId: user.id
  });

  revalidatePath("/sigeco");
  revalidatePath("/sigeco/recepcion");
  revalidatePath(`/sigeco/recepcion/pacientes/${result.patientId}`);
  redirect(`/sigeco/recepcion/visitas/${result.visit.id}`);
}
