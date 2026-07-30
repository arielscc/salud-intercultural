import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : undefined))
  .optional();

const moneyText = z
  .string()
  .trim()
  .regex(/^\d+(?:[.,]\d{1,2})?$/, "Usa un monto válido")
  .default("0");

const catalogFields = {
  sku: optionalText,
  name: z.string().trim().min(2).max(180),
  description: optionalText,
  category: z.string().trim().min(2).max(100).default("Sin categoría"),
  unit: z.string().trim().min(1).max(40).default("unidad"),
  usage: z.enum(["sale", "internal_use", "both"]).default("both"),
  salePrice: moneyText,
  referenceCost: moneyText,
  minimumStock: z.coerce.number().int().min(0).default(0)
} as const;

export const createInventoryItemSchema = z.object({
  internalCode: z.string().trim().min(2).max(80),
  ...catalogFields,
  initialStock: z.coerce.number().int().min(0).default(0)
});

export const updateInventoryItemSchema = z.object({
  itemId: z.string().min(1),
  expectedRevision: z.coerce.number().int().positive(),
  ...catalogFields,
  changeReason: z.string().trim().min(3).max(220)
});

export const inventoryItemStatusSchema = z.object({
  itemId: z.string().min(1),
  expectedRevision: z.coerce.number().int().positive(),
  active: z.enum(["true", "false"]).transform((value) => value === "true"),
  changeReason: z.string().trim().min(3).max(220)
});

export const inventoryItemSuppliersSchema = z
  .object({
    itemId: z.string().min(1),
    expectedRevision: z.coerce.number().int().positive(),
    supplierIds: z.array(z.string().min(1)).max(30),
    preferredSupplierId: optionalText,
    changeReason: z.string().trim().min(3).max(220)
  })
  .superRefine((value, context) => {
    if (
      value.preferredSupplierId &&
      !value.supplierIds.includes(value.preferredSupplierId)
    ) {
      context.addIssue({
        code: "custom",
        path: ["preferredSupplierId"],
        message: "El proveedor preferido debe estar seleccionado"
      });
    }
  });

const supplierFields = {
  name: z.string().trim().min(2).max(180),
  contactName: optionalText,
  phone: optionalText,
  whatsapp: optionalText,
  email: z
    .string()
    .trim()
    .email()
    .transform((value) => (value.length > 0 ? value : undefined))
    .or(z.literal("").transform(() => undefined))
    .optional(),
  address: optionalText,
  notes: optionalText
} as const;

export const createSupplierSchema = z.object({
  ...supplierFields
});

export const updateSupplierSchema = z.object({
  supplierId: z.string().min(1),
  expectedRevision: z.coerce.number().int().positive(),
  ...supplierFields,
  changeReason: z.string().trim().min(3).max(220)
});

export const supplierStatusSchema = z.object({
  supplierId: z.string().min(1),
  expectedRevision: z.coerce.number().int().positive(),
  active: z.enum(["true", "false"]).transform((value) => value === "true"),
  changeReason: z.string().trim().min(3).max(220)
});

export function inventoryMoneyToCents(value: string) {
  return Math.round(Number(value.replace(",", ".")) * 100);
}

export const inventoryEntrySchema = z.object({
  itemId: z.string().min(1),
  quantity: z.coerce.number().int().positive(),
  reason: z.string().trim().min(2).max(220)
});

export const inventoryAdjustmentSchema = z.object({
  itemId: z.string().min(1),
  quantityDelta: z.coerce
    .number()
    .int()
    .refine((value) => value !== 0, "El ajuste no puede ser cero"),
  reason: z.string().trim().min(2).max(220)
});
