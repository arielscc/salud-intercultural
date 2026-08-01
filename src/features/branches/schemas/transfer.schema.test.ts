import { describe, expect, it } from "vitest";
import { inventoryTransferSchema } from "@/features/branches/schemas/transfer.schema";

const validTransfer = {
  itemId: "item-1",
  sourceBranchCode: "el-alto",
  destinationBranchCode: "cochabamba",
  destinationLocationCode: "Estante CBBA-2",
  quantity: "4",
  reason: "Preparar inventario de apertura",
  idempotencyKey: "7f00b7d2-b563-4bf2-9ee6-b1d8fc6f7a57"
};

describe("inventory transfer schema", () => {
  it("accepts a positive transfer between different branches", () => {
    expect(inventoryTransferSchema.parse(validTransfer).quantity).toBe(4);
  });

  it("rejects a transfer to the same branch", () => {
    expect(
      inventoryTransferSchema.safeParse({
        ...validTransfer,
        destinationBranchCode: "el-alto"
      }).success
    ).toBe(false);
  });

  it("rejects zero or negative stock movements", () => {
    expect(inventoryTransferSchema.safeParse({ ...validTransfer, quantity: "0" }).success).toBe(false);
    expect(inventoryTransferSchema.safeParse({ ...validTransfer, quantity: "-1" }).success).toBe(false);
  });
});
