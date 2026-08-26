import { z } from "zod";

const emptyToUndefined = (value: unknown) => (value === "" ? undefined : value);
const cleanText = (value: string) => value.trim().replace(/\s+/g, " ");

const internalLeadSourceValueSchema = z.enum([
  "website",
  "whatsapp",
  "facebook",
  "facebook_ads",
  "facebook_organic",
  "tiktok",
  "google",
  "call",
  "referral",
  "previous_patient",
  "flyer",
  "other"
]);
export const internalLeadSourceSchema = internalLeadSourceValueSchema.transform((source) =>
  source === "facebook_ads" || source === "facebook_organic" ? "facebook" : source
);

export const internalLeadStatusSchema = z.enum([
  "new",
  "contacted",
  "interested",
  "wants_visit",
  "reminder_pending",
  "confirmed_attendance",
  "no_answer",
  "discarded",
  "converted_to_patient"
]);

export const leadContactMethodSchema = z.enum(["call", "whatsapp", "in_person", "other"]);

export const leadContactResultSchema = z.enum([
  "contacted",
  "no_answer",
  "interested",
  "wants_visit",
  "confirmed_attendance",
  "discarded",
  "follow_up_required"
]);

export const createInternalLeadSchema = z.object({
  name: z.preprocess(emptyToUndefined, z.string().trim().min(2).max(120).optional()),
  phone: z
    .string()
    .trim()
    .min(6, "Ingresa un telefono valido.")
    .max(30)
    .regex(/^[+()\d\s-]+$/, "Ingresa un telefono valido."),
  email: z.preprocess(emptyToUndefined, z.string().trim().email().max(160).optional()),
  city: z.preprocess(emptyToUndefined, z.string().trim().max(120).optional()),
  symptoms: z.preprocess(emptyToUndefined, z.string().trim().max(500).optional()),
  intentionToVisit: z.preprocess(emptyToUndefined, z.string().trim().max(220).optional()),
  estimatedVisitDate: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
  commercialNotes: z.preprocess(emptyToUndefined, z.string().trim().max(1000).optional()),
  source: internalLeadSourceSchema.default("website"),
  assignedToId: z.preprocess(emptyToUndefined, z.string().trim().optional())
});

export const updateInternalLeadStatusSchema = z.object({
  leadId: z.string().min(1),
  status: internalLeadStatusSchema,
  note: z.preprocess(emptyToUndefined, z.string().trim().max(500).optional())
});

export const createLeadContactAttemptSchema = z.object({
  leadId: z.string().min(1),
  method: leadContactMethodSchema,
  result: leadContactResultSchema,
  notes: z.preprocess(emptyToUndefined, z.string().trim().max(500).optional())
});

export const createLeadReminderSchema = z.object({
  leadId: z.string().min(1),
  dueAt: z.coerce.date(),
  note: z.preprocess(emptyToUndefined, z.string().trim().max(500).optional()),
  userId: z.preprocess(emptyToUndefined, z.string().trim().optional())
});

export type CreateInternalLeadInput = z.infer<typeof createInternalLeadSchema>;
export type UpdateInternalLeadStatusInput = z.infer<typeof updateInternalLeadStatusSchema>;
export type CreateLeadContactAttemptInput = z.infer<typeof createLeadContactAttemptSchema>;
export type CreateLeadReminderInput = z.infer<typeof createLeadReminderSchema>;

export function sanitizeInternalLeadInput(input: CreateInternalLeadInput) {
  return {
    ...input,
    name: input.name ? cleanText(input.name) : undefined,
    phone: cleanText(input.phone),
    email: input.email ? cleanText(input.email).toLowerCase() : undefined,
    city: input.city ? cleanText(input.city) : undefined,
    symptoms: input.symptoms ? cleanText(input.symptoms) : undefined,
    intentionToVisit: input.intentionToVisit ? cleanText(input.intentionToVisit) : undefined,
    commercialNotes: input.commercialNotes ? cleanText(input.commercialNotes) : undefined
  };
}
