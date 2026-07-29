import { z } from "zod";

const emptyToUndefined = (value: unknown) => (value === "" ? undefined : value);
const cleanText = (value: string) => value.trim().replace(/\s+/g, " ");

export const patientGenderSchema = z.enum(["female", "male", "other", "unknown"]);
const patientCaptureSourceValueSchema = z.enum([
  "facebook",
  "facebook_ads",
  "facebook_organic",
  "tiktok",
  "whatsapp",
  "referral",
  "previous_patient",
  "flyer",
  "website",
  "other"
]);
export const patientCaptureSourceSchema = patientCaptureSourceValueSchema.transform((source) =>
  source === "facebook_ads" || source === "facebook_organic" ? "facebook" : source
);

export const createPatientSchema = z.object({
  fullName: z.string().trim().min(2, "Ingresa el nombre completo.").max(160),
  phone: z
    .string()
    .trim()
    .min(6, "Ingresa un telefono valido.")
    .max(30)
    .regex(/^[+()\d\s-]+$/, "Ingresa un telefono valido."),
  secondaryPhone: z.preprocess(emptyToUndefined, z.string().trim().max(30).optional()),
  birthDate: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
  gender: patientGenderSchema.default("unknown"),
  city: z.preprocess(emptyToUndefined, z.string().trim().max(120).optional()),
  department: z.preprocess(emptyToUndefined, z.string().trim().max(120).optional()),
  address: z.preprocess(emptyToUndefined, z.string().trim().max(240).optional()),
  captureSource: patientCaptureSourceSchema.default("other"),
  generalObservations: z.preprocess(emptyToUndefined, z.string().trim().max(1000).optional()),
  allergies: z.preprocess(emptyToUndefined, z.string().trim().max(500).optional()),
  relevantHistory: z.preprocess(emptyToUndefined, z.string().trim().max(1000).optional()),
  sourceLeadId: z.preprocess(emptyToUndefined, z.string().trim().optional())
});

export type CreatePatientInput = z.infer<typeof createPatientSchema>;

export function sanitizePatientInput(input: CreatePatientInput) {
  return {
    ...input,
    fullName: cleanText(input.fullName),
    phone: cleanText(input.phone),
    secondaryPhone: input.secondaryPhone ? cleanText(input.secondaryPhone) : undefined,
    city: input.city ? cleanText(input.city) : undefined,
    department: input.department ? cleanText(input.department) : undefined,
    address: input.address ? cleanText(input.address) : undefined,
    generalObservations: input.generalObservations ? cleanText(input.generalObservations) : undefined,
    allergies: input.allergies ? cleanText(input.allergies) : undefined,
    relevantHistory: input.relevantHistory ? cleanText(input.relevantHistory) : undefined
  };
}
