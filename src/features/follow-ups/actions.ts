"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createFollowUpAttemptRecord,
  createFollowUpTaskRecord,
  FollowUpWorkflowError,
  PatientFollowUpConsentRequiredError
} from "@/modules/database/queries/follow-ups";
import { DatabaseError } from "@/modules/database";
import {
  auditedResult,
  denyAuditedAction,
  runAuditedAction
} from "@/modules/audit/service";
import {
  createFollowUpAttemptSchema,
  createFollowUpTaskSchema
} from "@/features/follow-ups/schemas/follow-up.schema";
import { canRoleCreateFollowUpType } from "@/features/follow-ups/policy";

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
      if (!canRoleCreateFollowUpType(user.role, parsed.data.type)) {
        denyAuditedAction("follow_up_type_not_allowed_for_role");
      }

      const created = await createFollowUpTaskRecord({
        ...parsed.data,
        createdById: user.id,
        assignedToId: parsed.data.assignedToId ?? user.id
      });
      return auditedResult(created, {
        entityId: created.id,
        context: {
          patientId: parsed.data.patientId,
          followUpType: created.type,
          priority: created.priority,
          assignedToId: created.assignedToId
        }
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

      let result;

      try {
        result = await createFollowUpAttemptRecord({
          ...parsed.data,
          userId: user.id
        });
      } catch (error) {
        if (
          error instanceof PatientFollowUpConsentRequiredError ||
          (error instanceof DatabaseError &&
            error.cause instanceof PatientFollowUpConsentRequiredError)
        ) {
          denyAuditedAction("patient_follow_up_consent_missing");
        }
        const workflowError =
          error instanceof FollowUpWorkflowError
            ? error
            : error instanceof DatabaseError &&
                error.cause instanceof FollowUpWorkflowError
              ? error.cause
              : null;
        if (workflowError) {
          redirect(
            `/sigeco/seguimientos/${encodeURIComponent(taskId)}?error=${workflowError.code.toLocaleLowerCase()}`
          );
        }
        throw error;
      }
      return auditedResult(result, {
        entityId: parsed.data.taskId,
        context: {
          attemptId: result.attempt.id,
          result: parsed.data.result,
          escalatedToDoctor: Boolean(result.escalatedTask)
        }
      });
    }
  );

  revalidatePath("/sigeco");
  revalidatePath("/sigeco/seguimientos");
  revalidatePath(`/sigeco/seguimientos/${taskId}`);
}
