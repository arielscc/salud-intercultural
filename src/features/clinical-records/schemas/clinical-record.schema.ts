import { z } from "zod";

const emptyToUndefined = (value: unknown) =>
  value === "" ? undefined : value;

const clinicalSnapshotShape = {
  motive: z.string().trim().min(3).max(700),
  primaryDiagnosis: z.string().trim().min(2).max(240),
  secondaryDiagnosis: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(240).optional()
  ),
  findings: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(1200).optional()
  ),
  observations: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(1200).optional()
  ),
  treatmentPlanText: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(1200).optional()
  ),
  indications: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(1200).optional()
  )
};

export const finalizeClinicalConsultationSchema = z.object({
  visitId: z.string().min(1),
  consultationId: z.string().min(1),
  expectedRevision: z.coerce.number().int().positive()
});

export const correctClinicalConsultationSchema = z.object({
  visitId: z.string().min(1),
  consultationId: z.string().min(1),
  expectedRevision: z.coerce.number().int().positive(),
  correctionType: z.enum([
    "diagnosis",
    "findings",
    "treatment_plan",
    "indications",
    "other"
  ]),
  correctionReason: z.string().trim().min(10).max(500),
  ...clinicalSnapshotShape
});

export type FinalizeClinicalConsultationInput = z.infer<
  typeof finalizeClinicalConsultationSchema
>;
export type CorrectClinicalConsultationInput = z.infer<
  typeof correctClinicalConsultationSchema
>;

