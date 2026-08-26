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
import { auditedResult, runAuditedAction } from "@/modules/audit/service";
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
  const lead = await runAuditedAction(
    {
      permission: "leads_create",
      action: "lead.create",
      entityType: "lead"
    },
    async (user) => {
      const parsed = createInternalLeadSchema.safeParse(parseFormData(formData));

      if (!parsed.success) {
        redirect("/sigeco/leads/nuevo?error=invalid");
      }

      const created = await createInternalLeadRecord({
        ...sanitizeInternalLeadInput(parsed.data),
        createdById: user.id
      });
      return auditedResult(created, { entityId: created.id });
    }
  );

  revalidatePath("/sigeco");
  revalidatePath("/sigeco/leads");
  redirect(`/sigeco/leads/${lead.id}`);
}

export async function updateLeadStatusAction(formData: FormData) {
  const leadId = String(formData.get("leadId") ?? "");
  await runAuditedAction(
    {
      permission: "leads_update",
      action: "lead.status.update",
      entityType: "lead",
      entityId: leadId || undefined
    },
    async (user) => {
      const parsed = updateInternalLeadStatusSchema.safeParse(parseFormData(formData));

      if (!parsed.success) {
        redirect("/sigeco/leads?error=invalid-status");
      }

      const history = await updateInternalLeadStatus({
        ...parsed.data,
        userId: user.id
      });
      return auditedResult(history, {
        entityId: parsed.data.leadId,
        context: { nextStatus: parsed.data.status }
      });
    }
  );

  revalidatePath("/sigeco");
  revalidatePath("/sigeco/leads");
  revalidatePath(`/sigeco/leads/${leadId}`);
}

export async function createLeadContactAttemptAction(formData: FormData) {
  const leadId = String(formData.get("leadId") ?? "");
  await runAuditedAction(
    {
      permission: "leads_contact",
      action: "lead.contact_attempt.create",
      entityType: "lead",
      entityId: leadId || undefined
    },
    async (user) => {
      const parsed = createLeadContactAttemptSchema.safeParse(parseFormData(formData));

      if (!parsed.success) {
        redirect("/sigeco/leads?error=invalid-contact");
      }

      const attempt = await createLeadContactAttempt({
        ...parsed.data,
        userId: user.id
      });
      return auditedResult(attempt, {
        entityId: parsed.data.leadId,
        context: { attemptId: attempt.id, result: parsed.data.result }
      });
    }
  );

  revalidatePath("/sigeco");
  revalidatePath("/sigeco/leads");
  revalidatePath(`/sigeco/leads/${leadId}`);
}

export async function createLeadReminderAction(formData: FormData) {
  const leadId = String(formData.get("leadId") ?? "");
  await runAuditedAction(
    {
      permission: "leads_reminder",
      action: "lead.reminder.create",
      entityType: "lead",
      entityId: leadId || undefined
    },
    async (user) => {
      const parsed = createLeadReminderSchema.safeParse(parseFormData(formData));

      if (!parsed.success) {
        redirect("/sigeco/leads?error=invalid-reminder");
      }

      const reminder = await createLeadReminder({
        ...parsed.data,
        userId: user.id
      });
      return auditedResult(reminder, {
        entityId: parsed.data.leadId,
        context: { reminderId: reminder.id }
      });
    }
  );

  revalidatePath("/sigeco");
  revalidatePath("/sigeco/leads");
  revalidatePath(`/sigeco/leads/${leadId}`);
}
