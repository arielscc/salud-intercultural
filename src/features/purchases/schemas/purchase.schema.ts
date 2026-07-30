import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .transform((value) => (value ? value : undefined))
  .optional();
const identifier = z.string().trim().min(1).max(160);
const money = z.string().trim().regex(/^\d+(?:[.,]\d{1,2})?$/);
const localDateTime = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);

export const purchaseDraftSchema = z.object({
  supplierId: identifier,
  sourceCashExpenseId: optionalText,
  branchCode: z.literal("el-alto"),
  purchaseDate: z.string().date(),
  documentNumber: optionalText,
  currency: z.literal("BOB"),
  intendedPaymentMethod: z.enum(["cash", "transfer", "credit", "other"]),
  notes: optionalText,
  idempotencyKey: z.string().uuid()
});

export const purchaseLineSchema = z.object({
  itemId: identifier,
  orderedQuantity: z.coerce.number().int().positive().max(1_000_000),
  unitCost: money
});

export const confirmPurchaseSchema = z.object({
  purchaseId: identifier,
  expectedRevision: z.coerce.number().int().positive(),
  cashSessionId: optionalText,
  paymentReference: optionalText,
  paymentIdempotencyKey: z.string().uuid()
});

export const purchasePaymentSchema = z.object({
  purchaseId: identifier,
  cashSessionId: identifier,
  method: z.enum(["cash", "transfer", "other"]),
  amount: money,
  reference: optionalText,
  paidAt: localDateTime.optional(),
  idempotencyKey: z.string().uuid()
});

export const cancelPurchaseSchema = z.object({
  purchaseId: identifier,
  expectedRevision: z.coerce.number().int().positive(),
  reason: z.string().trim().min(3).max(300)
});

export const purchaseReceiptSchema = z.object({
  purchaseId: identifier,
  branchCode: z.literal("el-alto"),
  locationCode: z.string().trim().min(2).max(100),
  documentNumber: optionalText,
  receivedAt: localDateTime,
  receivedById: identifier,
  notes: optionalText,
  idempotencyKey: z.string().uuid()
});

export const purchaseReceiptLineSchema = z.object({
  purchaseLineId: identifier,
  quantity: z.coerce.number().int().min(0).max(1_000_000),
  unitCost: money,
  batchNumber: optionalText,
  expirationDate: z
    .string()
    .trim()
    .transform((value) => (value ? value : undefined))
    .pipe(z.string().date().optional())
});

export const inventoryLotAdjustmentSchema = z.object({
  lotId: identifier,
  kind: z.enum([
    "damage",
    "waste",
    "expired",
    "supplier_return",
    "patient_return",
    "correction"
  ]),
  quantity: z.coerce.number().int().positive().max(1_000_000),
  restocked: z
    .union([z.literal("on"), z.literal("true"), z.literal("false")])
    .optional()
    .transform((value) => value === "on" || value === "true"),
  reason: z.string().trim().min(3).max(300),
  authorizedById: identifier,
  idempotencyKey: z.string().uuid()
});

export function purchaseMoneyToCents(value: string) {
  return Math.round(Number(value.replace(",", ".")) * 100);
}
