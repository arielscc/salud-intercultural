import { z } from "zod";

const selected = z.preprocess((value) => value === "on", z.boolean());
const optionalPrice = z.preprocess(
  (value) => (value === undefined || value === "" ? undefined : value),
  z.string().trim().regex(/^\d+(\.\d{1,2})?$/, "Precio inválido").optional()
);
const money = z.string().trim().regex(/^\d+(\.\d{1,2})?$/, "Monto inválido");

export const paidStudyOrderSchema = z
  .object({
    visitId: z.string().min(1),
    details: z.string().trim().max(800).optional(),
    discount: money,
    hemogram: selected,
    hemogramPrice: optionalPrice,
    hemogramResonance: selected,
    hemogramResonancePrice: optionalPrice,
    resonance: selected,
    resonancePrice: optionalPrice,
    urine: selected,
    urinePrice: optionalPrice
  })
  .superRefine((value, context) => {
    const selections = [
      [value.hemogram, value.hemogramPrice, "hemogramPrice"],
      [value.hemogramResonance, value.hemogramResonancePrice, "hemogramResonancePrice"],
      [value.resonance, value.resonancePrice, "resonancePrice"],
      [value.urine, value.urinePrice, "urinePrice"]
    ] as const;
    if (!selections.some(([isSelected]) => isSelected)) {
      context.addIssue({ code: "custom", message: "Selecciona al menos un análisis" });
    }
    selections.forEach(([isSelected, price, path]) => {
      if (isSelected && !price) {
        context.addIssue({ code: "custom", path: [path], message: "Indica el precio" });
      }
    });
  });

export type PaidStudyOrderInput = z.infer<typeof paidStudyOrderSchema>;

