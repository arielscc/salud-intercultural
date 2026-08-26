import { describe, expect, it } from "vitest";
import { parseSafePurchaseDraft } from "@/features/mobile-resilience/purchase-draft";

const validDraft = {
  version: 1,
  idempotencyKey: "53dcd132-d914-4be2-9e44-a4905fe42f3d",
  purchaseDate: "2026-08-01",
  supplierId: "supplier_1",
  sourceCashExpenseId: "",
  documentNumber: "F-123",
  intendedPaymentMethod: "credit",
  notes: "Entrega mañana",
  lines: [{ id: 0, itemId: "item_1", quantity: "2", cost: "30" }],
  savedAt: 1_754_000_000_000
};

describe("safe purchase draft", () => {
  it("restores only the approved operational fields", () => {
    expect(parseSafePurchaseDraft(JSON.stringify(validDraft))).toMatchObject({
      supplierId: "supplier_1",
      lines: [{ itemId: "item_1", quantity: "2" }]
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
