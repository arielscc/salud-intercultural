"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  reminderCandidateReviewSchema,
  reminderRuleVersionSchema
} from "@/features/supervised-reminders/schema";
import { reminderEventType } from "@/features/supervised-reminders/policy";
import {
  generateSupervisedReminderCandidates,
  reviewSupervisedReminderCandidate,
  saveReminderRuleVersion
} from "@/modules/database/queries/supervised-reminders";
import { auditedResult, runAuditedAction } from "@/modules/audit/service";

const remindersPath = "/sigeco/seguimientos/recordatorios";

function reminderRuleFormData(formData: FormData) {
  const event = String(formData.get("event") ?? "");
  return {
    ruleId: String(formData.get("ruleId") ?? ""),
    name: formData.get("name"),
    event,
    followUpType:
      event in reminderEventType
        ? reminderEventType[event as keyof typeof reminderEventType]
        : "",
    channel: formData.get("channel"),
    templateBody: formData.get("templateBody"),
    delayDays: formData.get("delayDays"),
    lookbackDays: formData.get("lookbackDays"),
    windowStart: formData.get("windowStart"),
    windowEnd: formData.get("windowEnd"),
    weekdays: formData.getAll("weekdays"),
    ownerId: formData.get("ownerId"),
    enabled: formData.get("enabled") === "on"
  };
}

export async function saveReminderRuleVersionAction(formData: FormData) {
  const result = await runAuditedAction(
    {
      permission: "reminder_rules_manage",
      action: "supervised_reminder.rule_version.create",
      entityType: "supervised_reminder_rule",
      entityId: String(formData.get("ruleId") ?? "") || undefined
    },
    async (user) => {
      const parsed = reminderRuleVersionSchema.safeParse(
        reminderRuleFormData(formData)
      );
      if (!parsed.success) redirect(`${remindersPath}?error=invalid-rule`);

      const saved = await saveReminderRuleVersion({
        data: parsed.data,
        createdById: user.id
      });
      return auditedResult(saved, {
        entityId: saved.rule.id,
        context: {
          version: saved.version.version,
          enabled: saved.version.enabled,
          event: saved.version.event,
          ownerId: saved.version.ownerId
        }
      });
    }
  );

  revalidatePath(remindersPath);
  redirect(`${remindersPath}?aviso=rule-version-${result.version.version}`);
}

export async function generateReminderCandidatesAction() {
  const result = await runAuditedAction(
    {
      permission: "reminders_review",
      action: "supervised_reminder.candidates.generate",
      entityType: "supervised_reminder_candidate"
    },
    async (user) => {
      const generated = await generateSupervisedReminderCandidates({
        generatedById: user.id
      });
      return auditedResult(generated, { context: generated });
    }
  );

  revalidatePath(remindersPath);
  redirect(
    `${remindersPath}?aviso=reviewed&created=${result.created}&blocked=${result.blocked}`
  );
}

export async function reviewReminderCandidateAction(formData: FormData) {
  const candidateId = String(formData.get("candidateId") ?? "");
  const result = await runAuditedAction(
    {
      permission: "reminders_review",
      action: "supervised_reminder.candidate.review",
      entityType: "supervised_reminder_candidate",
      entityId: candidateId || undefined
    },
    async (user) => {
      const parsed = reminderCandidateReviewSchema.safeParse(
        Object.fromEntries(formData.entries())
      );
      if (!parsed.success) redirect(`${remindersPath}?error=invalid-review`);

      const reviewed = await reviewSupervisedReminderCandidate({
        data: parsed.data,
        reviewedById: user.id
      });
      return auditedResult(reviewed, {
        entityId: parsed.data.candidateId,
        context: {
          result: parsed.data.action,
          status: reviewed.candidate.status,
          taskId: reviewed.task?.id,
          consentBlocked: reviewed.consentBlocked
        }
      });
    }
  );

  revalidatePath(remindersPath);
  revalidatePath("/sigeco/seguimientos");
  if (result.task) {
    redirect(`/sigeco/seguimientos/${result.task.id}?aviso=recordatorio-aprobado`);
  }
  if (result.consentBlocked) {
    redirect(`${remindersPath}?error=consent-blocked`);
  }
  redirect(`${remindersPath}?aviso=${result.candidate.status}`);
}
