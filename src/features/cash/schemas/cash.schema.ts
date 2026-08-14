import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : undefined))
  .optional();

export const moneyString = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, "Monto inválido");

const identifier = z.string().trim().min(1).max(120);
const reason = z.string().trim().min(3).max(300);

export const openCashSessionSchema = z.object({
  branchCode: z.string().trim().regex(/^[a-z0-9-]{2,80}$/),
  registerName: z.string().trim().min(2).max(80),
  businessDate: z.string().date(),
  shift: z.enum(["morning", "afternoon", "full_day", "other"]),
  responsibleId: identifier,
  openingCash: moneyString,
  exceptional: z
    .union([z.literal("on"), z.literal("true"), z.literal("false")])
    .optional()
    .transform((value) => value === "on" || value === "true"),
  exceptionalReason: optionalText,
  idempotencyKey: z.string().uuid()
}).refine((value) => !value.exceptional || Boolean(value.exceptionalReason), {
  message: "La Caja excepcional requiere motivo.",
  path: ["exceptionalReason"]
});

export const staffCashExpenseSchema = z.object({
  cashSessionId: identifier,
  category: z.enum(["lunch", "transport", "staff_other"]),
  deliveredById: identifier,
  authorizedById: identifier,
  reason,
  note: optionalText,
  idempotencyKey: z.string().uuid()
});

export const urgentPurchaseSchema = z.object({
  cashSessionId: identifier,
  category: z.enum([
    "injectables",
    "clinical_material",
    "cleaning",
    "office",
    "other"
  ]),
  itemDescription: z.string().trim().min(2).max(180),
  quantity: z.coerce.number().int().positive().max(100_000),
  unitPrice: moneyString,
  requestedById: identifier,
  receivedById: identifier,
  deliveredById: identifier,
  authorizedById: identifier,
  supplierName: optionalText,
  urgencyReason: reason,
  note: optionalText,
  requiresInventoryEntry: z
    .union([z.literal("on"), z.literal("true"), z.literal("false")])
    .optional()
    .transform((value) => value === "on" || value === "true"),
  idempotencyKey: z.string().uuid()
});

export const otherCashExpenseSchema = z.object({
  cashSessionId: identifier,
  amount: moneyString,
  receivedById: identifier,
  deliveredById: identifier,
  authorizedById: identifier,
  reason,
  note: optionalText,
  idempotencyKey: z.string().uuid()
});

export const closeCashSessionSchema = z.object({
  cashSessionId: identifier,
  cash: moneyString,
  qr: moneyString,
  card: moneyString,
  transfer: moneyString,
  other: moneyString,
  observation: optionalText
});

export const approveCashCloseSchema = z.object({
  cashSessionId: identifier,
  observation: reason
});

export const reverseCashMovementSchema = z.object({
  originalMovementId: identifier,
  amount: moneyString,
  reason,
  note: optionalText,
  idempotencyKey: z.string().uuid()
});

export function cashMoneyToCents(value: string) {
  return Math.round(Number(value) * 100);
}
