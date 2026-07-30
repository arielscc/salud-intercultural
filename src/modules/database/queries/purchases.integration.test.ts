import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { hashPassword } from "@/features/internal-auth/password";
import { prisma } from "@/modules/database";
import {
  createUrgentPurchaseExpense,
  openCashSession
} from "@/modules/database/queries/cash";
import {
  confirmPurchaseRecord,
  createInventoryLotAdjustmentRecord,
  createPurchaseDraftRecord,
  createPurchaseReceiptRecord,
  recordPurchasePayment
} from "@/modules/database/queries/purchases";

async function cleanPurchases() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "PurchaseDocument", "InventoryLotAdjustment", "PurchaseReceiptLine", "InventoryMovement", "InventoryAdjustment", "InventoryLot", "PurchaseReceipt", "PurchasePayment", "PurchaseLine", "Purchase", "CashExpenseBeneficiary", "CashExpense", "CashSessionReconciliation", "CashMovement", "CashSession", "InventoryAlert", "InventoryItemCatalogVersion", "SupplierVersion", "InventoryItemSupplier", "InventoryItem", "Supplier", "InternalSession", "InternalUser" CASCADE'
  );
}

beforeEach(cleanPurchases);
afterEach(cleanPurchases);

async function setup() {
  const passwordHash = await hashPassword("clave-segura-compras-123");
  const [administrator, direction, receiver] = await Promise.all([
    prisma.internalUser.create({
      data: {
        email: `administracion-${randomUUID()}@example.com`,
        name: "Administración",
        passwordHash,
        role: "administracion"
      }
    }),
    prisma.internalUser.create({
      data: {
        email: `direccion-${randomUUID()}@example.com`,
        name: "Dirección",
        passwordHash,
        role: "direccion"
      }
    }),
    prisma.internalUser.create({
      data: {
        email: `recepcion-${randomUUID()}@example.com`,
        name: "Recepción de mercadería",
        passwordHash,
        role: "administracion"
      }
    })
  ]);
  const supplier = await prisma.supplier.create({
    data: { name: "Proveedor de prueba" }
  });
  const item = await prisma.inventoryItem.create({
    data: {
      internalCode: `TEST-${randomUUID().slice(0, 8)}`,
      name: "Producto comprado",
      category: "Pruebas",
      unit: "unidad",
      usage: "both",
      referenceCostCents: 80,
      minimumStock: 2
    }
  });
  const cashSession = await openCashSession({
    branchCode: "el-alto",
    registerName: "Caja principal",
    businessDate: new Date("2026-07-30T00:00:00.000Z"),
    shift: "full_day",
    responsibleId: administrator.id,
    openedById: administrator.id,
    openingCashCents: 10_000,
    idempotencyKey: randomUUID()
  });
  return { administrator, direction, receiver, supplier, item, cashSession };
}

