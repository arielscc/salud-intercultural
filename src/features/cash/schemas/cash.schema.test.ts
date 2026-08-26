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

  it("accepts only cash and QR reconciliation channels", () => {
    const parsed = closeCashSessionSchema.parse({
      cashSessionId: "session-1",
      cash: "100.00",
      qr: "0.00",
      card: "0.00"
    });

    expect(parsed).toEqual({
      cashSessionId: "session-1",
      cash: "100.00",
      qr: "0.00"
    });
  });

  it("normalizes urgent purchase amounts", () => {
    const purchase = urgentPurchaseSchema.parse({
      cashSessionId: "session-1",
      category: "clinical_material",
      itemDescription: "2 jeringas, 1 algodón",
      deliveredAmount: "50.00",
      returnedChange: "25.00",
      requestedById: "user-1",
      receivedById: "user-2",
      deliveredById: "user-3",
      authorizedById: "user-4",
      urgencyReason: "Se acabó el material de atención",
      idempotencyKey: "9752389d-e660-42e0-9fdd-957f9b3cfa86"
    });

    expect(cashMoneyToCents(purchase.deliveredAmount)).toBe(5_000);
    expect(cashMoneyToCents(purchase.returnedChange)).toBe(2_500);
  });
});
