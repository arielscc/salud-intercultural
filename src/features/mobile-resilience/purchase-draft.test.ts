import { describe, expect, it } from "vitest";
import { parseSafePurchaseDraft } from "@/features/mobile-resilience/purchase-draft";

const validDraft = {
  version: 2,
  idempotencyKey: "53dcd132-d914-4be2-9e44-a4905fe42f3d",
  purchaseDate: "2026-08-01",
  sourceCashExpenseId: "",
  documentNumber: "F-123",
  intendedPaymentMethod: "credit",
  notes: "Entrega mañana",
  lines: [
    {
      id: 0,
      itemMode: "existing",
      itemId: "item_1",
      supplierId: "supplier_1",
      associatedSupplierIds: ["supplier_1"],
      quantity: "2",
      cost: "30",
      newProduct: {
        internalCode: "",
        sku: "",
        name: "",
        description: "",
        category: "Sin categoría",
        unit: "unidad",
        usage: "both",
        salePrice: "0",
        referenceCost: "0",
        minimumStock: "0"
      }
    }
  ],
  savedAt: 1_754_000_000_000
};

describe("safe purchase draft", () => {
  it("restores only the approved operational fields", () => {
    expect(parseSafePurchaseDraft(JSON.stringify(validDraft))).toMatchObject({
      lines: [{ itemId: "item_1", supplierId: "supplier_1", quantity: "2" }]
    });
  });

  it("migrates an existing single-supplier draft to supplier-per-line", () => {
    const legacy = {
      version: 1,
      idempotencyKey: validDraft.idempotencyKey,
      purchaseDate: validDraft.purchaseDate,
      supplierId: "supplier_legacy",
      sourceCashExpenseId: "",
      documentNumber: "",
      intendedPaymentMethod: "credit",
      notes: "",
      lines: [{ id: 0, itemId: "item_1", quantity: "3", cost: "12" }],
      savedAt: validDraft.savedAt
    };

    expect(parseSafePurchaseDraft(JSON.stringify(legacy))).toMatchObject({
      version: 2,
      lines: [
        {
          itemMode: "existing",
          itemId: "item_1",
          supplierId: "supplier_legacy",
          associatedSupplierIds: ["supplier_legacy"]
        }
      ]
    });
  });

  it("rejects unknown fields so clinical or patient data cannot enter the draft", () => {
    expect(
      parseSafePurchaseDraft(
        JSON.stringify({ ...validDraft, patientName: "Dato no permitido" })
      )
    ).toBeNull();
  });

  it("rejects malformed or oversized drafts", () => {
    expect(parseSafePurchaseDraft("not-json")).toBeNull();
    expect(
      parseSafePurchaseDraft(
        JSON.stringify({ ...validDraft, notes: "x".repeat(1001) })
      )
    ).toBeNull();
  });
});
