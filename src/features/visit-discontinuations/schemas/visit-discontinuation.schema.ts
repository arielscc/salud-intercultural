import { z } from "zod";

const emptyToUndefined = (value: unknown) =>
  value === "" ? undefined : value;

export const visitDiscontinuationReasonSchema = z.enum([
  "wait",
  "cost",
  "rejection",
  "emergency",
  "missing_supply",
  "referral",
  "other"
]);

export const visitPendingTypeSchema = z.enum([
  "consultation",
  "study",
  "application",
  "payment",
  "delivery",
  "follow_up"
]);

export const recordVisitDiscontinuationSchema = z.object({
  visitId: z.string().min(1),
  reason: visitDiscontinuationReasonSchema,
  note: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(500).optional()
  ),
  pendingTypes: z.array(visitPendingTypeSchema).max(6).default([]),
  createFollowUp: z.boolean().default(false)
});

export type RecordVisitDiscontinuationInput = z.infer<
  typeof recordVisitDiscontinuationSchema
>;
