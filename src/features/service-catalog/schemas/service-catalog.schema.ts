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

const optionalMoneyText = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : undefined))
  .pipe(moneyText.optional());

export function serviceCatalogMoneyToCents(value?: string) {
  if (!value) return undefined;
  return Math.round(Number(value.replace(",", ".")) * 100);
}

const componentSchema = z.object({
  inventoryItemId: z.string().min(1),
  quantity: z.coerce.number().int().positive().max(999)
});

/** Normaliza pares paralelos del formulario en una lista de componentes. */
export function parseComponents(
  inventoryItemIds: string[],
  quantities: string[]
): Array<{ inventoryItemId: string; quantity: number }> {
  return inventoryItemIds
    .map((inventoryItemId, index) => ({
      inventoryItemId: inventoryItemId?.trim() ?? "",
      quantity: Number((quantities[index] ?? "1").replace(",", ".")) || 1
    }))
    .filter((component) => component.inventoryItemId.length > 0);
}

const catalogFields = {
  name: z.string().trim().min(2).max(180),
  description: optionalText,
  category: z.string().trim().min(2).max(100).default("Sin categoría"),
  basePrice: moneyText,
  requiresNursing: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  supportsSessions: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  sessionCount: z.coerce.number().int().positive().max(999).optional(),
  packagePrice: optionalMoneyText,
  sessionPrice: optionalMoneyText,
  components: z.array(componentSchema).max(50).default([])
} as const;

export const createServiceCatalogItemSchema = z.object({
  code: z.string().trim().min(2).max(80),
  kind: z.enum(["service", "treatment", "study"]),
  ...catalogFields
});

export const updateServiceCatalogItemSchema = z.object({
  catalogItemId: z.string().min(1),
  expectedRevision: z.coerce.number().int().positive(),
  ...catalogFields,
  changeReason: z.string().trim().min(3).max(220)
});

export const serviceCatalogItemStatusSchema = z.object({
  catalogItemId: z.string().min(1),
  expectedRevision: z.coerce.number().int().positive(),
  active: z.enum(["true", "false"]).transform((value) => value === "true"),
  changeReason: z.string().trim().min(3).max(220)
});

export const serviceCatalogOwnThresholdSchema = z.object({
  catalogItemId: z.string().min(1),
  expectedRevision: z.coerce.number().int().positive(),
  maxDiscount: moneyText,
  changeReason: z.string().trim().min(3).max(220)
});

export const inventoryMaxDiscountSchema = z.object({
  itemId: z.string().min(1),
  expectedRevision: z.coerce.number().int().positive(),
  maxDiscount: moneyText,
  changeReason: z.string().trim().min(3).max(220)
});
