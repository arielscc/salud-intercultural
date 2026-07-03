import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : undefined))
  .optional();

export const createInventoryItemSchema = z.object({
  sku: optionalText,
  internalCode: z.string().trim().min(2).max(80),
  name: z.string().trim().min(2).max(180),
  description: optionalText,
  unit: z.string().trim().min(1).max(40).default("unidad"),
  minimumStock: z.coerce.number().int().min(0).default(0),
  initialStock: z.coerce.number().int().min(0).default(0)
});

export const inventoryEntrySchema = z.object({
  itemId: z.string().min(1),
  quantity: z.coerce.number().int().positive(),
  reason: z.string().trim().min(2).max(220)
});

export const inventoryAdjustmentSchema = z.object({
  itemId: z.string().min(1),
  quantityDelta: z.coerce.number().int().refine((value) => value !== 0, "El ajuste no puede ser cero"),
  reason: z.string().trim().min(2).max(220)
});
