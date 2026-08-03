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
  createDoctorVisitFollowUpSchema,
  createFollowUpAttemptSchema,
  createFollowUpTaskSchema
} from "@/features/follow-ups/schemas/follow-up.schema";
import { canRoleCreateFollowUpType } from "@/features/follow-ups/policy";
import { getVisitLatestSale } from "@/modules/database/queries/sales";

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

export async function createDoctorVisitFollowUpAction(formData: FormData) {
  const visitId = String(formData.get("visitId") ?? "");
  const consultaPath = `/sigeco/consultas/${encodeURIComponent(visitId)}`;
  await runAuditedAction(
    {
      permission: "followups_write",
      action: "follow_up.visit.create",
      entityType: "follow_up_task",
      context: { visitId: visitId || undefined }
    },
    async (user) => {
      // El seguimiento agendado por el médico es solo para el médico (super_admin
      // también). Recepción/otros usan su propio flujo.
      if (user.role !== "medico" && user.role !== "super_admin") {
        denyAuditedAction("follow_up_role_not_allowed");
      }
      const parsed = createDoctorVisitFollowUpSchema.safeParse(parseFormData(formData));
      if (!parsed.success) {
        redirect(`${consultaPath}?error=seguimiento-invalido`);
      }

      // Tarea 7: solo con venta registrada en la visita.
      const sale = await getVisitLatestSale(parsed.data.visitId);
      if (!sale) {
        denyAuditedAction("follow_up_requires_sale");
      }

      const created = await createFollowUpTaskRecord({
        patientId: parsed.data.patientId,
        visitId: parsed.data.visitId,
        saleId: sale.id,
        type: parsed.data.type,
        priority: "normal",
        title: parsed.data.title,
        notes: parsed.data.notes,
        dueAt: parsed.data.dueAt,
        createdById: user.id
      });
      return auditedResult(created, {
        entityId: created.id,
        context: {
          patientId: parsed.data.patientId,
          visitId: parsed.data.visitId,
          saleId: sale.id,
          followUpType: created.type,
          assignedToId: created.assignedToId
        }
      });
    }
  );

  revalidatePath("/sigeco");
  revalidatePath("/sigeco/seguimientos");
  revalidatePath(consultaPath);
  redirect(`${consultaPath}?aviso=seguimiento-agendado`);
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
