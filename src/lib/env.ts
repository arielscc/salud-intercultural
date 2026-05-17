import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_SITE_NAME: z.string().default("Salud Intercultural"),
  DATABASE_URL: z.string().optional(),
  PAYLOAD_SECRET: z.string().optional(),
  PAYLOAD_PUBLIC_SERVER_URL: z.string().url().optional(),
  PAYLOAD_DB_SCHEMA: z.string().default("payload"),
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().optional(),
  NEXT_PUBLIC_GA_ID: z.string().optional(),
  NEXT_PUBLIC_META_PIXEL_ID: z.string().optional(),
  GOOGLE_SITE_VERIFICATION: z.string().optional(),
  NEXT_PUBLIC_WHATSAPP_NUMBER: z.string().optional(),
  NEXT_PUBLIC_CALL_PHONE: z.string().optional(),
  NEXT_PUBLIC_CONTACT_EMAIL: z.string().email().optional(),
  NEXT_PUBLIC_GOOGLE_MAPS_URL: z.string().optional(),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
  RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().positive().default(60)
});

export const env = envSchema.parse(process.env);

export type AppEnv = z.infer<typeof envSchema>;
