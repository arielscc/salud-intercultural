import { z } from "zod";

export const areaTimeTransitionSchema = z
  .object({
    visitId: z.string().trim().min(1),
    action: z.enum(["start_attention", "block", "resume"]),
    reason: z.string().trim().max(240).optional()
  })
  .superRefine((value, context) => {
    if (value.action === "block" && (!value.reason || value.reason.length < 3)) {
      context.addIssue({
        code: "custom",
        path: ["reason"],
        message: "Explica brevemente por qué se bloqueó la atención."
      });
    }
  });

export type AreaTimeTransitionInput = z.infer<
  typeof areaTimeTransitionSchema
>;
