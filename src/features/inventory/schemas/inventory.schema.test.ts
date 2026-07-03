import { describe, expect, it } from "vitest";
import {
  createInventoryItemSchema,
  inventoryAdjustmentSchema,
  inventoryEntrySchema
} from "@/features/inventory/schemas/inventory.schema";

describe("inventory schemas", () => {
  it("validates product creation input", () => {
    expect(
      createInventoryItemSchema.parse({
        internalCode: "SI-PROD-001",
        name: "Suero ABC",
        unit: "frasco",
        minimumStock: "5",
        initialStock: "12"
      })
    ).toMatchObject({
      internalCode: "SI-PROD-001",
      minimumStock: 5,
      initialStock: 12
    });
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
