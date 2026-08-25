import { z } from "zod";

const emptyToUndefined = (value: unknown) => (value === "" ? undefined : value);
const cleanText = (value: string) => value.trim().replace(/\s+/g, " ");

/**
 * Alta mínima de un cliente de mostrador.
 *
 * Solo nombre y teléfono son obligatorios: es lo que hace falta para cobrar y
 * para volver a encontrar la ficha. Todo lo demás —fecha de nacimiento, ciudad,
 * alergias, antecedentes— lo completa Recepción cuando el paciente llega a una
 * atención, en el funnel que ya existe.
 *
 * El sistema no modela documento de identidad en ninguna parte, tampoco en el
 * funnel de Recepción, así que aquí tampoco se pide.
 */
export const walkInClientSchema = z.object({
  fullName: z.string().trim().min(2, "Ingresa el nombre completo.").max(160),
  phone: z
    .string()
    .trim()
    .min(6, "Ingresa un teléfono válido.")
    .max(30)
    .regex(/^[+()\d\s-]+$/, "Ingresa un teléfono válido."),
  secondaryPhone: z.preprocess(emptyToUndefined, z.string().trim().max(30).optional()),
  generalObservations: z.preprocess(emptyToUndefined, z.string().trim().max(500).optional()),
  /** Se envía en el segundo intento, cuando quien registra ya vio las coincidencias. */
  confirmDuplicate: z.preprocess(
    (value) => value === "true" || value === true,
    z.boolean().default(false)
  )
});

export type WalkInClientInput = z.infer<typeof walkInClientSchema>;

export function sanitizeWalkInClientInput(input: WalkInClientInput) {
  return {
    fullName: cleanText(input.fullName),
    phone: cleanText(input.phone),
    secondaryPhone: input.secondaryPhone ? cleanText(input.secondaryPhone) : undefined,
    generalObservations: input.generalObservations
      ? cleanText(input.generalObservations)
      : undefined
  };
}
