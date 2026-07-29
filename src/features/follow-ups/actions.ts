"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createFollowUpAttemptRecord,
  createFollowUpTaskRecord
} from "@/modules/database/queries/follow-ups";
import { auditedResult, runAuditedAction } from "@/modules/audit/service";
import {
  createFollowUpAttemptSchema,
  createFollowUpTaskSchema
} from "@/features/follow-ups/schemas/follow-up.schema";

function parseFormData(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export async function createFollowUpTaskAction(formData: FormData) {
  const patientId = String(formData.get("patientId") ?? "");
  const task = await runAuditedAction(
    {
      permission: "followups_write",
      action: "follow_up.task.create",
      entityType: "follow_up_task",
      context: { patientId: patientId || undefined }
    },
    async (user) => {
      const parsed = createFollowUpTaskSchema.safeParse(parseFormData(formData));

      if (!parsed.success) {
        redirect("/sigeco/seguimientos?error=invalid-task");
      }

      const created = await createFollowUpTaskRecord({
        ...parsed.data,
        createdById: user.id,
        assignedToId: parsed.data.assignedToId ?? user.id
      });
      return auditedResult(created, {
        entityId: created.id,
        context: { patientId: parsed.data.patientId }
      });
    }
  );

  revalidatePath("/sigeco");
  revalidatePath("/sigeco/seguimientos");
  if (patientId) revalidatePath(`/sigeco/recepcion/pacientes/${patientId}`);
  redirect(`/sigeco/seguimientos/${task.id}?aviso=seguimiento-creado`);
}

export async function createFollowUpAttemptAction(formData: FormData) {
  const taskId = String(formData.get("taskId") ?? "");
  await runAuditedAction(
    {
      permission: "followups_write",
      action: "follow_up.attempt.create",
      entityType: "follow_up_task",
      entityId: taskId || undefined
    },
    async (user) => {
      const parsed = createFollowUpAttemptSchema.safeParse(parseFormData(formData));

      if (!parsed.success) {
        redirect("/sigeco/seguimientos?error=invalid-attempt");
      }

      const attempt = await createFollowUpAttemptRecord({
        ...parsed.data,
        userId: user.id
      });
      return auditedResult(attempt, {
        entityId: parsed.data.taskId,
        context: { attemptId: attempt.id, result: parsed.data.result }
      });
    }
  );

  revalidatePath("/sigeco");
  revalidatePath("/sigeco/seguimientos");
  revalidatePath(`/sigeco/seguimientos/${taskId}`);
}
