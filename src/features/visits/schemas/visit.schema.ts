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

export const closedVisitStatuses = ["completed", "left_without_care", "cancelled"] as const;

export function isActiveVisitStatus(status: string) {
  return !closedVisitStatuses.includes(status as (typeof closedVisitStatuses)[number]);
}

export const createVisitSchema = z.object({
  idempotencyKey: z.string().uuid().default(() => crypto.randomUUID()),
  patientId: z.string().min(1),
  reason: z.preprocess(emptyToUndefined, z.string().trim().max(500).optional()),
  note: z.preprocess(emptyToUndefined, z.string().trim().max(500).optional())
});

export const updateVisitStatusSchema = z
  .object({
    visitId: z.string().min(1),
    status: visitStatusSchema,
    area: routeAreaSchema,
    note: z.preprocess(
      emptyToUndefined,
      z.string().trim().max(500).optional()
    )
  })
  .refine((value) => value.status !== "left_without_care", {
    message: "Use the detailed discontinuation workflow.",
    path: ["status"]
  });

export const visitFlowSchema = z.object({
  visitId: z.string().min(1),
  flow: z.enum([
    "complete",
    "to_reception",
    "to_consultation",
    "to_nursing",
    "to_administration"
  ]),
  note: z.preprocess(emptyToUndefined, z.string().trim().max(500).optional())
});

export type CreateVisitInput = z.infer<typeof createVisitSchema>;
export type UpdateVisitStatusInput = z.infer<typeof updateVisitStatusSchema>;
export type VisitFlowInput = z.infer<typeof visitFlowSchema>;
