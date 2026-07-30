import { describe, expect, it } from "vitest";
import {
  createInventoryItemSchema,
  inventoryItemSuppliersSchema,
  inventoryMoneyToCents,
  inventoryAdjustmentSchema,
  inventoryEntrySchema,
  updateInventoryItemSchema
} from "@/features/inventory/schemas/inventory.schema";

describe("inventory schemas", () => {
  it("validates product creation input", () => {
    expect(
      createInventoryItemSchema.parse({
        internalCode: "SI-PROD-001",
        name: "Suero ABC",
        category: "Sueros",
        usage: "both",
        salePrice: "120,50",
        referenceCost: "80.25",
        unit: "frasco",
        minimumStock: "5",
        initialStock: "12"
      })
    ).toMatchObject({
      internalCode: "SI-PROD-001",
      usage: "both",
      minimumStock: 5,
      initialStock: 12
    });
    expect(inventoryMoneyToCents("120,50")).toBe(12_050);
    expect(inventoryMoneyToCents("80.25")).toBe(8_025);
  });

  it("validates versioned edits and preferred supplier membership", () => {
    expect(
      updateInventoryItemSchema.parse({
        itemId: "item_1",
        expectedRevision: "2",
        name: "Suero ABC",
        category: "Sueros",
        unit: "frasco",
        usage: "sale",
        salePrice: "120",
        referenceCost: "80",
        minimumStock: "4",
        changeReason: "Cambio de precio"
      })
    ).toMatchObject({ expectedRevision: 2, usage: "sale" });

    expect(() =>
      inventoryItemSuppliersSchema.parse({
        itemId: "item_1",
        expectedRevision: 1,
        supplierIds: ["supplier_1"],
        preferredSupplierId: "supplier_2",
        changeReason: "Actualización"
      })
    ).toThrow();
  });

  it("validates entry and rejects zero adjustment", () => {
    expect(
      inventoryEntrySchema.parse({
        itemId: "item_1",
        quantity: "3",
        reason: "Compra"
      })
    ).toMatchObject({ quantity: 3 });

    expect(() =>
      inventoryAdjustmentSchema.parse({
        itemId: "item_1",
        quantityDelta: "0",
        reason: "Conteo"
      })
    ).toThrow();
  });
});
