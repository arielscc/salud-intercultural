import { describe, expect, it } from "vitest";
import {
  cashMoneyToCents,
  closeCashSessionSchema,
  openCashSessionSchema,
  urgentPurchaseSchema
} from "@/features/cash/schemas/cash.schema";

describe("cash schemas", () => {
  it("accepts a complete local session opening", () => {
    expect(
      openCashSessionSchema.parse({
        branchCode: "el-alto",
        registerName: "Caja principal",
        businessDate: "2026-07-30",
        shift: "full_day",
        responsibleId: "user-1",
        openingCash: "150.50",
        idempotencyKey: "9752389d-e660-42e0-9fdd-957f9b3cfa86"
      })
    ).toMatchObject({ branchCode: "el-alto", openingCash: "150.50" });
  });

  it("rejects missing reconciliation channels", () => {
    expect(
      closeCashSessionSchema.safeParse({
        cashSessionId: "session-1",
        cash: "100.00",
        qr: "0.00"
      }).success
    ).toBe(false);
  });

  it("normalizes the inventory flag and exact cents", () => {
    const purchase = urgentPurchaseSchema.parse({
      cashSessionId: "session-1",
      category: "clinical_material",
      itemDescription: "Jeringas",
      quantity: "3",
      unitPrice: "4.25",
      requestedById: "user-1",
      receivedById: "user-2",
      deliveredById: "user-3",
      authorizedById: "user-4",
      urgencyReason: "Se acabó el material de atención",
      requiresInventoryEntry: "on",
      idempotencyKey: "9752389d-e660-42e0-9fdd-957f9b3cfa86"
    });

    expect(purchase.requiresInventoryEntry).toBe(true);
    expect(cashMoneyToCents(purchase.unitPrice)).toBe(425);
  });
});
