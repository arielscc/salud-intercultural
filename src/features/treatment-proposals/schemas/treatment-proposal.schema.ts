import { z } from "zod";
import { treatmentProposalReasonsByStatus } from "@/features/treatment-proposals/labels";

const optionalText = (maximum: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() ? value : undefined),
    z.string().trim().max(maximum).optional()
  );

export const treatmentProposalOutcomeStatusSchema = z.enum([
  "accepted",
  "rejected",
  "needs_time",
  "not_applicable",
  "no_decision"
]);

export const treatmentProposalOutcomeReasonSchema = z.enum([
  "agreed_to_start",
  "cost",
  "needs_family_consultation",
  "needs_more_information",
  "schedule",
  "prefers_other_option",
  "clinical_not_applicable",
  "conversation_incomplete",
  "other"
]);

export const recordTreatmentProposalOutcomeSchema = z
  .object({
    visitId: z.string().min(1),
    status: treatmentProposalOutcomeStatusSchema,
    reason: treatmentProposalOutcomeReasonSchema,
    note: optionalText(500),
    administrationInstruction: optionalText(700)
  })
  .superRefine((value, context) => {
    if (!treatmentProposalReasonsByStatus[value.status].includes(value.reason)) {
      context.addIssue({
        code: "custom",
        path: ["reason"],
        message: "El motivo no corresponde al resultado seleccionado."
      });
    }

    if (
      value.status === "accepted" &&
      (!value.administrationInstruction ||
        value.administrationInstruction.length < 4)
    ) {
      context.addIssue({
        code: "custom",
        path: ["administrationInstruction"],
        message: "Escribe una instrucción clara para Administración."
      });
    }

    if (
      value.status !== "accepted" &&
      value.administrationInstruction !== undefined
    ) {
      context.addIssue({
        code: "custom",
        path: ["administrationInstruction"],
        message: "Solo una propuesta aceptada puede enviarse a Administración."
      });
    }
  });

export type RecordTreatmentProposalOutcomeInput = z.infer<
  typeof recordTreatmentProposalOutcomeSchema
>;
