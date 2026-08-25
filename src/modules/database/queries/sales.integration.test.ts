import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { hashPassword } from "@/features/internal-auth/password";
import { prisma } from "@/modules/database";
import { createClinicalOrderRecord } from "@/modules/database/queries/clinical-care";
import { createPatientRecord, getPatientById } from "@/modules/database/queries/patients";
import {
  countSales,
  createPaymentRecord,
  createSaleOrderRecord,
  createSaleRecord,
  getAdministrationWorkItems,
  getSaleById,
  getSalesPage,
  getSalesPageTotals,
  getSalesSummary
} from "@/modules/database/queries/sales";
import { openCashSession } from "@/modules/database/queries/cash";
import { createVisitRecord } from "@/modules/database/queries/visits";

async function cleanSales() {
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
  await prisma.nursingWorkItemResult.deleteMany();
  await prisma.nursingApplication.deleteMany();
  await prisma.nursingNote.deleteMany();
  await prisma.vitalSigns.deleteMany();
  await prisma.clinicalAttachmentAccessGrant.deleteMany();
  await prisma.clinicalAttachment.deleteMany();
  await prisma.study.deleteMany();
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "VisitAreaTimeEvent" CASCADE');
  await prisma.visit.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.internalSession.deleteMany();
  await prisma.internalUser.deleteMany();
}

beforeEach(cleanSales);
afterEach(cleanSales);

describe("sales integration", () => {
  it("calculates totals server-side and tracks payments", async () => {
    const admin = await prisma.internalUser.create({
      data: {
        email: "admin-ventas@example.com",
        name: "Admin Ventas",
        passwordHash: await hashPassword("clave-segura-123"),
        role: "administracion"
      }
    });
    const doctor = await prisma.internalUser.create({
      data: {
        email: "medico-ventas@example.com",
        name: "Medico Ventas",
        passwordHash: await hashPassword("clave-segura-123"),
        role: "medico"
      }
    });
    const patient = await createPatientRecord({
      fullName: "Paciente Ventas",
      phone: "+591 70000044",
      captureSource: "whatsapp"
    });
    await openCashSession({
      branchCode: "el-alto",
      registerName: "Caja principal",
      businessDate: new Date("2026-07-30T00:00:00.000Z"),
      shift: "full_day",
      responsibleId: admin.id,
      openedById: admin.id,
      openingCashCents: 0,
      idempotencyKey: "sales-test-cash-session"
    });
    const visit = await createVisitRecord({
      patientId: patient.id,
      userId: admin.id,
      reason: "Administrar tratamiento"
    });

    await createClinicalOrderRecord({
      visitId: visit.id,
      doctorId: doctor.id,
      type: "administration",
      targetArea: "administracion",
      title: "Cobrar tratamiento",
      details: "Cobro de servicio indicado"
    });

    const workItem = (await getAdministrationWorkItems())[0];
    const sale = await createSaleRecord({
      idempotencyKey: "sale-mobile-retry",
      patientId: patient.id,
      visitId: visit.id,
      workItemId: workItem.id,
      createdById: admin.id,
      itemType: "treatment",
      description: "Tratamiento mensual",
      quantity: 2,
      unitPriceCents: 10000,
      discountCents: 2000,
      initialPaymentCents: 5000,
      paymentMethodCode: "cash"
    });
    const retriedSale = await createSaleRecord({
      idempotencyKey: "sale-mobile-retry",
      patientId: patient.id,
      visitId: visit.id,
      workItemId: workItem.id,
      createdById: admin.id,
      itemType: "treatment",
      description: "Tratamiento mensual",
      quantity: 2,
      unitPriceCents: 10000,
      discountCents: 2000,
      initialPaymentCents: 5000,
      paymentMethodCode: "cash"
    });

    await createPaymentRecord({
      idempotencyKey: "payment-mobile-retry",
      saleId: sale.id,
      receivedById: admin.id,
      amountCents: 13000,
      paymentMethodCode: "qr",
      reference: "QR-001"
    });
    await createPaymentRecord({
      idempotencyKey: "payment-mobile-retry",
      saleId: sale.id,
      receivedById: admin.id,
      amountCents: 13000,
      paymentMethodCode: "qr",
      reference: "QR-001"
    });

    const detail = await getSaleById(sale.id);
    const summary = await getSalesSummary();
    const patientDetail = await getPatientById(patient.id);

    expect(detail).toMatchObject({
      subtotalCents: 20000,
      discountCents: 2000,
      totalCents: 18000,
      paidCents: 18000,
      balanceCents: 0,
      status: "paid"
    });
    expect(retriedSale.id).toBe(sale.id);
    expect(detail?.payments).toHaveLength(2);
    expect(summary.todaySales._sum.paidCents).toBeGreaterThanOrEqual(18000);
    expect(patientDetail?.sales[0]?.id).toBe(sale.id);
  });
});

