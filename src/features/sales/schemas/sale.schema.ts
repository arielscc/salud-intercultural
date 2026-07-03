import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : undefined))
  .optional();

const moneyString = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, "Monto inválido");

const optionalMoneyString = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : undefined))
  .pipe(moneyString.optional());

const optionalDate = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? new Date(value) : undefined))
  .refine((value) => value === undefined || !Number.isNaN(value.getTime()), "Fecha inválida")
  .optional();

export const saleItemTypeSchema = z.enum([
  "treatment",
  "medication",
  "resonance",
  "serum",
  "service",
  "study",
  "product",
  "other"
]);

export const paymentMethodCodeSchema = z.enum(["cash", "qr", "card", "transfer", "other"]);

export const createSaleSchema = z.object({
  patientId: z.string().min(1),
  visitId: optionalText,
  workItemId: optionalText,
  inventoryItemId: optionalText,
  itemType: saleItemTypeSchema.default("service"),
  description: z.string().trim().min(2).max(180),
  quantity: z.coerce.number().int().positive().max(999).default(1),
  unitPrice: moneyString,
  discount: optionalMoneyString,
  initialPayment: optionalMoneyString,
  paymentMethodCode: paymentMethodCodeSchema.default("cash"),
  paymentReference: optionalText,
  notes: optionalText
});

export const createPaymentSchema = z.object({
  saleId: z.string().min(1),
  amount: moneyString,
  paymentMethodCode: paymentMethodCodeSchema.default("cash"),
  reference: optionalText,
  notes: optionalText,
  paidAt: optionalDate
});

export function moneyToCents(value?: string) {
  if (!value) return 0;
  return Math.round(Number(value) * 100);
}
