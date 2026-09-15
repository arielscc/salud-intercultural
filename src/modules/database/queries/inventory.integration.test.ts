import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { hashPassword } from "@/features/internal-auth/password";
import { todayDatabaseDate } from "@/lib/dates";
import { prisma } from "@/modules/database";
import {
  addInventoryEntryRecord,
  createInventoryAdjustmentRecord,
  createInventoryItemRecord,
  createSupplierRecord,
  findInventoryCatalogError,
  findInsufficientStockError,
  getInventoryItemById,
  getInventorySummary,
  getSupplierById,
  setInventoryItemStatusRecord,
  updateInventoryItemRecord,
  updateInventoryItemSuppliersRecord
} from "@/modules/database/queries/inventory";
import { createPatientRecord } from "@/modules/database/queries/patients";
import { createSaleRecord } from "@/modules/database/queries/sales";
import { openCashSession } from "@/modules/database/queries/cash";

/*
 * La Caja abierta debe ser la del día operativo en curso: desde el 2026-08-14
 * una sesión de otro día se rechaza como `session_stale_open`. Las fechas fijas
 * que tenían estas pruebas quedaban viejas con el paso del tiempo, así que se
 * calculan contra el día de hoy.
 */
const businessToday = todayDatabaseDate();
const businessYesterday = new Date(businessToday.getTime() - 24 * 60 * 60 * 1000);


