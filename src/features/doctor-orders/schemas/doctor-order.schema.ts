import { z } from "zod";
import type { DoctorOrderLineSource, SaleItemType } from "@/generated/prisma/client";

const moneyString = z
  .string()
  .trim()
  .regex(/^\d+(?:[.,]\d{1,2})?$/, "Monto inválido")
  .default("0");

export function doctorOrderMoneyToCents(value: string) {
  return Math.round(Number(value.replace(",", ".")) * 100);
}

const sourceSchema = z.enum(["service", "treatment", "product", "free_text"]);

/** Deriva el tipo de venta a partir del origen de la línea. */
export function itemTypeForSource(source: DoctorOrderLineSource): SaleItemType {
  switch (source) {
    case "treatment":
      return "treatment";
    case "service":
      return "service";
    case "product":
      return "product";
    default:
      return "other";
  }
}

export const doctorOrderLineSchema = z
  .object({
    source: sourceSchema,
    catalogItemId: z.string().trim().optional(),
    inventoryItemId: z.string().trim().optional(),
    description: z.string().trim().min(2).max(200),
    unitPrice: moneyString,
    discount: moneyString,
    quantity: z.coerce.number().int().positive().max(999).default(1),
    sessionCount: z.coerce.number().int().positive().max(999).optional(),
    pricingMode: z
      .enum(["package", "per_session"])
      .optional()
      .or(z.literal("").transform(() => undefined)),
    notes: z
      .string()
      .trim()
      .max(300)
      .transform((value) => (value.length > 0 ? value : undefined))
      .optional()
  })
  .superRefine((line, context) => {
    if ((line.source === "service" || line.source === "treatment") && !line.catalogItemId) {
      context.addIssue({ code: "custom", path: ["catalogItemId"], message: "Falta la oferta." });
    }
    if (line.source === "product" && !line.inventoryItemId) {
      context.addIssue({
        code: "custom",
        path: ["inventoryItemId"],
        message: "Falta el producto."
      });
    }
  });

export const doctorOrderSchema = z.object({
  visitId: z.string().min(1),
  intent: z.enum(["save", "submit"]).default("save"),
  indications: z
    .string()
    .trim()
    .max(700)
    .transform((value) => (value.length > 0 ? value : undefined))
    .optional(),
  lines: z.array(doctorOrderLineSchema).max(50)
});

/** Convierte las columnas paralelas del formulario en objetos de línea. */
export function parseDoctorOrderLines(formData: FormData) {
  const sources = formData.getAll("lineSource").map(String);
  const catalogIds = formData.getAll("lineCatalogItemId").map(String);
  const inventoryIds = formData.getAll("lineInventoryItemId").map(String);
  const descriptions = formData.getAll("lineDescription").map(String);
  const unitPrices = formData.getAll("lineUnitPrice").map(String);
  const discounts = formData.getAll("lineDiscount").map(String);
  const quantities = formData.getAll("lineQuantity").map(String);
  const sessionCounts = formData.getAll("lineSessionCount").map(String);
  const pricingModes = formData.getAll("linePricingMode").map(String);
  const notes = formData.getAll("lineNotes").map(String);

  return sources.map((source, index) => ({
    source,
    catalogItemId: catalogIds[index] || undefined,
    inventoryItemId: inventoryIds[index] || undefined,
    description: descriptions[index] ?? "",
    unitPrice: unitPrices[index] ?? "0",
    discount: discounts[index] ?? "0",
    quantity: quantities[index] ?? "1",
    sessionCount: sessionCounts[index] || undefined,
    pricingMode: pricingModes[index] || undefined,
    notes: notes[index] ?? ""
  }));
}
