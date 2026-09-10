import { z } from "zod";

export const requestClinicalContinuitySchema = z.object({
  patientId: z.string().trim().min(1),
  visitId: z.string().trim().min(1),
  reason: z.string().trim().min(10).max(500)
});
