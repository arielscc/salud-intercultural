import { z } from "zod";

const newProductDraftSchema = z
  .object({
    internalCode: z.string().max(80),
    sku: z.string().max(80),
    name: z.string().max(180),
    description: z.string().max(500),
    category: z.string().max(100),
    unit: z.string().max(40),
    presentation: z.string().max(120).default(""),
    manufacturer: z.string().max(160).default(""),
    barcode: z.string().max(120).default(""),
    locationCode: z.string().max(120).default(""),
    usage: z.enum(["sale", "internal_use", "both"]),
    salePrice: z.string().max(20),
    referenceCost: z.string().max(20),
    minimumStock: z.string().max(12)
  })
  .strict();

const emptyNewProduct = {
  internalCode: "",
  sku: "",
  name: "",
  description: "",
  category: "Sin categoría",
  unit: "unidad",
  presentation: "",
  manufacturer: "",
  barcode: "",
  locationCode: "",
  usage: "both" as const,
  salePrice: "0",
  referenceCost: "0",
  minimumStock: "0"
};

const purchaseDraftLineSchema = z
  .object({
    id: z.number().int().nonnegative(),
    itemMode: z.enum(["existing", "new"]),
    itemId: z.string().max(120),
    supplierId: z.string().max(120),
    associatedSupplierIds: z.array(z.string().max(120)).max(30),
    quantity: z.string().max(12),
    cost: z.string().max(20),
    newProduct: newProductDraftSchema
  })
  .strict();

export const safePurchaseDraftSchema = z
  .object({
    version: z.literal(2),
    idempotencyKey: z.string().uuid(),
    purchaseDate: z.string().date(),
    sourceCashExpenseId: z.string().max(120),
    documentNumber: z.string().max(120),
    intendedPaymentMethod: z.enum(["cash", "transfer", "credit", "other"]),
    notes: z.string().max(1000),
    lines: z.array(purchaseDraftLineSchema).min(1).max(100),
    savedAt: z.number().int().positive()
  })
  .strict();

const legacyPurchaseDraftSchema = z
  .object({
    version: z.literal(1),
    idempotencyKey: z.string().uuid(),
    purchaseDate: z.string().date(),
    supplierId: z.string().max(120),
    sourceCashExpenseId: z.string().max(120),
    documentNumber: z.string().max(120),
    intendedPaymentMethod: z.enum(["cash", "transfer", "credit", "other"]),
    notes: z.string().max(1000),
    lines: z
      .array(
        z
          .object({
            id: z.number().int().nonnegative(),
            itemId: z.string().max(120),
            quantity: z.string().max(12),
            cost: z.string().max(20)
          })
          .strict()
      )
      .min(1)
      .max(100),
    savedAt: z.number().int().positive()
  })
  .strict();

export type SafePurchaseDraft = z.infer<typeof safePurchaseDraftSchema>;
export type SafePurchaseDraftLine = SafePurchaseDraft["lines"][number];

export function createEmptyPurchaseDraftLine(id: number): SafePurchaseDraftLine {
  return {
    id,
    itemMode: "existing",
    itemId: "",
    supplierId: "",
    associatedSupplierIds: [],
    quantity: "",
    cost: "",
    newProduct: { ...emptyNewProduct }
  };
}

export function parseSafePurchaseDraft(value: string | null): SafePurchaseDraft | null {
  if (!value) return null;
  try {
    const raw: unknown = JSON.parse(value);
    const current = safePurchaseDraftSchema.safeParse(raw);
    if (current.success) return current.data;

    const legacy = legacyPurchaseDraftSchema.safeParse(raw);
    if (!legacy.success) return null;
    return {
      version: 2,
      idempotencyKey: legacy.data.idempotencyKey,
      purchaseDate: legacy.data.purchaseDate,
      sourceCashExpenseId: legacy.data.sourceCashExpenseId,
      documentNumber: legacy.data.documentNumber,
      intendedPaymentMethod: legacy.data.intendedPaymentMethod,
      notes: legacy.data.notes,
      lines: legacy.data.lines.map((line) => ({
        ...createEmptyPurchaseDraftLine(line.id),
        itemId: line.itemId,
        supplierId: legacy.data.supplierId,
        associatedSupplierIds: legacy.data.supplierId ? [legacy.data.supplierId] : [],
        quantity: line.quantity,
        cost: line.cost
      })),
      savedAt: legacy.data.savedAt
    };
  } catch {
    return null;
  }
}
