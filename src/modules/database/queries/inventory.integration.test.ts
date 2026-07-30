import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { hashPassword } from "@/features/internal-auth/password";
import { prisma } from "@/modules/database";
import {
  addInventoryEntryRecord,
  createInventoryAdjustmentRecord,
  createInventoryItemRecord,
  findInsufficientStockError,
  getInventoryItemById,
  getInventorySummary
} from "@/modules/database/queries/inventory";
import { createPatientRecord } from "@/modules/database/queries/patients";
import { createSaleRecord } from "@/modules/database/queries/sales";
import { openCashSession } from "@/modules/database/queries/cash";

async function cleanInventory() {
  await prisma.inventoryMovement.deleteMany();
  await prisma.inventoryAdjustment.deleteMany();
  await prisma.inventoryAlert.deleteMany();
  await prisma.followUpStatusHistory.deleteMany();
  await prisma.followUpAttempt.deleteMany();
  await prisma.followUpTask.deleteMany();
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "CashExpenseBeneficiary", "CashExpense", "CashSessionReconciliation", "CashMovement", "CashSession" CASCADE'
  );
  await prisma.deliveredProduct.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.visit.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.internalSession.deleteMany();
  await prisma.internalUser.deleteMany();
}

beforeEach(cleanInventory);
afterEach(cleanInventory);

describe("inventory integration", () => {
  it("tracks stock movements and automatic sale exits", async () => {
    const user = await prisma.internalUser.create({
      data: {
        email: "inventario@example.com",
        name: "Inventario Test",
        passwordHash: await hashPassword("clave-segura-123"),
        role: "super_admin"
      }
    });
    const patient = await createPatientRecord({
      fullName: "Paciente Inventario",
      phone: "+591 70000066",
      captureSource: "whatsapp"
    });
    const item = await createInventoryItemRecord({
      internalCode: "SI-SUERO-001",
      name: "Suero ABC",
      unit: "frasco",
      minimumStock: 2,
      initialStock: 5,
      userId: user.id
    });
    await openCashSession({
      branchCode: "el-alto",
      registerName: "Caja principal",
      businessDate: new Date("2026-07-30T00:00:00.000Z"),
      shift: "full_day",
      responsibleId: user.id,
      openedById: user.id,
      openingCashCents: 0,
      idempotencyKey: "inventory-sale-session"
    });

    await createSaleRecord({
      patientId: patient.id,
      createdById: user.id,
      itemType: "product",
      inventoryItemId: item.id,
      description: "Suero ABC",
      quantity: 3,
      unitPriceCents: 10000,
      initialPaymentCents: 30000,
      paymentMethodCode: "cash"
    });

    const detail = await getInventoryItemById(item.id);
    const summary = await getInventorySummary();

    expect(detail?.currentStock).toBe(2);
    expect(detail?.movements.map((movement) => movement.type)).toContain("automatic_sale_exit");
    expect(detail?.alerts[0]?.status).toBe("open");
    expect(summary.lowStock).toBe(1);
  });

  it("records entries and authorized manual adjustments", async () => {
    const user = await prisma.internalUser.create({
      data: {
        email: "ajuste-inventario@example.com",
        passwordHash: await hashPassword("clave-segura-123"),
        role: "super_admin"
      }
    });
    const item = await createInventoryItemRecord({
      internalCode: "SI-PROD-002",
      name: "Producto Ajustable",
      minimumStock: 1,
      initialStock: 0,
      userId: user.id
    });

    await addInventoryEntryRecord({
      itemId: item.id,
      userId: user.id,
      quantity: 4,
      reason: "Compra"
    });
    await createInventoryAdjustmentRecord({
      itemId: item.id,
      userId: user.id,
      quantityDelta: -1,
      reason: "Conteo físico"
    });

    const detail = await getInventoryItemById(item.id);

    expect(detail?.currentStock).toBe(3);
    expect(detail?.movements).toHaveLength(2);
    expect(detail?.movements[0]?.type).toBe("authorized_manual_adjustment");
  });

  it("rejects sales above stock and rolls back the complete sale", async () => {
    const user = await prisma.internalUser.create({
      data: {
        email: "inventario-sin-stock@example.com",
        passwordHash: await hashPassword("clave-segura-123"),
        role: "super_admin"
      }
    });
    await openCashSession({
      branchCode: "el-alto",
      registerName: "Caja principal",
      businessDate: new Date("2026-07-30T00:00:00.000Z"),
      shift: "full_day",
      responsibleId: user.id,
      openedById: user.id,
      openingCashCents: 0,
      idempotencyKey: "inventory-no-stock-session"
    });
    const patient = await createPatientRecord({
      fullName: "Paciente Sin Stock",
      phone: "+591 70000067",
      captureSource: "whatsapp"
    });
    const item = await createInventoryItemRecord({
      internalCode: "SI-SUERO-002",
      name: "Suero Escaso",
      initialStock: 2
    });

    let failure: unknown;
    try {
      await createSaleRecord({
        patientId: patient.id,
        itemType: "product",
        inventoryItemId: item.id,
        description: "Suero Escaso",
        quantity: 3,
        unitPriceCents: 10000,
        initialPaymentCents: 30000,
        paymentMethodCode: "cash"
      });
    } catch (error) {
      failure = error;
    }

    expect(findInsufficientStockError(failure)).toMatchObject({
      itemName: "Suero Escaso",
      available: 2,
      requested: 3
    });
    expect(await prisma.sale.count()).toBe(0);
    expect(await prisma.payment.count()).toBe(0);
    expect(await prisma.cashMovement.count()).toBe(0);
    expect((await getInventoryItemById(item.id))?.currentStock).toBe(2);
  });
});
