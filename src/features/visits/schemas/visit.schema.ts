import { z } from "zod";

const emptyToUndefined = (value: unknown) => (value === "" ? undefined : value);

export const visitStatusSchema = z.enum([
  "in_reception",
  "in_consultation",
  "in_nursing",
  "in_administration",
  "completed",
  "left_without_care",
  "cancelled"
]);

export const routeAreaSchema = z.enum([
  "recepcion",
  "medico",
  "enfermeria",
  "administracion",
  "seguimiento",
  "cierre"
]);

export const createVisitSchema = z.object({
  patientId: z.string().min(1),
  reason: z.preprocess(emptyToUndefined, z.string().trim().max(500).optional()),
  note: z.preprocess(emptyToUndefined, z.string().trim().max(500).optional())
});

export const updateVisitStatusSchema = z.object({
  visitId: z.string().min(1),
  status: visitStatusSchema,
  area: routeAreaSchema,
  note: z.preprocess(emptyToUndefined, z.string().trim().max(500).optional())
});

export type CreateVisitInput = z.infer<typeof createVisitSchema>;
export type UpdateVisitStatusInput = z.infer<typeof updateVisitStatusSchema>;
