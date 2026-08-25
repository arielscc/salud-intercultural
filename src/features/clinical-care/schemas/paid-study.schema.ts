import { z } from "zod";

const money = z.string().trim().regex(/^\d+(\.\d{1,2})?$/, "Monto inválido");

export const paidStudyOrderSchema = z.object({
  visitId: z.string().min(1),
  details: z
    .string()
    .trim()
    .max(800)
    .transform((value) => (value.length > 0 ? value : undefined))
    .optional(),
  discount: money,
  // Total editable definido por el médico (base antes de descuento). Opcional
  // de verdad: acepta que el campo llegue vacío y que no llegue. Antes solo
  // aceptaba lo primero, así que un llamador que no mandara la clave fallaba
  // con "Required" pese a que el campo se documenta como opcional.
  total: z
    .string()
    .trim()
    .transform((value) => (value.length > 0 ? value : undefined))
    .optional()
    .pipe(money.optional()),
  studies: z
    .array(
      z
        .object({
          // Ítem del catálogo (estudio/servicio) o producto de inventario.
          // Siempre viene exactamente uno de los dos.
          catalogItemId: z.string().min(1).optional(),
          inventoryItemId: z.string().min(1).optional(),
          price: money,
          quantity: z.coerce.number().int().positive().max(99).default(1)
        })
        .refine(
          (line) => Boolean(line.catalogItemId) !== Boolean(line.inventoryItemId),
          "Cada ítem debe ser de catálogo o de inventario, no ambos"
        )
    )
    .min(1, "Selecciona al menos un estudio")
    .max(30)
    .refine((studies) => {
      const refs = studies.map((study) => study.catalogItemId ?? `inv:${study.inventoryItemId}`);
      return new Set(refs).size === refs.length;
    }, "No puedes seleccionar el mismo ítem más de una vez")
});

export type PaidStudyOrderInput = z.infer<typeof paidStudyOrderSchema>;

/** Arma la lista de ítems seleccionados desde las columnas paralelas del formulario. */
export function parsePaidStudyForm(formData: FormData) {
  // `studyRef` codifica el tipo y el id: "catalog:<id>" o "product:<id>".
  const refs = formData.getAll("studyRef").map(String);
  const prices = formData.getAll("studyPrice").map(String);
  const quantities = formData.getAll("studyQuantity").map(String);
  return {
    visitId: String(formData.get("visitId") ?? ""),
    details: String(formData.get("details") ?? ""),
    discount: String(formData.get("discount") ?? "0"),
    total: String(formData.get("total") ?? ""),
    studies: refs.map((ref, index) => {
      const separator = ref.indexOf(":");
      const kind = separator === -1 ? "catalog" : ref.slice(0, separator);
      const id = separator === -1 ? ref : ref.slice(separator + 1);
      return {
        catalogItemId: kind === "product" ? undefined : id,
        inventoryItemId: kind === "product" ? id : undefined,
        price: prices[index] ?? "0",
        quantity: quantities[index] ?? "1"
      };
    })
  };
}
