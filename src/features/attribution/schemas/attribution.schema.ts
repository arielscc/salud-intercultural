import { z } from "zod";
import {
  normalizeCampaignCode,
  normalizeCaptureCode
} from "@/features/attribution/catalog";

const emptyToUndefined = (value: unknown) => (value === "" ? undefined : value);

export const captureSourceCodeSchema = z
  .string()
  .trim()
  .min(1)
  .max(60)
  .transform(normalizeCaptureCode)
  .refine((value) => value.length >= 2, "Código inválido.");

export const createCaptureSourceSchema = z.object({
  code: captureSourceCodeSchema,
  patientLabel: z.string().trim().min(2).max(80),
  internalLabel: z.string().trim().min(2).max(120),
  category: z.enum([
    "social",
    "messaging",
    "referral",
    "offline",
    "web",
    "other"
  ]),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(100),
  receptionSelectable: z.preprocess(
    (value) => value === "true" || value === "on" || value === true,
    z.boolean()
  )
});

export const updateCaptureSourceSchema = z.object({
  sourceId: z.string().trim().min(1),
  patientLabel: z.string().trim().min(2).max(80),
  internalLabel: z.string().trim().min(2).max(120),
  category: z.enum([
    "social",
    "messaging",
    "referral",
    "offline",
    "web",
    "other"
  ]),
  sortOrder: z.coerce.number().int().min(0).max(9999),
  active: z.preprocess(
    (value) => value === "true" || value === "on" || value === true,
    z.boolean()
  ),
  receptionSelectable: z.preprocess(
    (value) => value === "true" || value === "on" || value === true,
    z.boolean()
  )
});

export const createCaptureCampaignSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .transform(normalizeCampaignCode),
  name: z.string().trim().min(2).max(140),
  sourceId: z.string().trim().min(1),
  accountLabel: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(120).optional()
  ),
  accountHandle: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(120).optional()
  ),
  trafficType: z.enum(["unidentified", "organic", "paid"]),
  startsAt: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
  endsAt: z.preprocess(emptyToUndefined, z.coerce.date().optional())
}).refine(
  (value) =>
    !value.startsAt || !value.endsAt || value.endsAt.getTime() > value.startsAt.getTime(),
  {
    message: "La fecha final debe ser posterior a la inicial.",
    path: ["endsAt"]
  }
);

export const captureEvidenceCodeSchema = z.preprocess(
  emptyToUndefined,
  z.string().trim().max(120).optional()
);

