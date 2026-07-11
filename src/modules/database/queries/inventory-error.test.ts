import { describe, expect, it } from "vitest";
import { DatabaseError } from "@/modules/database/errors";
import {
  findInsufficientStockError,
  InsufficientStockError
} from "@/modules/database/queries/inventory";

describe("inventory stock errors", () => {
  it("finds stock details through wrapped database errors", () => {
    const stockError = new InsufficientStockError("Suero ABC", 2, 3);
    const wrapped = new DatabaseError("Database operation failed: createSaleRecord", stockError);

    expect(findInsufficientStockError(wrapped)).toBe(stockError);
    expect(findInsufficientStockError(wrapped)).toMatchObject({
      itemName: "Suero ABC",
      available: 2,
      requested: 3
    });
  });

  it("ignores unrelated failures", () => {
    expect(findInsufficientStockError(new Error("CONNECTION_FAILED"))).toBeNull();
  });
});
