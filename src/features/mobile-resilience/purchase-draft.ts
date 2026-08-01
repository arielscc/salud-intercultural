import { z } from "zod";

const purchaseDraftLineSchema = z
  .object({
    id: z.number().int().nonnegative(),
    itemId: z.string().max(120),
    quantity: z.string().max(12),
    cost: z.string().max(20)
  })
  .strict();

export const safePurchaseDraftSchema = z
  .object({
    version: z.literal(1),
    idempotencyKey: z.string().uuid(),
    purchaseDate: z.string().date(),
    supplierId: z.string().max(120),
    sourceCashExpenseId: z.string().max(120),
    documentNumber: z.string().max(120),
    intendedPaymentMethod: z.enum(["cash", "transfer", "credit", "other"]),
    notes: z.string().max(1000),
    lines: z.array(purchaseDraftLineSchema).min(1).max(100),
    savedAt: z.number().int().positive()
  })
  .strict();

export type SafePurchaseDraft = z.infer<typeof safePurchaseDraftSchema>;

export function parseSafePurchaseDraft(value: string | null) {
  if (!value) return null;
  try {
    const parsed = safePurchaseDraftSchema.safeParse(JSON.parse(value));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
