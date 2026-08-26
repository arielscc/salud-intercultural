import { z } from "zod";

export const dismissPatientDuplicateSchema = z.object({
  candidateId: z.string().trim().min(1)
});

export const mergePatientDuplicateSchema = z
  .object({
    candidateId: z.string().trim().min(1),
    sourcePatientId: z.string().trim().min(1),
    targetPatientId: z.string().trim().min(1),
    confirmation: z.string().trim().min(1)
  })
  .refine((value) => value.sourcePatientId !== value.targetPatientId, {
    message: "Las fichas deben ser diferentes.",
    path: ["sourcePatientId"]
  });
