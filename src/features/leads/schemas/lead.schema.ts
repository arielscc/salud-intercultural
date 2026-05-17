import { z } from "zod";

const cleanText = (value: string) => value.trim().replace(/\s+/g, " ");
const emptyToUndefined = (value: unknown) => (value === "" ? undefined : value);

export const leadSourceSchema = z.enum([
  "website",
  "whatsapp",
  "facebook",
  "tiktok",
  "google",
  "call"
]);

export const leadStatusSchema = z.enum(["new", "contacted", "scheduled", "closed", "lost"]);

export const createLeadSchema = z.object({
  name: z.string().trim().min(2, "Ingresa tu nombre.").max(120),
  phone: z
    .string()
    .trim()
    .min(6, "Ingresa un teléfono válido.")
    .max(30)
    .regex(/^[+()\d\s-]+$/, "Ingresa un teléfono válido."),
  email: z.preprocess(
    emptyToUndefined,
    z.string().trim().email("Ingresa un email válido.").max(160).optional()
  ),
  interest: z.string().trim().min(3, "Indica el motivo de consulta.").max(160).optional(),
  message: z.string().trim().min(8, "Escribe un mensaje breve.").max(1000).optional(),
  source: leadSourceSchema.default("website"),
  status: leadStatusSchema.default("new"),
  pagePath: z.preprocess(
    emptyToUndefined,
    z.string().trim().min(1).max(300).optional()
  ),
  website: z.string().max(0).optional()
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;

export function sanitizeLeadInput(input: CreateLeadInput) {
  return {
    name: cleanText(input.name),
    phone: cleanText(input.phone),
    email: input.email ? cleanText(input.email).toLowerCase() : undefined,
    interest: input.interest ? cleanText(input.interest) : undefined,
    message: input.message ? cleanText(input.message) : undefined,
    source: input.source,
    status: input.status,
    pagePath: input.pagePath ? cleanText(input.pagePath) : undefined
  };
}
