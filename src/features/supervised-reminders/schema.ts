import { z } from "zod";
import {
  parseTimeToMinute,
  reminderEventType
} from "@/features/supervised-reminders/policy";

const optionalId = z
  .string()
  .trim()
  .transform((value) => (value ? value : undefined))
  .optional();

export const reminderRuleVersionSchema = z
  .object({
    ruleId: optionalId,
    name: z.string().trim().min(3).max(100),
    event: z.enum([
      "visit_completed",
      "treatment_accepted",
      "visit_discontinued"
    ]),
    followUpType: z.enum(["evolution", "return", "treatment_recovery"]),
    channel: z.enum(["call", "whatsapp"]),
    templateBody: z.string().trim().min(10).max(500),
    delayDays: z.coerce.number().int().min(0).max(90),
    lookbackDays: z.coerce.number().int().min(1).max(90),
    windowStart: z.string(),
    windowEnd: z.string(),
    weekdays: z
      .array(z.coerce.number().int().min(0).max(6))
      .min(1),
    ownerId: z.string().trim().min(1),
    enabled: z.boolean()
  })
  .superRefine((value, context) => {
    if (reminderEventType[value.event] !== value.followUpType) {
      context.addIssue({
        code: "custom",
        path: ["followUpType"],
        message: "El tipo no corresponde al evento seleccionado."
      });
    }
    const start = parseTimeToMinute(value.windowStart);
    const end = parseTimeToMinute(value.windowEnd);
    if (start === null || end === null || start >= end) {
      context.addIssue({
        code: "custom",
        path: ["windowEnd"],
        message: "El horario de cierre debe ser posterior al inicio."
      });
    }
  })
  .transform((value) => ({
    ...value,
    windowStartMinute: parseTimeToMinute(value.windowStart)!,
    windowEndMinute: parseTimeToMinute(value.windowEnd)!
  }));

export const reminderCandidateReviewSchema = z
  .object({
    candidateId: z.string().trim().min(1),
    action: z.enum(["approve", "dismiss", "fail", "retry"]),
    note: z
      .string()
      .trim()
      .max(300)
      .transform((value) => (value ? value : undefined))
      .optional(),
    errorCode: z
      .string()
      .trim()
      .max(80)
      .transform((value) => (value ? value : undefined))
      .optional(),
    retryAt: z
      .string()
      .trim()
      .transform((value) => (value ? new Date(value) : undefined))
      .optional()
  })
  .superRefine((value, context) => {
    if (value.action === "fail" && !value.errorCode) {
      context.addIssue({
        code: "custom",
        path: ["errorCode"],
        message: "Registra el error."
      });
    }
    if (
      value.action === "retry" &&
      (!value.retryAt || Number.isNaN(value.retryAt.getTime()))
    ) {
      context.addIssue({
        code: "custom",
        path: ["retryAt"],
        message: "Elige la fecha del reintento."
      });
    }
  });
