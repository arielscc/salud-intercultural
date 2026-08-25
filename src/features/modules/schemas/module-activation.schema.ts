import { z } from "zod";
import { sigecoModuleCodes } from "@/features/modules/catalog";

/**
 * Cambio de estado de un módulo.
 *
 * Apagar exige motivo: es la decisión que después hay que poder explicar. Al
 * encender el motivo es opcional y queda como nota del lanzamiento.
 */
export const moduleActivationSchema = z
  .object({
    code: z.enum(sigecoModuleCodes),
    active: z.enum(["true", "false"]).transform((value) => value === "true"),
    reason: z
      .string()
      .trim()
      .max(240)
      .transform((value) => (value.length > 0 ? value : undefined))
      .optional()
  })
  .superRefine((value, ctx) => {
    if (value.active) return;
    if (!value.reason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reason"],
        message: "Apagar un módulo exige un motivo."
      });
      return;
    }
    if (value.reason.length < 4) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reason"],
        message: "El motivo debe explicar por qué se apaga."
      });
    }
  });

export type ModuleActivationInput = z.infer<typeof moduleActivationSchema>;
