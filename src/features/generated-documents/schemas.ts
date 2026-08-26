import { z } from "zod";
import { prescriptionItemSchema } from "@/features/clinical-care/schemas/clinical-care.schema";

const requiredText = (label: string, max: number) =>
  z.string().trim().min(1, `${label} es obligatorio.`).max(max);

// La receta corregida llega como JSON (varios medicamentos) desde el mismo
// editor cliente que se usa al crear la receta.
const correctionPrescriptionItems = z.preprocess((value) => {
  if (typeof value !== "string" || value.trim() === "") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}, z.array(prescriptionItemSchema).min(1, "Agrega al menos un medicamento.").max(30));

export const generatePrescriptionDocumentSchema = z.object({
  visitId: z.string().trim().min(1)
});

export const generateInternalReceiptDocumentSchema = z.object({
  saleId: z.string().trim().min(1)
});

export const correctPrescriptionSchema = z.object({
  visitId: z.string().trim().min(1),
  reason: requiredText("El motivo", 500).min(
    8,
    "Explica brevemente por qué se corrige."
  ),
  prescriptionItems: correctionPrescriptionItems
});

export const professionalProfileSchema = z.object({
  userId: z.string().trim().min(1),
  displayName: requiredText("El nombre profesional", 160),
  // Opcional: puede ir vacío. Si no llega, se asume "Medico Tradicional".
  professionalTitle: z
    .string()
    .trim()
    .max(80)
    .optional()
    .default("Medico Tradicional"),
  // Especialidad y registros dejaron de capturarse en el formulario; se conservan
  // opcionales para no romper perfiles ya guardados ni el snapshot del PDF.
  specialty: z.string().trim().max(160).optional().default(""),
  ministryRegistration: z.string().trim().max(100).optional().default(""),
  medicalCollegeRegistration: z.string().trim().max(100).optional().default(""),
  active: z.preprocess(
    (value) => value === "on" || value === "true" || value === true,
    z.boolean()
  )
});

