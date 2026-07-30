import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : undefined))
  .optional();

const dateInput = z
  .string()
  .trim()
  .transform((value) => new Date(value))
  .refine((value) => !Number.isNaN(value.getTime()), "Fecha inválida");

export const followUpStatusSchema = z.enum([
  "pending",
  "done",
  "improved",
  "not_improved",
  "no_answer",
  "wants_return",
  "requires_new_visit",
  "requires_doctor_call",
  "cancelled"
]);

export const followUpAttemptMethodSchema = z.enum(["call", "whatsapp", "in_person", "other"]);

export const followUpTypeSchema = z.enum([
  "evolution",
  "return",
  "treatment_recovery",
  "administrative",
  "doctor_call"
]);

export const followUpPrioritySchema = z.enum([
  "low",
  "normal",
  "high",
  "urgent"
]);

export const followUpResultSchema = z.enum([
  "done",
  "improved",
  "not_improved",
  "worsened",
  "no_answer",
  "wants_return",
  "requires_new_visit",
  "treatment_resumed",
  "treatment_declined",
  "rescheduled",
  "escalated_to_doctor",
  "cancelled",
  "other"
]);

export const createFollowUpTaskSchema = z.object({
  leadId: optionalText,
  patientId: optionalText,
  visitId: optionalText,
  saleId: optionalText,
  clinicalOrderId: optionalText,
  workItemId: optionalText,
  assignedToId: optionalText,
  type: followUpTypeSchema.default("administrative"),
  priority: followUpPrioritySchema.default("normal"),
  title: z.string().trim().min(2).max(180),
  notes: optionalText,
  dueAt: dateInput
});

export const createFollowUpAttemptSchema = z
  .object({
    taskId: z.string().min(1),
    method: followUpAttemptMethodSchema.default("call"),
    result: followUpResultSchema,
    notes: optionalText,
    contactedAt: dateInput.optional(),
    nextDueAt: dateInput.optional()
  })
  .superRefine((value, context) => {
    if (
      (value.result === "no_answer" || value.result === "rescheduled") &&
      !value.nextDueAt
    ) {
      context.addIssue({
        code: "custom",
        path: ["nextDueAt"],
        message: "Elige cuándo volver a intentar el contacto."
      });
    }
  });
