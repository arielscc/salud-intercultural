import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : undefined))
  .optional();

const optionalDate = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? new Date(value) : undefined))
  .refine((value) => value === undefined || !Number.isNaN(value.getTime()), "Fecha inválida")
  .optional();

export const studyTypeSchema = z.enum(["laboratory", "ultrasound", "resonance", "imaging", "other"]);
export const studyStatusSchema = z.enum(["requested", "performed", "reviewed", "cancelled"]);

export const createStudySchema = z.object({
  patientId: z.string().min(1),
  visitId: optionalText,
  workItemId: optionalText,
  clinicalOrderId: optionalText,
  type: studyTypeSchema.default("other"),
  status: studyStatusSchema.default("performed"),
  title: z.string().trim().min(2).max(180),
  resultSummary: optionalText,
  findings: optionalText,
  performedAt: optionalDate
});
