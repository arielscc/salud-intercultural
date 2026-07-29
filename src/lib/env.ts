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
  NEXT_PUBLIC_APP_ENV: z.preprocess(
    emptyToUndefined,
    z.enum(["local", "test", "staging", "production"]).default("local")
  ),
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
  APP_ENV: z.preprocess(
    emptyToUndefined,
    z.enum(["local", "test", "staging", "production"]).default("local")
  ),
  DATABASE_ENVIRONMENT: z.preprocess(
    emptyToUndefined,
    z.enum(["local", "test", "staging", "production"]).optional()
  ),
  STORAGE_ENVIRONMENT: z.preprocess(
    emptyToUndefined,
    z.enum(["local", "test", "staging", "production"]).optional()
  ),
  EXTERNAL_COMMUNICATIONS_MODE: z.preprocess(
    emptyToUndefined,
    z.enum(["blocked", "enabled"]).default("blocked")
  ),
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
  BLOB_READ_WRITE_TOKEN: optionalString,
  STAGING_BLOB_READ_WRITE_TOKEN: optionalString,
  CLINICAL_FILES_STORAGE_DRIVER: z.preprocess(
    emptyToUndefined,
    z.enum(["local", "vercel-blob"]).optional()
  ),
  CLINICAL_FILES_LOCAL_PATH: optionalString,
  CLINICAL_BLOB_READ_WRITE_TOKEN: optionalString,
  STAGING_CLINICAL_BLOB_READ_WRITE_TOKEN: optionalString,
  BACKUP_DATABASE_URL: optionalUrl,
  BACKUP_CLINICAL_FILES_PATH: optionalString,
  BACKUP_OUTPUT_PATH: optionalString,
  BACKUP_ENCRYPTION_KEY: optionalString,
  BACKUP_RESPONSIBLE: optionalString,
  BACKUP_FILE: optionalString,
  RESTORE_DATABASE_URL: optionalUrl,
  RESTORE_CLINICAL_FILES_PATH: optionalString,
  RESTORE_CONFIRMATION: optionalString,
  ADMIN_EMAIL: optionalEmail,
  ADMIN_PASSWORD: optionalString,
  ADMIN_RESET_PASSWORD_ON_SEED: z.preprocess(emptyToUndefined, z.enum(["true", "false"]).default("false")),
  ADMIN_SESSION_SECONDS: z.coerce.number().int().positive().default(28800),
  ADMIN_LOCK_MINUTES: z.coerce.number().int().positive().default(10),
  INTERNAL_SESSION_SECONDS: z.coerce.number().int().positive().default(28800),
  INTERNAL_LOCK_MINUTES: z.coerce.number().int().positive().default(10),
  INTERNAL_ADMIN_EMAIL: optionalEmail,
  INTERNAL_ADMIN_PASSWORD: optionalString,
  STAGING_QA_EMAIL_DOMAIN: optionalString,
  STAGING_QA_PASSWORD: optionalString,
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
