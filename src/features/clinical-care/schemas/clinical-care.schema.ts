import { z } from "zod";
import { routeAreaSchema } from "@/features/visits/schemas/visit.schema";

const emptyToUndefined = (value: unknown) => (value === "" ? undefined : value);
const cleanText = (value: string) => value.trim().replace(/\s+/g, " ");

export const clinicalOrderTypeSchema = z.enum([
  "vital_signs",
  "study",
  "nursing_application",
  "serum",
  "medication",
  "administration",
  "follow_up",
  "other"
]);

export const upsertClinicalConsultationSchema = z.object({
  visitId: z.string().min(1),
  motive: z.string().trim().min(3, "Registra el motivo.").max(700),
  primaryDiagnosis: z.string().trim().min(2, "Registra el diagnostico principal.").max(240),
  secondaryDiagnosis: z.preprocess(emptyToUndefined, z.string().trim().max(240).optional()),
  findings: z.preprocess(emptyToUndefined, z.string().trim().max(1200).optional()),
  observations: z.preprocess(emptyToUndefined, z.string().trim().max(1200).optional()),
  treatmentPlanText: z.preprocess(emptyToUndefined, z.string().trim().max(1200).optional()),
  indications: z.preprocess(emptyToUndefined, z.string().trim().max(1200).optional()),
  prescriptionMedication: z.preprocess(emptyToUndefined, z.string().trim().max(200).optional()),
  prescriptionDose: z.preprocess(emptyToUndefined, z.string().trim().max(200).optional()),
  prescriptionFrequency: z.preprocess(emptyToUndefined, z.string().trim().max(200).optional()),
  prescriptionDuration: z.preprocess(emptyToUndefined, z.string().trim().max(200).optional()),
  prescriptionObservations: z.preprocess(emptyToUndefined, z.string().trim().max(500).optional()),
  evolutionNote: z.preprocess(emptyToUndefined, z.string().trim().max(1200).optional())
});

export const createClinicalOrderSchema = z.object({
  visitId: z.string().min(1),
  type: clinicalOrderTypeSchema,
  targetArea: routeAreaSchema,
  title: z.string().trim().min(3).max(200),
  details: z.preprocess(emptyToUndefined, z.string().trim().max(800).optional())
});

export type UpsertClinicalConsultationInput = z.infer<typeof upsertClinicalConsultationSchema>;
export type CreateClinicalOrderInput = z.infer<typeof createClinicalOrderSchema>;

export function sanitizeClinicalConsultationInput(input: UpsertClinicalConsultationInput) {
  return {
    ...input,
    motive: cleanText(input.motive),
    primaryDiagnosis: cleanText(input.primaryDiagnosis),
    secondaryDiagnosis: input.secondaryDiagnosis ? cleanText(input.secondaryDiagnosis) : undefined,
    findings: input.findings ? cleanText(input.findings) : undefined,
    observations: input.observations ? cleanText(input.observations) : undefined,
    treatmentPlanText: input.treatmentPlanText ? cleanText(input.treatmentPlanText) : undefined,
    indications: input.indications ? cleanText(input.indications) : undefined,
    prescriptionMedication: input.prescriptionMedication ? cleanText(input.prescriptionMedication) : undefined,
    prescriptionDose: input.prescriptionDose ? cleanText(input.prescriptionDose) : undefined,
    prescriptionFrequency: input.prescriptionFrequency ? cleanText(input.prescriptionFrequency) : undefined,
    prescriptionDuration: input.prescriptionDuration ? cleanText(input.prescriptionDuration) : undefined,
    prescriptionObservations: input.prescriptionObservations
      ? cleanText(input.prescriptionObservations)
      : undefined,
    evolutionNote: input.evolutionNote ? cleanText(input.evolutionNote) : undefined
  };
}