describe("venta de mostrador sin visita", () => {
  async function counterSaleFixture() {
    const admin = await prisma.internalUser.create({
      data: {
        email: "admin-mostrador@example.com",
        name: "Admin Mostrador",
        passwordHash: await hashPassword("clave-segura-123"),
        role: "administracion"
      }
    });
    const client = await createPatientRecord({
      fullName: "Cliente Mostrador",
      phone: "70000055"
    });
    await openCashSession({
      branchCode: "el-alto",
      registerName: "Caja principal",
      businessDate: new Date("2026-08-24T00:00:00.000Z"),
      shift: "full_day",
      responsibleId: admin.id,
      openedById: admin.id,
      openingCashCents: 0,
      idempotencyKey: "counter-sale-cash-session"
    });

    return { admin, client };
  }

  it("registra la venta sin visita ni tarea administrativa", async () => {
    const { admin, client } = await counterSaleFixture();

    const sale = await createSaleOrderRecord({
      idempotencyKey: "counter-sale-1",
      patientId: client.id,
      createdById: admin.id,
      branchCode: "el-alto",
      subtotalCents: 15000,
      discountCents: 0,
      lines: [
        { itemType: "service", description: "Consulta de control", quantity: 1, unitPriceCents: 15000 }
      ]
    });

    expect(sale.visitId).toBeNull();
    expect(sale.workItemId).toBeNull();
    expect(sale.totalCents).toBe(15000);
    expect(sale.balanceCents).toBe(15000);
  });

  it("no duplica la venta al reintentar con la misma clave", async () => {
    const { admin, client } = await counterSaleFixture();
    const input = {
      idempotencyKey: "counter-sale-retry",
      patientId: client.id,
      createdById: admin.id,
      branchCode: "el-alto",
      subtotalCents: 8000,
      discountCents: 0,
      lines: [
        { itemType: "service" as const, description: "Curación", quantity: 1, unitPriceCents: 8000 }
      ]
    };

    const first = await createSaleOrderRecord(input);
    const retried = await createSaleOrderRecord(input);

    expect(retried.id).toBe(first.id);
    expect(await prisma.sale.count({ where: { patientId: client.id } })).toBe(1);
  });

  it("cobra en Caja y deja el movimiento, sin visita asociada", async () => {
    const { admin, client } = await counterSaleFixture();
    const sale = await createSaleOrderRecord({
      idempotencyKey: "counter-sale-paid",
      patientId: client.id,
      createdById: admin.id,
      branchCode: "el-alto",
      subtotalCents: 12000,
      discountCents: 2000,
      lines: [
        { itemType: "service", description: "Sesión suelta", quantity: 1, unitPriceCents: 12000 }
      ]
    });

    await createPaymentRecord({
      idempotencyKey: "counter-payment-1",
      saleId: sale.id,
      amountCents: 10000,
      paymentMethodCode: "cash",
      receivedById: admin.id
    });

    const stored = await getSaleById(sale.id);
    expect(stored?.status).toBe("paid");
    expect(stored?.balanceCents).toBe(0);

    const movements = await prisma.cashMovement.findMany({ where: { saleId: sale.id } });
    expect(movements).toHaveLength(1);
    expect(movements[0]?.visitId).toBeNull();
    expect(movements[0]?.amountCents).toBe(10000);
  });
});

