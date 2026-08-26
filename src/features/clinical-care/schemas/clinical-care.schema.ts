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

// Cada línea de receta: medicamento (obligatorio), enlace opcional al inventario
// y posología. Frecuencia/duración vienen de chips (o texto libre "Otro").
export const prescriptionItemSchema = z.object({
  inventoryItemId: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.string().max(40).optional()
  ),
  medication: z.string().trim().min(1).max(200),
  dose: z.preprocess(emptyToUndefined, z.string().trim().max(200).optional()),
  frequency: z.preprocess(emptyToUndefined, z.string().trim().max(200).optional()),
  duration: z.preprocess(emptyToUndefined, z.string().trim().max(200).optional()),
  observations: z.preprocess(emptyToUndefined, z.string().trim().max(500).optional())
});

export type PrescriptionItemInput = z.infer<typeof prescriptionItemSchema>;

// La receta llega como JSON (varios medicamentos) desde el editor cliente.
const prescriptionItemsFromJson = z.preprocess((value) => {
  if (typeof value !== "string" || value.trim() === "") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}, z.array(prescriptionItemSchema).max(30));

export const upsertClinicalConsultationSchema = z.object({
  visitId: z.string().min(1),
  expectedRevision: z.coerce.number().int().min(0),
  motive: z.string().trim().min(3, "Registra el motivo.").max(700),
  primaryDiagnosis: z.string().trim().min(2, "Registra el diagnostico principal.").max(240),
  secondaryDiagnosis: z.preprocess(emptyToUndefined, z.string().trim().max(240).optional()),
  findings: z.preprocess(emptyToUndefined, z.string().trim().max(1200).optional()),
  observations: z.preprocess(emptyToUndefined, z.string().trim().max(1200).optional()),
  treatmentPlanText: z.preprocess(emptyToUndefined, z.string().trim().max(1200).optional()),
  indications: z.preprocess(emptyToUndefined, z.string().trim().max(1200).optional()),
  prescriptionItems: prescriptionItemsFromJson.default([]),
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
    prescriptionItems: input.prescriptionItems.map((item) => ({
      inventoryItemId: item.inventoryItemId,
      medication: cleanText(item.medication),
      dose: item.dose ? cleanText(item.dose) : undefined,
      frequency: item.frequency ? cleanText(item.frequency) : undefined,
      duration: item.duration ? cleanText(item.duration) : undefined,
      observations: item.observations ? cleanText(item.observations) : undefined
    })),
    evolutionNote: input.evolutionNote ? cleanText(input.evolutionNote) : undefined
  };
}
