import { z } from "zod";
import {
  parseVitalSignValue,
  validateVitalSignValue,
  vitalSignFieldOrder,
  type VitalSignField
} from "@/features/nursing/vital-signs";

const optionalText = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : undefined))
  .optional();

const optionalInt = z.preprocess(
  (value) => (value === "" || value === undefined || value === null ? undefined : Number(value)),
  z.number().int().positive().optional()
);

/*
 * Cada signo vital se valida contra el rango clinico compartido con el
 * formulario (src/features/nursing/vital-signs.ts). Antes solo se pedia
 * "numero positivo", asi que una medicion exagerada pasaba el schema y
 * reventaba recien en Postgres por precision del Decimal.
 */
function vitalSign(field: VitalSignField) {
  return z
    .string()
    .or(z.number())
    .optional()
    .nullable()
    .superRefine((value, ctx) => {
      const message = validateVitalSignValue(field, value === null || value === undefined ? "" : String(value));
      if (message) ctx.addIssue({ code: z.ZodIssueCode.custom, message });
    })
    .transform((value) => parseVitalSignValue(value));
}

const vitalSignFields = Object.fromEntries(
  vitalSignFieldOrder.map((field) => [field, vitalSign(field)])
) as Record<VitalSignField, ReturnType<typeof vitalSign>>;

/** La diastolica siempre va por debajo de la sistolica (120/80, no 80/120). */
function refineBloodPressure(
  value: { systolicPressureMmHg?: number; diastolicPressureMmHg?: number },
  ctx: z.RefinementCtx
) {
  const { systolicPressureMmHg: systolic, diastolicPressureMmHg: diastolic } = value;
  if (systolic === undefined || diastolic === undefined) return;
  if (diastolic < systolic) return;
  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    path: ["diastolicPressureMmHg"],
    message: "La presión diastólica debe ser menor que la sistólica (ejemplo: 120/80)."
  });
}

const optionalDate = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? new Date(value) : undefined))
  .refine((value) => value === undefined || !Number.isNaN(value.getTime()), "Fecha inválida")
  .optional();

export const createVitalSignsSchema = z
  .object({
    patientId: z.string().min(1),
    visitId: optionalText,
    ...vitalSignFields,
    notes: optionalText,
    recordedAt: optionalDate
  })
  .superRefine(refineBloodPressure);

export const updateVitalSignsSchema = z
  .object({
    id: z.string().min(1),
    patientId: optionalText,
    visitId: optionalText,
    workItemId: optionalText,
    ...vitalSignFields,
    notes: optionalText,
    recordedAt: optionalDate
  })
  .superRefine(refineBloodPressure);

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
