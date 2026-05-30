import { describe, expect, it } from "vitest";
import { createPaymentSchema, createSaleSchema, moneyToCents } from "@/features/sales/schemas/sale.schema";

describe("sale schemas", () => {
  it("validates sale input and converts money to cents", () => {
    const parsed = createSaleSchema.parse({
      patientId: "patient_1",
      visitId: "visit_1",
      itemType: "serum",
      description: "Suero ABC",
      quantity: "2",
      unitPrice: "120.50",
      discount: "10.00",
      initialPayment: "100.00",
      paymentMethodCode: "qr"
    });

    expect(parsed.quantity).toBe(2);
    expect(moneyToCents(parsed.unitPrice)).toBe(12050);
    expect(moneyToCents(parsed.discount)).toBe(1000);
  });

  it("validates payment input", () => {
    expect(
      createPaymentSchema.parse({
        saleId: "sale_1",
        amount: "50.00",
        paymentMethodCode: "cash"
      })
    ).toMatchObject({
      saleId: "sale_1",
      amount: "50.00",
      paymentMethodCode: "cash"
    });
  });

  it("rejects invalid money values", () => {
    expect(() =>
      createSaleSchema.parse({
        patientId: "patient_1",
        description: "Consulta",
        unitPrice: "10.999"
      })
    ).toThrow();
  });
});
