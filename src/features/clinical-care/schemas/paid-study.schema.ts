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
  studies: z
    .array(
      z.object({
        catalogItemId: z.string().min(1),
        price: money
      })
    )
    .min(1, "Selecciona al menos un estudio")
    .max(30)
    .refine(
      (studies) => new Set(studies.map((study) => study.catalogItemId)).size === studies.length,
      "No puedes seleccionar el mismo estudio más de una vez"
    )
});

export type PaidStudyOrderInput = z.infer<typeof paidStudyOrderSchema>;

/** Arma la lista de estudios seleccionados desde las columnas paralelas del formulario. */
export function parsePaidStudyForm(formData: FormData) {
  const catalogItemIds = formData.getAll("studyCatalogItemId").map(String);
  const prices = formData.getAll("studyPrice").map(String);
  return {
    visitId: String(formData.get("visitId") ?? ""),
    details: String(formData.get("details") ?? ""),
    discount: String(formData.get("discount") ?? "0"),
    studies: catalogItemIds.map((catalogItemId, index) => ({
      catalogItemId,
      price: prices[index] ?? "0"
    }))
  };
}