async function cleanInventory() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "PurchaseDocument", "InventoryLotAdjustment", "PurchaseReceiptLine", "InventoryMovement", "InventoryAdjustment", "InventoryLot", "PurchaseReceipt", "PurchasePayment", "PurchaseLine", "Purchase" CASCADE'
  );
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
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "InventoryItemCatalogVersion", "SupplierVersion", "InventoryItemSupplier", "InventoryItem", "Supplier" CASCADE'
  );
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "VisitAreaTimeEvent" CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "Patient" CASCADE');
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
        platformRole: "super_admin"
      }
    });
    const patient = await createPatientRecord({
      branchCode: "el-alto",
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
      branchCode: "el-alto",
      userId: user.id
    });
    await openCashSession({
      branchCode: "el-alto",
      registerName: "Caja principal",
      businessDate: businessToday,
      shift: "full_day",
      responsibleId: user.id,
      openedById: user.id,
      openingCashCents: 0,
      idempotencyKey: "inventory-sale-session"
    });

    await createSaleRecord({
      patientId: patient.id,
      branchCode: "el-alto",
      createdById: user.id,
      itemType: "product",
      inventoryItemId: item.id,
      description: "Suero ABC",
      quantity: 3,
      unitPriceCents: 10000,
      initialPaymentCents: 30000,
      paymentMethodCode: "cash"
    });

    const detail = await getInventoryItemById(item.id, "el-alto");
    const summary = await getInventorySummary("el-alto");

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
        platformRole: "super_admin"
      }
    });
    const item = await createInventoryItemRecord({
      branchCode: "el-alto",
      internalCode: "SI-PROD-002",
      name: "Producto Ajustable",
      minimumStock: 1,
      initialStock: 0,
      userId: user.id
    });

    await addInventoryEntryRecord({
      idempotencyKey: "entry-mobile-retry",
      itemId: item.id,
      userId: user.id,
      branchCode: "el-alto",
      quantity: 4,
      reason: "Compra"
    });
    await addInventoryEntryRecord({
      idempotencyKey: "entry-mobile-retry",
      itemId: item.id,
      userId: user.id,
      branchCode: "el-alto",
      quantity: 4,
      reason: "Compra"
    });
    await createInventoryAdjustmentRecord({
      idempotencyKey: "adjustment-mobile-retry",
      itemId: item.id,
      userId: user.id,
      branchCode: "el-alto",
      quantityDelta: -1,
      reason: "Conteo físico"
    });
    await createInventoryAdjustmentRecord({
      idempotencyKey: "adjustment-mobile-retry",
      itemId: item.id,
      userId: user.id,
      branchCode: "el-alto",
      quantityDelta: -1,
      reason: "Conteo físico"
    });

    const detail = await getInventoryItemById(item.id, "el-alto");

    expect(detail?.currentStock).toBe(3);
    expect(detail?.movements).toHaveLength(2);
    expect(detail?.movements[0]?.type).toBe("authorized_manual_adjustment");
  });

  it("rejects sales above stock and rolls back the complete sale", async () => {
    const user = await prisma.internalUser.create({
      data: {
        email: "inventario-sin-stock@example.com",
        passwordHash: await hashPassword("clave-segura-123"),
        platformRole: "super_admin"
      }
    });
    await openCashSession({
      branchCode: "el-alto",
      registerName: "Caja principal",
      businessDate: businessToday,
      shift: "full_day",
      responsibleId: user.id,
      openedById: user.id,
      openingCashCents: 0,
      idempotencyKey: "inventory-no-stock-session"
    });
    const patient = await createPatientRecord({
      branchCode: "el-alto",
      fullName: "Paciente Sin Stock",
      phone: "+591 70000067",
      captureSource: "whatsapp"
    });
    const item = await createInventoryItemRecord({
      internalCode: "SI-SUERO-002",
      name: "Suero Escaso",
      initialStock: 2,
      branchCode: "el-alto"
    });

    let failure: unknown;
    try {
      await createSaleRecord({
        patientId: patient.id,
        branchCode: "el-alto",
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
    expect((await getInventoryItemById(item.id, "el-alto"))?.currentStock).toBe(2);
  });

  it("versions catalog changes and manages several suppliers with one preferred", async () => {
    const user = await prisma.internalUser.create({
      data: {
        email: "catalogo@example.com",
        passwordHash: await hashPassword("clave-segura-123"),
        branchAssignments: {
          create: { branchCode: "el-alto", role: "administracion", active: true, isDefault: true }
        }
      }
    });
    const firstSupplier = await createSupplierRecord({
      branchCode: "el-alto",
      name: "Proveedor Uno",
      whatsapp: "70000001",
      userId: user.id
    });
    const secondSupplier = await createSupplierRecord({
      branchCode: "el-alto",
      name: "Proveedor Dos",
      phone: "22000002",
      userId: user.id
    });
    const item = await createInventoryItemRecord({
      branchCode: "el-alto",
      internalCode: "cat-001",
      sku: "fab-001",
      name: "Producto de catálogo",
      category: "Sueros",
      usage: "both",
      salePriceCents: 12_000,
      referenceCostCents: 8_000,
      minimumStock: 2,
      userId: user.id
    });

    await updateInventoryItemRecord({
      itemId: item.id,
      branchCode: "el-alto",
      expectedRevision: 1,
      sku: "fab-001",
      name: "Producto de catálogo actualizado",
      category: "Sueros",
      unit: "frasco",
      usage: "sale",
      salePriceCents: 13_000,
      referenceCostCents: 8_500,
      minimumStock: 3,
      changeReason: "Nuevo precio de lista",
      userId: user.id
    });
    await updateInventoryItemSuppliersRecord({
      itemId: item.id,
      branchCode: "el-alto",
      expectedRevision: 2,
      supplierIds: [firstSupplier.id, secondSupplier.id],
      preferredSupplierId: secondSupplier.id,
      changeReason: "Se compararon alternativas",
      userId: user.id
    });

    const detail = await getInventoryItemById(item.id, "el-alto");
    expect(detail).toMatchObject({
      internalCode: "CAT-001",
      revision: 3,
      referenceCostCents: 8_500
    });
    expect(detail?.supplierLinks).toHaveLength(2);
    expect(detail?.supplierLinks.filter((link) => link.preferred)).toHaveLength(1);
    expect(detail?.catalogVersions).toHaveLength(2);
  });

  it("shares master identity while keeping supplier and product configuration local", async () => {
    const user = await prisma.internalUser.create({
      data: {
        email: "catalogo-multisucursal@example.com",
        passwordHash: await hashPassword("clave-segura-123"),
        platformRole: "super_admin"
      }
    });
    const supplier = await createSupplierRecord({
      branchCode: "el-alto",
      name: "Proveedor Multisucursal",
      country: "Bolivia",
      phone: "22000001",
      commercialTerms: "Pago a 15 días",
      paymentTermDays: 15,
      userId: user.id
    });
    await createSupplierRecord({
      branchCode: "cochabamba",
      name: "Proveedor Multisucursal",
      country: "Bolivia",
      phone: "44000002",
      commercialTerms: "Pago a 30 días",
      paymentTermDays: 30,
      userId: user.id
    });

    const item = await createInventoryItemRecord({
      branchCode: "el-alto",
      internalCode: "MULTI-001",
      sku: "EA-MULTI-001",
      name: "Producto Multisucursal",
      presentation: "Caja de 10",
      manufacturer: "Laboratorio inicial",
      salePriceCents: 10_000,
      referenceCostCents: 7_000,
      minimumStock: 2,
      supplierIds: [supplier.id],
      preferredSupplierId: supplier.id,
      userId: user.id
    });
    await createInventoryItemRecord({
      branchCode: "cochabamba",
      internalCode: "MULTI-001",
      sku: "CBBA-MULTI-001",
      name: "Producto Multisucursal",
      presentation: "Caja de 10",
      manufacturer: "Laboratorio actualizado",
      salePriceCents: 12_000,
      referenceCostCents: 8_000,
      minimumStock: 5,
      supplierIds: [supplier.id],
      preferredSupplierId: supplier.id,
      userId: user.id
    });

    const [supplierElAlto, supplierCochabamba, itemElAlto, itemCochabamba] =
      await Promise.all([
        getSupplierById(supplier.id, "el-alto"),
        getSupplierById(supplier.id, "cochabamba"),
        getInventoryItemById(item.id, "el-alto"),
        getInventoryItemById(item.id, "cochabamba")
      ]);

    expect(supplierElAlto).toMatchObject({
      id: supplier.id,
      phone: "44000002",
      commercialTerms: "Pago a 15 días",
      paymentTermDays: 15
    });
    expect(supplierCochabamba).toMatchObject({
      id: supplier.id,
      phone: "44000002",
      commercialTerms: "Pago a 30 días",
      paymentTermDays: 30
    });
    expect(supplierElAlto?.versions).toHaveLength(2);
    expect(itemElAlto).toMatchObject({
      id: item.id,
      manufacturer: "Laboratorio actualizado",
      sku: "EA-MULTI-001",
      salePriceCents: 10_000,
      referenceCostCents: 7_000,
      minimumStock: 2
    });
    expect(itemCochabamba).toMatchObject({
      id: item.id,
      manufacturer: "Laboratorio actualizado",
      sku: "CBBA-MULTI-001",
      salePriceCents: 12_000,
      referenceCostCents: 8_000,
      minimumStock: 5
    });
    expect(itemElAlto?.catalogVersions).toHaveLength(2);
  });

  it("keeps balances and low-stock alerts isolated between branches", async () => {
    const item = await createInventoryItemRecord({
      branchCode: "el-alto",
      internalCode: "STOCK-LOCAL-001",
      name: "Producto con saldo local",
      minimumStock: 2,
      initialStock: 1
    });
    await createInventoryItemRecord({
      branchCode: "cochabamba",
      internalCode: "STOCK-LOCAL-001",
      name: "Producto con saldo local",
      minimumStock: 2,
      initialStock: 5
    });

    const [elAltoBefore, cochabambaBefore] = await Promise.all([
      getInventoryItemById(item.id, "el-alto"),
      getInventoryItemById(item.id, "cochabamba")
    ]);
    expect(elAltoBefore?.currentStock).toBe(1);
    expect(elAltoBefore?.alerts.filter((alert) => alert.status === "open")).toHaveLength(1);
    expect(cochabambaBefore?.currentStock).toBe(5);
    expect(cochabambaBefore?.alerts).toHaveLength(0);

    await addInventoryEntryRecord({
      itemId: item.id,
      branchCode: "el-alto",
      quantity: 2,
      reason: "Reposición local"
    });

    const [elAltoAfter, cochabambaAfter, openAlerts] = await Promise.all([
      getInventoryItemById(item.id, "el-alto"),
      getInventoryItemById(item.id, "cochabamba"),
      prisma.inventoryAlert.findMany({ where: { itemId: item.id, status: "open" } })
    ]);
    expect(elAltoAfter?.currentStock).toBe(3);
    expect(cochabambaAfter?.currentStock).toBe(5);
    expect(openAlerts).toHaveLength(0);
  });

  it("prevents stale edits, code changes and deletion while preserving stock history", async () => {
    const item = await createInventoryItemRecord({
      internalCode: "RESERVADO-001",
      name: "Producto reservado",
      usage: "sale",
      initialStock: 4,
      branchCode: "el-alto"
    });

    let staleFailure: unknown;
    try {
      await updateInventoryItemRecord({
        itemId: item.id,
        branchCode: "el-alto",
        expectedRevision: 99,
        name: "Cambio obsoleto",
        category: "General",
        unit: "unidad",
        usage: "sale",
        salePriceCents: 100,
        referenceCostCents: 50,
        minimumStock: 0,
        changeReason: "Edición desde pestaña antigua"
      });
    } catch (error) {
      staleFailure = error;
    }
    expect(findInventoryCatalogError(staleFailure)?.code).toBe("concurrent-update");

    await setInventoryItemStatusRecord({
      itemId: item.id,
      branchCode: "el-alto",
      expectedRevision: 1,
      active: false,
      changeReason: "Producto fuera de catálogo"
    });
    await expect(
      prisma.inventoryItem.update({
        where: { id: item.id },
        data: { internalCode: "NUEVO-CODIGO" }
      })
    ).rejects.toThrow();
    await expect(prisma.inventoryItem.delete({ where: { id: item.id } })).rejects.toThrow();

    const detail = await getInventoryItemById(item.id, "el-alto");
    expect(detail).toMatchObject({ active: false, internalCode: "RESERVADO-001" });
    expect(detail?.movements).toHaveLength(1);
    expect(detail?.catalogVersions).toHaveLength(1);
  });
});
