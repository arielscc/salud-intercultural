import { z } from "zod";
import {
  normalizeCampaignCode,
  normalizeCaptureCode
} from "@/features/attribution/catalog";

const optionalText = (maximum: number) =>
  z.union([z.string().trim().max(maximum), z.null()]).optional();

export const payloadCampaignContractSchema = z
  .object({
    externalId: z.union([z.string(), z.number()]).transform(String).pipe(z.string().min(1).max(100)),
    revision: z.string().datetime({ offset: true }),
    code: z.string().trim().min(2).max(80).transform(normalizeCampaignCode),
    name: z.string().trim().min(2).max(140),
    sourceCode: z
      .string()
      .trim()
      .min(2)
      .max(60)
      .transform(normalizeCaptureCode),
    accountLabel: optionalText(120),
    accountHandle: optionalText(120),
    trafficType: z.enum(["unidentified", "organic", "paid"]),
    active: z.boolean(),
    startsAt: z.union([z.string().datetime({ offset: true }), z.null()]).optional(),
    endsAt: z.union([z.string().datetime({ offset: true }), z.null()]).optional()
  })
  .strict()
  .refine(
    (value) =>
      !value.startsAt ||
      !value.endsAt ||
      new Date(value.endsAt).getTime() > new Date(value.startsAt).getTime(),
    {
      message: "The campaign end date must be after its start date.",
      path: ["endsAt"]
    }
  );

export type PayloadCampaignContract = z.infer<
  typeof payloadCampaignContractSchema
>;

export const payloadMetricsQuerySchema = z
  .object({
    from: z.string().date(),
    to: z.string().date()
  })
  .strict()
  .transform((value, context) => {
    const from = new Date(`${value.from}T00:00:00.000Z`);
    const toInclusive = new Date(`${value.to}T00:00:00.000Z`);
    const to = new Date(toInclusive.getTime() + 24 * 60 * 60 * 1000);
    const days = (to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000);

    if (days < 1 || days > 366) {
      context.addIssue({
        code: "custom",
        message: "The requested range must contain between 1 and 366 days.",
        path: ["to"]
      });
      return z.NEVER;
    }

    return { from, to, fromLabel: value.from, toLabel: value.to };
  });

export const PAYLOAD_SIGECO_MAX_BODY_BYTES = 16 * 1024;
export const PAYLOAD_SIGECO_MIN_AGGREGATE = 5;

