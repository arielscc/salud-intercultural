"use server";

/*
 * LEGACY (simplificacion V3.7): la UI de leads se retiro de Sigeco y ningun
 * formulario invoca estas actions. Se conservan junto a los datos de leads;
 * la captacion por WhatsApp/redes se gestionara desde otro proyecto.
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createLeadContactAttempt,
  createLeadReminder,
  createInternalLeadRecord,
  updateInternalLeadStatus
} from "@/modules/database/queries/leads-v3";
import { requirePermission } from "@/modules/permissions";
import {
  createInternalLeadSchema,
  createLeadContactAttemptSchema,
  createLeadReminderSchema,
  sanitizeInternalLeadInput,
  updateInternalLeadStatusSchema
} from "@/features/crm/schemas/lead-v3.schema";

function parseFormData(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export async function createInternalLeadAction(formData: FormData) {
  const user = await requirePermission("leads_create");
  const parsed = createInternalLeadSchema.safeParse(parseFormData(formData));

  if (!parsed.success) {
    redirect("/sigeco/leads/nuevo?error=invalid");
  }

  const lead = await createInternalLeadRecord({
    ...sanitizeInternalLeadInput(parsed.data),
    createdById: user.id
  });

  revalidatePath("/sigeco");
  revalidatePath("/sigeco/leads");
  redirect(`/sigeco/leads/${lead.id}`);
}

export async function updateLeadStatusAction(formData: FormData) {
  const user = await requirePermission("leads_update");
  const parsed = updateInternalLeadStatusSchema.safeParse(parseFormData(formData));

  if (!parsed.success) {
    redirect("/sigeco/leads?error=invalid-status");
  }

  await updateInternalLeadStatus({
    ...parsed.data,
    userId: user.id
  });

  revalidatePath("/sigeco");
  revalidatePath("/sigeco/leads");
  revalidatePath(`/sigeco/leads/${parsed.data.leadId}`);
}

export async function createLeadContactAttemptAction(formData: FormData) {
  const user = await requirePermission("leads_contact");
  const parsed = createLeadContactAttemptSchema.safeParse(parseFormData(formData));

  if (!parsed.success) {
    redirect("/sigeco/leads?error=invalid-contact");
  }

  await createLeadContactAttempt({
    ...parsed.data,
    userId: user.id
  });

  revalidatePath("/sigeco");
  revalidatePath("/sigeco/leads");
  revalidatePath(`/sigeco/leads/${parsed.data.leadId}`);
}

export async function createLeadReminderAction(formData: FormData) {
  const user = await requirePermission("leads_reminder");
  const parsed = createLeadReminderSchema.safeParse(parseFormData(formData));

  if (!parsed.success) {
    redirect("/sigeco/leads?error=invalid-reminder");
  }

  await createLeadReminder({
    ...parsed.data,
    userId: user.id
  });

  revalidatePath("/sigeco");
  revalidatePath("/sigeco/leads");
  revalidatePath(`/sigeco/leads/${parsed.data.leadId}`);
}
