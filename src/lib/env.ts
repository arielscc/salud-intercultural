import { z } from "zod";

const emptyToUndefined = (value: unknown) => (value === "" ? undefined : value);

const optionalString = z.preprocess(emptyToUndefined, z.string().optional());
const optionalEmail = z.preprocess(emptyToUndefined, z.string().email().optional());
const optionalUrl = z.preprocess(emptyToUndefined, z.string().url().optional());
const optionalPhone = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .regex(/^\+?[0-9\s-]{7,24}$/, "Use a phone number with country code, digits, spaces or hyphens.")
    .optional()
);

export const publicEnvSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.preprocess(
    emptyToUndefined,
    z.string().url().default("http://localhost:3000")
  ),
  NEXT_PUBLIC_SITE_NAME: z.preprocess(emptyToUndefined, z.string().default("Salud Intercultural")),
  NEXT_PUBLIC_GA_ID: z.preprocess(
    emptyToUndefined,
    z.string().regex(/^G-[A-Z0-9]+$/, "Use a valid GA4 measurement ID, for example G-XXXXXXXXXX.").optional()
  ),
  NEXT_PUBLIC_META_PIXEL_ID: z.preprocess(
    emptyToUndefined,
    z.string().regex(/^\d+$/, "Use only the numeric Meta Pixel ID.").optional()
  ),
  NEXT_PUBLIC_WHATSAPP_NUMBER: optionalPhone,
  NEXT_PUBLIC_CALL_PHONE: optionalPhone,
  NEXT_PUBLIC_CONTACT_EMAIL: optionalEmail,
  NEXT_PUBLIC_GOOGLE_MAPS_URL: optionalUrl
});

export const privateEnvSchema = z.object({
  DATABASE_URL: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .regex(/^postgres(ql)?:\/\//, "DATABASE_URL must be a PostgreSQL connection string.")
      .optional()
  ),
  PAYLOAD_SECRET: z.preprocess(
    emptyToUndefined,
    z.string().min(12, "PAYLOAD_SECRET should be at least 12 characters. Use 32+ in production.").optional()
  ),
  PAYLOAD_PUBLIC_SERVER_URL: optionalUrl,
  PAYLOAD_DB_SCHEMA: z.preprocess(emptyToUndefined, z.string().default("payload")),
  ADMIN_EMAIL: optionalEmail,
  ADMIN_PASSWORD: z.preprocess(
    emptyToUndefined,
    z.string().min(12, "ADMIN_PASSWORD should be at least 12 characters.").optional()
  ),
  ADMIN_SESSION_SECONDS: z.coerce.number().int().positive().default(28800),
  ADMIN_LOCK_MINUTES: z.coerce.number().int().positive().default(10),
  GOOGLE_SITE_VERIFICATION: optionalString,
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
  RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().positive().default(60),
  CMS_READS_DURING_BUILD: z.preprocess(emptyToUndefined, z.enum(["true", "false"]).default("false"))
});

export const envSchema = publicEnvSchema.merge(privateEnvSchema);

export const publicEnv = publicEnvSchema.parse(process.env);
export const privateEnv = privateEnvSchema.parse(process.env);
export const env = envSchema.parse(process.env);

export type AppEnv = z.infer<typeof envSchema>;
export type PublicEnv = z.infer<typeof publicEnvSchema>;
export type PrivateEnv = z.infer<typeof privateEnvSchema>;