describe("listado de ventas", () => {
  async function salesFixture() {
    const admin = await prisma.internalUser.create({
      data: {
        email: "admin-listado@example.com",
        name: "Admin Listado",
        passwordHash: await hashPassword("clave-segura-123"),
        role: "administracion"
      }
    });
    const ana = await createPatientRecord({ fullName: "Ana Quispe", phone: "70000061" });
    const luis = await createPatientRecord({ fullName: "Luis Torrez", phone: "70000062" });
    await openCashSession({
      branchCode: "el-alto",
      registerName: "Caja principal",
      businessDate: new Date("2026-08-24T00:00:00.000Z"),
      shift: "full_day",
      responsibleId: admin.id,
      openedById: admin.id,
      openingCashCents: 0,
      idempotencyKey: "sales-list-cash-session"
    });

    const anaSale = await createSaleOrderRecord({
      idempotencyKey: "list-sale-ana",
      patientId: ana.id,
      createdById: admin.id,
      branchCode: "el-alto",
      subtotalCents: 20000,
      discountCents: 0,
      lines: [
        { itemType: "service", description: "Sesión de control", quantity: 1, unitPriceCents: 20000 }
      ]
    });
    const luisSale = await createSaleOrderRecord({
      idempotencyKey: "list-sale-luis",
      patientId: luis.id,
      createdById: admin.id,
      branchCode: "el-alto",
      subtotalCents: 5000,
      discountCents: 0,
      lines: [
        { itemType: "product", description: "Vendas", quantity: 1, unitPriceCents: 5000 }
      ]
    });
    await createPaymentRecord({
      idempotencyKey: "list-payment-luis",
      saleId: luisSale.id,
      amountCents: 5000,
      paymentMethodCode: "cash",
      receivedById: admin.id
    });

    return { admin, ana, luis, anaSale, luisSale };
  }

  it("encuentra la venta por el nombre del cliente", async () => {
    const { ana } = await salesFixture();

    const results = await getSalesPage({ search: "Ana" });

    expect(results).toHaveLength(1);
    expect(results[0]?.patient.id).toBe(ana.id);
    expect(await countSales({ search: "Ana" })).toBe(1);
  });

  it("encuentra la venta por el teléfono del cliente", async () => {
    await salesFixture();

    const results = await getSalesPage({ search: "70000062" });

    expect(results.map((sale) => sale.patient.fullName)).toEqual(["Luis Torrez"]);
  });

  it("separa lo que falta cobrar de lo ya pagado", async () => {
    await salesFixture();

    const pending = await getSalesPage({ status: "pending" });
    const paid = await getSalesPage({ status: "paid" });

    expect(pending.map((sale) => sale.patient.fullName)).toEqual(["Ana Quispe"]);
    expect(paid.map((sale) => sale.patient.fullName)).toEqual(["Luis Torrez"]);
  });

  it("suma los totales del conjunto filtrado, no de la página", async () => {
    await salesFixture();

    const totals = await getSalesPageTotals({});

    expect(totals.totalCents).toBe(25000);
    expect(totals.paidCents).toBe(5000);
    expect(totals.balanceCents).toBe(20000);
  });

  it("coincide con lo que muestra el detalle de cada venta", async () => {
    const { anaSale } = await salesFixture();

    const listed = (await getSalesPage({ search: "Ana" }))[0];
    const detail = await getSaleById(anaSale.id);

    expect(listed?.totalCents).toBe(detail?.totalCents);
    expect(listed?.balanceCents).toBe(detail?.balanceCents);
    expect(listed?.status).toBe(detail?.status);
  });

  it("deja ver los primeros conceptos y cuántos hay en total", async () => {
    const { admin, ana } = await salesFixture();
    await createSaleOrderRecord({
      idempotencyKey: "list-sale-multi",
      patientId: ana.id,
      createdById: admin.id,
      branchCode: "el-alto",
      subtotalCents: 4000,
      discountCents: 0,
      lines: [
        { itemType: "product", description: "Gasas", quantity: 1, unitPriceCents: 1000 },
        { itemType: "product", description: "Alcohol", quantity: 1, unitPriceCents: 1000 },
        { itemType: "product", description: "Jeringa", quantity: 1, unitPriceCents: 1000 },
        { itemType: "product", description: "Guantes", quantity: 1, unitPriceCents: 1000 }
      ]
    });

    const listed = (await getSalesPage({ search: "Ana", pageSize: 1 }))[0];

    expect(listed?.items).toHaveLength(3);
    expect(listed?._count.items).toBe(4);
  });

  it("pagina de la más reciente a la más antigua", async () => {
    await salesFixture();

    const first = await getSalesPage({ page: 1, pageSize: 1 });
    const second = await getSalesPage({ page: 2, pageSize: 1 });

    expect(first).toHaveLength(1);
    expect(second).toHaveLength(1);
    expect(first[0]?.id).not.toBe(second[0]?.id);
    expect(first[0]!.createdAt.getTime()).toBeGreaterThanOrEqual(
      second[0]!.createdAt.getTime()
    );
  });

  it("ignora las ventas de otra sucursal", async () => {
    await salesFixture();

    expect(await countSales({ branchCode: "el-alto" })).toBe(2);
    expect(await countSales({ branchCode: "cochabamba" })).toBe(0);
  });
});
