import { z } from "zod";

const cleanText = (value: string) => value.trim().replace(/\s+/g, " ");

export const createLeadSchema = z.object({
  name: z.string().trim().min(2, "Ingresa tu nombre.").max(120).optional().or(z.literal("")),
  phone: z
    .string()
    .trim()
    .min(6, "Ingresa un teléfono válido.")
    .max(30)
    .regex(/^[+()\d\s-]+$/, "Ingresa un teléfono válido."),
  interest: z.string().trim().min(3, "Indica el motivo de consulta.").max(160).optional(),
  message: z.string().trim().min(8, "Escribe un mensaje breve.").max(1000).optional(),
  source: z
    .enum(["website", "whatsapp", "facebook", "tiktok", "google", "call"])
    .default("website"),
  website: z.string().max(0).optional()
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;

export function sanitizeLeadInput(input: CreateLeadInput) {
  return {
    name: input.name ? cleanText(input.name) : undefined,
    phone: cleanText(input.phone),
    interest: input.interest ? cleanText(input.interest) : undefined,
    message: input.message ? cleanText(input.message) : undefined,
    source: input.source
  };
}