describe("purchase, receipt, batch and stock integration", () => {
  it("keeps credit outside cash, receives partially once and preserves historical cost", async () => {
    const fixture = await setup();
    const purchase = await createPurchaseDraftRecord({
      supplierId: fixture.supplier.id,
      branchCode: "el-alto",
      purchaseDate: new Date("2026-07-30T12:00:00-04:00"),
      currency: "BOB",
      intendedPaymentMethod: "credit",
      idempotencyKey: randomUUID(),
      createdById: fixture.administrator.id,
      lines: [
        {
          itemId: fixture.item.id,
          orderedQuantity: 10,
          unitCostCents: 100
        }
      ]
    });
    await confirmPurchaseRecord({
      purchaseId: purchase.id,
      expectedRevision: 1,
      confirmedById: fixture.administrator.id,
      paymentIdempotencyKey: randomUUID()
    });
    expect(await prisma.purchasePayment.count()).toBe(0);
    expect(await prisma.cashMovement.count()).toBe(0);

    await recordPurchasePayment({
      purchaseId: purchase.id,
      cashSessionId: fixture.cashSession.id,
      method: "transfer",
      amountCents: 500,
      recordedById: fixture.administrator.id,
      idempotencyKey: randomUUID()
    });
    expect(await prisma.purchasePayment.count()).toBe(1);
    expect(await prisma.cashMovement.count()).toBe(1);

    const purchaseLine = await prisma.purchaseLine.findFirstOrThrow({
      where: { purchaseId: purchase.id }
    });
    const receiptKey = randomUUID();
    const firstReceiptInput = {
      purchaseId: purchase.id,
      branchCode: "el-alto",
      locationCode: "Almacén principal",
      receivedAt: new Date("2026-07-30T16:00:00-04:00"),
      receivedById: fixture.receiver.id,
      recordedById: fixture.administrator.id,
      idempotencyKey: receiptKey,
      lines: [
        {
          purchaseLineId: purchaseLine.id,
          quantity: 4,
          unitCostCents: 105,
          batchNumber: "PROV-01",
          expirationDate: new Date("2027-07-30T12:00:00-04:00")
        }
      ]
    };
    const first = await createPurchaseReceiptRecord(firstReceiptInput);
    const reused = await createPurchaseReceiptRecord(firstReceiptInput);
    expect(reused.id).toBe(first.id);
    expect(await prisma.purchaseReceipt.count()).toBe(1);
    expect((await prisma.inventoryItem.findUniqueOrThrow({
      where: { id: fixture.item.id }
    })).currentStock).toBe(4);
    expect((await prisma.purchase.findUniqueOrThrow({
      where: { id: purchase.id }
    })).status).toBe("partially_received");

    await createPurchaseReceiptRecord({
      ...firstReceiptInput,
      idempotencyKey: randomUUID(),
      lines: [{ ...firstReceiptInput.lines[0], quantity: 6, unitCostCents: 110 }]
    });
    await prisma.inventoryItem.update({
      where: { id: fixture.item.id },
      data: { referenceCostCents: 999 }
    });
    const lots = await prisma.inventoryLot.findMany({
      where: { purchaseId: purchase.id },
      orderBy: { createdAt: "asc" }
    });
    expect(lots.map((lot) => lot.unitCostCents)).toEqual([105, 110]);
    expect((await prisma.inventoryItem.findUniqueOrThrow({
      where: { id: fixture.item.id }
    })).currentStock).toBe(10);
    expect((await prisma.purchase.findUniqueOrThrow({
      where: { id: purchase.id }
    })).status).toBe("received");
    expect(await prisma.inventoryMovement.count({
      where: { type: "purchase_receipt" }
    })).toBe(2);

    await createInventoryLotAdjustmentRecord({
      lotId: lots[0].id,
      kind: "damage",
      quantity: 1,
      restocked: false,
      reason: "Envase roto al revisar el almacén",
      recordedById: fixture.administrator.id,
      authorizedById: fixture.direction.id,
      idempotencyKey: randomUUID()
    });
    expect((await prisma.inventoryItem.findUniqueOrThrow({
      where: { id: fixture.item.id }
    })).currentStock).toBe(9);
  });

  it("links an urgent cash expense without creating a second cash movement", async () => {
    const fixture = await setup();
    const expense = await createUrgentPurchaseExpense({
      cashSessionId: fixture.cashSession.id,
      category: "clinical_material",
      itemDescription: "Producto comprado",
      quantity: 2,
      unitPriceCents: 150,
      requestedById: fixture.receiver.id,
      receivedById: fixture.receiver.id,
      deliveredById: fixture.administrator.id,
      registeredById: fixture.administrator.id,
      authorizedById: fixture.direction.id,
      supplierName: fixture.supplier.name,
      urgencyReason: "Faltaba para la atención del día",
      requiresInventoryEntry: true,
      idempotencyKey: randomUUID()
    });
    const movementCount = await prisma.cashMovement.count();
    const purchase = await createPurchaseDraftRecord({
      supplierId: fixture.supplier.id,
      sourceCashExpenseId: expense.id,
      branchCode: "el-alto",
      purchaseDate: new Date("2026-07-30T12:00:00-04:00"),
      currency: "BOB",
      intendedPaymentMethod: "cash",
      idempotencyKey: randomUUID(),
      createdById: fixture.administrator.id,
      lines: [
        {
          itemId: fixture.item.id,
          orderedQuantity: 2,
          unitCostCents: 150
        }
      ]
    });
    await confirmPurchaseRecord({
      purchaseId: purchase.id,
      expectedRevision: 1,
      confirmedById: fixture.administrator.id,
      paymentIdempotencyKey: randomUUID()
    });
    expect(await prisma.cashMovement.count()).toBe(movementCount);
    expect((await prisma.purchasePayment.findFirstOrThrow({
      where: { purchaseId: purchase.id }
    })).cashMovementId).toBe(expense.movementId);
  });
});
