import { z } from "zod";
import {
  FeedbackCaseStatus,
  FeedbackClassification,
  FeedbackDeliveryChannel,
  FeedbackSeverity,
  PatientFeedbackArea,
  PatientFeedbackKind
} from "@/generated/prisma/client";

export const createFeedbackRequestSchema = z.object({
  visitId: z.string().trim().min(1),
  ownerId: z.string().trim().min(1),
  deliveryChannel: z.nativeEnum(FeedbackDeliveryChannel),
  expiresInDays: z.coerce.number().int().min(1).max(30)
});

export const submitPatientFeedbackSchema = z
  .object({
    token: z.string().trim().min(40).max(100),
    rating: z.coerce.number().int().min(1).max(5),
    kind: z.nativeEnum(PatientFeedbackKind),
    area: z.nativeEnum(PatientFeedbackArea),
    comment: z
      .string()
      .trim()
      .max(2000)
      .transform((value) => (value ? value : undefined)),
    healthRiskFlag: z.boolean(),
    privacyAcknowledged: z.literal(true)
  })
  .superRefine((value, context) => {
    if (value.kind === "complaint" && (value.comment?.length ?? 0) < 10) {
      context.addIssue({
        code: "custom",
        path: ["comment"],
        message: "Describe brevemente el reclamo."
      });
    }
    if (value.healthRiskFlag && value.kind !== "complaint") {
      context.addIssue({
        code: "custom",
        path: ["healthRiskFlag"],
        message: "La señal de riesgo corresponde a un reclamo."
      });
    }
  });

export const updateFeedbackCaseSchema = z
  .object({
    caseId: z.string().trim().min(1),
    ownerId: z.string().trim().min(1),
    classification: z.nativeEnum(FeedbackClassification),
    severity: z.nativeEnum(FeedbackSeverity),
    status: z.nativeEnum(FeedbackCaseStatus),
    responseDueAt: z.coerce.date().optional(),
    note: z.string().trim().min(3).max(1000)
  })
  .superRefine((value, context) => {
    if (
      !["resolved", "closed"].includes(value.status) &&
      !value.responseDueAt
    ) {
      context.addIssue({
        code: "custom",
        path: ["responseDueAt"],
        message: "Los casos abiertos necesitan plazo."
      });
    }
  });

export const cancelFeedbackRequestSchema = z.object({
  requestId: z.string().trim().min(1)
});
