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

export const paymentMethodCodeSchema = z.enum(["cash", "qr"]);

export const createSaleSchema = z.object({
  idempotencyKey: z.string().uuid().default(() => crypto.randomUUID()),
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

export const createSaleLineSchema = z.object({
  itemType: saleItemTypeSchema.default("service"),
  inventoryItemId: optionalText,
  description: z.string().trim().min(2).max(180),
  quantity: z.coerce.number().int().positive().max(999).default(1),
  unitPrice: moneyString
});

export const createSaleOrderSchema = z.object({
  idempotencyKey: z.string().uuid().default(() => crypto.randomUUID()),
  patientId: z.string().min(1),
  visitId: optionalText,
  workItemId: optionalText,
  total: moneyString,
  discount: optionalMoneyString,
  notes: optionalText,
  lines: z.array(createSaleLineSchema).min(1)
});

export const createPaymentSchema = z.object({
  idempotencyKey: z.string().uuid().default(() => crypto.randomUUID()),
  saleId: z.string().min(1),
  amount: moneyString,
  paymentMethodCode: paymentMethodCodeSchema.default("cash"),
  reference: optionalText,
  notes: optionalText,
  paidAt: optionalDate
});

export const confirmDoctorOrderSchema = z.object({
  doctorOrderId: z.string().min(1),
  workItemId: optionalText,
  // Descuento adicional que aplica Administración al cobrar (se resta del total
  // definido por el médico). Por defecto 0.
  discount: optionalMoneyString,
  initialPayment: optionalMoneyString,
  paymentMethodCode: paymentMethodCodeSchema.default("cash"),
  paymentReference: optionalText,
  notes: optionalText
});

export const applySaleDiscountSchema = z.object({
  saleId: z.string().min(1),
  workItemId: optionalText,
  discount: moneyString
});

export function moneyToCents(value?: string) {
  if (!value) return 0;
  return Math.round(Number(value) * 100);
}

export function parseSaleOrderForm(formData: FormData) {
  const itemTypes = formData.getAll("lineItemType").map(String);
  const inventoryIds = formData.getAll("lineInventoryItemId").map(String);
  const descriptions = formData.getAll("lineDescription").map(String);
  const prices = formData.getAll("lineUnitPrice").map(String);
  const quantities = formData.getAll("lineQuantity").map(String);

  return {
    idempotencyKey: String(formData.get("idempotencyKey") ?? crypto.randomUUID()),
    patientId: String(formData.get("patientId") ?? ""),
    visitId: String(formData.get("visitId") ?? ""),
    workItemId: String(formData.get("workItemId") ?? ""),
    total: String(formData.get("total") ?? ""),
    discount: String(formData.get("discount") ?? ""),
    notes: String(formData.get("notes") ?? ""),
    lines: descriptions.map((description, index) => ({
      itemType: itemTypes[index],
      inventoryItemId: inventoryIds[index],
      description,
      unitPrice: prices[index],
      quantity: quantities[index]
    }))
  };
}
