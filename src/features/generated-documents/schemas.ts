import { z } from "zod";

const requiredText = (label: string, max: number) =>
  z.string().trim().min(1, `${label} es obligatorio.`).max(max);

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
  medication: requiredText("El medicamento o tratamiento", 300),
  dose: z.string().trim().max(200).optional(),
  frequency: z.string().trim().max(200).optional(),
  duration: z.string().trim().max(200).optional(),
  observations: z.string().trim().max(1000).optional()
});

export const professionalProfileSchema = z.object({
  userId: z.string().trim().min(1),
  displayName: requiredText("El nombre profesional", 160),
  professionalTitle: requiredText("El título", 80),
  specialty: requiredText("La especialidad", 160),
  ministryRegistration: requiredText("El registro del Ministerio", 100),
  medicalCollegeRegistration: requiredText(
    "El registro del Colegio Médico",
    100
  ),
  active: z.preprocess(
    (value) => value === "on" || value === "true" || value === true,
    z.boolean()
  )
});

