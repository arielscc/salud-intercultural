import { describe, expect, it } from "vitest";
import {
  inventoryLotAdjustmentSchema,
  purchaseDraftSchema,
  purchaseLineSchema,
  purchaseMoneyToCents,
  purchaseReceiptLineSchema
} from "@/features/purchases/schemas/purchase.schema";

describe("purchase schemas", () => {
  it("validates a draft and historical line cost", () => {
    expect(
      purchaseDraftSchema.parse({
        supplierId: "supplier_1",
        branchCode: "el-alto",
        purchaseDate: "2026-07-30",
        currency: "BOB",
        intendedPaymentMethod: "credit",
        idempotencyKey: "dc16dd7d-595a-4da4-ac54-f5446f471516"
      })
    ).toMatchObject({ intendedPaymentMethod: "credit" });
    expect(
      purchaseLineSchema.parse({
        itemId: "item_1",
        orderedQuantity: "3",
        unitCost: "82,50"
      })
    ).toMatchObject({ orderedQuantity: 3 });
    expect(purchaseMoneyToCents("82,50")).toBe(8_250);
  });

  it("accepts partial receipt rows and explicit return behavior", () => {
    expect(
      purchaseReceiptLineSchema.parse({
        purchaseLineId: "line_1",
        quantity: "2",
        unitCost: "83",
        batchNumber: "L-2026",
        expirationDate: "2027-07-30"
      })
    ).toMatchObject({ quantity: 2, expirationDate: "2027-07-30" });
    expect(
      inventoryLotAdjustmentSchema.parse({
        lotId: "lot_1",
        kind: "patient_return",
        quantity: "1",
        restocked: "false",
        reason: "Envase abierto",
        authorizedById: "direction_1",
        idempotencyKey: "488a8317-93ce-469a-bccd-6e66824fa4ac"
      })
    ).toMatchObject({ restocked: false });
  });
});
