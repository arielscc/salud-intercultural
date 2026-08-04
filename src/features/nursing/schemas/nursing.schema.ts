import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : undefined))
  .optional();

const optionalNumber = z.preprocess(
  (value) => (value === "" || value === undefined || value === null ? undefined : Number(value)),
  z.number().finite().positive().optional()
);

const optionalInt = z.preprocess(
  (value) => (value === "" || value === undefined || value === null ? undefined : Number(value)),
  z.number().int().positive().optional()
);

const optionalDate = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? new Date(value) : undefined))
  .refine((value) => value === undefined || !Number.isNaN(value.getTime()), "Fecha inválida")
  .optional();

export const createVitalSignsSchema = z.object({
  patientId: z.string().min(1),
  visitId: optionalText,
  temperatureCelsius: optionalNumber,
  systolicPressureMmHg: optionalInt,
  diastolicPressureMmHg: optionalInt,
  heartRateBpm: optionalInt,
  respiratoryRateRpm: optionalInt,
  oxygenSaturation: optionalInt,
  weightKg: optionalNumber,
  heightCm: optionalNumber,
  notes: optionalText,
  recordedAt: optionalDate
});

export const updateVitalSignsSchema = z.object({
  id: z.string().min(1),
  patientId: optionalText,
  visitId: optionalText,
  workItemId: optionalText,
  temperatureCelsius: optionalNumber,
  systolicPressureMmHg: optionalInt,
  diastolicPressureMmHg: optionalInt,
  heartRateBpm: optionalInt,
  respiratoryRateRpm: optionalInt,
  oxygenSaturation: optionalInt,
  weightKg: optionalNumber,
  heightCm: optionalNumber,
  notes: optionalText,
  recordedAt: optionalDate
});

export const createNursingApplicationSchema = z.object({
  patientId: z.string().min(1),
  visitId: optionalText,
  workItemId: optionalText,
  clinicalOrderId: optionalText,
  inventoryItemId: optionalText,
  medication: z.string().trim().min(2).max(160),
  quantity: optionalText,
  quantityUnits: optionalInt,
  route: optionalText,
  appliedAt: optionalDate,
  notes: optionalText
});

export const createNursingNoteSchema = z.object({
  patientId: z.string().min(1),
  visitId: optionalText,
  note: z.string().trim().min(2).max(2000)
});

export const deleteNursingNoteSchema = z.object({
  noteId: z.string().min(1)
});
