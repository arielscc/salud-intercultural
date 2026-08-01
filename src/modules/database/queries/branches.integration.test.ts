import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/modules/database";
import { getBranchComparisonReport } from "@/modules/database/queries/branches";
import {
  createInventoryItemRecord,
  createInventoryTransferRecord
} from "@/modules/database/queries/inventory";
import {
  confirmPurchaseRecord,
  createPurchaseDraftRecord,
  createPurchaseReceiptRecord
} from "@/modules/database/queries/purchases";

describe("multi-branch operations", () => {
  beforeEach(async () => {
    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "InventoryTransferLotAllocation", "InventoryTransfer", "InventoryMovement", "BranchInventoryBalance", "InventoryAdjustment", "InventoryAlert", "PurchaseReceiptLine", "InventoryLot", "PurchaseReceipt", "PurchasePayment", "PurchaseLine", "Purchase", "InventoryItemCatalogVersion", "SupplierVersion", "InventoryItemSupplier", "InventoryItem", "Supplier", "Visit", "Patient", "InternalSession", "InternalUser" CASCADE'
    );
    await prisma.clinicBranch.update({
      where: { code: "cochabamba" },
      data: { status: "active" }
    });
  });

  afterAll(async () => {
    await prisma.clinicBranch.update({
      where: { code: "cochabamba" },
      data: { status: "preparation" }
    });
  });

  it("moves stock with linked exit and entry while preserving the total", async () => {
    const user = await prisma.internalUser.create({
      data: {
        email: "branch-transfer@example.invalid",
        passwordHash: "not-used-in-integration-test",
        role: "administracion"
      }
    });
    const item = await createInventoryItemRecord({
      internalCode: "BRANCH-ITEM-1",
      name: "Producto multi-sucursal",
      initialStock: 10,
      branchCode: "el-alto",
      userId: user.id
    });

    const transfer = await createInventoryTransferRecord({
      itemId: item.id,
      sourceBranchCode: "el-alto",
      destinationBranchCode: "cochabamba",
      destinationLocationCode: "Depósito general",
      quantity: 4,
      reason: "Validación de apertura",
      createdById: user.id,
      idempotencyKey: "7d8678ea-cfb2-4ec6-8261-68d8375cc6bb"
    });

    const [source, destination, currentItem] = await Promise.all([
      prisma.branchInventoryBalance.findUniqueOrThrow({
        where: { itemId_branchCode: { itemId: item.id, branchCode: "el-alto" } }
      }),
      prisma.branchInventoryBalance.findUniqueOrThrow({
        where: { itemId_branchCode: { itemId: item.id, branchCode: "cochabamba" } }
      }),
      prisma.inventoryItem.findUniqueOrThrow({ where: { id: item.id } })
    ]);

    expect(source.currentStock).toBe(6);
    expect(destination.currentStock).toBe(4);
    expect(currentItem.currentStock).toBe(10);
    expect(transfer.sourceMovement.type).toBe("transfer_out");
    expect(transfer.destinationMovement.type).toBe("transfer_in");
  });

  it("moves the physical batch and preserves its expiration at the destination", async () => {
    const user = await prisma.internalUser.create({
      data: {
        email: "branch-lot-transfer@example.invalid",
        passwordHash: "not-used-in-integration-test",
        role: "administracion"
      }
    });
    const supplier = await prisma.supplier.create({
      data: { name: "Proveedor de lotes" }
    });
    const item = await createInventoryItemRecord({
      internalCode: "BRANCH-LOT-1",
      name: "Producto con lote",
      branchCode: "el-alto",
      userId: user.id
    });
    const purchase = await createPurchaseDraftRecord({
      supplierId: supplier.id,
      branchCode: "el-alto",
      purchaseDate: new Date("2026-08-01T00:00:00.000Z"),
      currency: "BOB",
      intendedPaymentMethod: "credit",
      idempotencyKey: "f4bb2c37-c62f-4639-9d7d-d54ff6d12961",
      createdById: user.id,
      lines: [
        { itemId: item.id, orderedQuantity: 10, unitCostCents: 1_250 }
      ]
    });
    await confirmPurchaseRecord({
      purchaseId: purchase.id,
      expectedRevision: 1,
      confirmedById: user.id,
      paymentIdempotencyKey: "08e3ab30-523d-454a-93d9-b5a0874b095d"
    });
    const purchaseLine = await prisma.purchaseLine.findFirstOrThrow({
      where: { purchaseId: purchase.id }
    });
    await createPurchaseReceiptRecord({
      purchaseId: purchase.id,
      branchCode: "el-alto",
      locationCode: "Estante LP-1",
      receivedAt: new Date("2026-08-01T15:00:00.000Z"),
      receivedById: user.id,
      recordedById: user.id,
      idempotencyKey: "fcb9f04a-a148-4894-91bf-c96356717325",
      lines: [
        {
          purchaseLineId: purchaseLine.id,
          quantity: 10,
          unitCostCents: 1_250,
          batchNumber: "FAB-2026-08",
          expirationDate: new Date("2027-03-31T00:00:00.000Z")
        }
      ]
    });
    const sourceLotBefore = await prisma.inventoryLot.findFirstOrThrow({
      where: { itemId: item.id, branchCode: "el-alto" }
    });

    const transfer = await createInventoryTransferRecord({
      itemId: item.id,
      sourceBranchCode: "el-alto",
      destinationBranchCode: "cochabamba",
      destinationLocationCode: "Estante CBBA-2",
      quantity: 4,
      reason: "Apertura de la nueva sucursal",
      createdById: user.id,
      idempotencyKey: "f8a8db83-4e71-41a9-b635-eed8bf4f3c02"
    });
    const replay = await createInventoryTransferRecord({
      itemId: item.id,
      sourceBranchCode: "el-alto",
      destinationBranchCode: "cochabamba",
      destinationLocationCode: "Estante CBBA-2",
      quantity: 4,
      reason: "Apertura de la nueva sucursal",
      createdById: user.id,
      idempotencyKey: "f8a8db83-4e71-41a9-b635-eed8bf4f3c02"
    });

    const [sourceLotAfter, destinationLots] = await Promise.all([
      prisma.inventoryLot.findUniqueOrThrow({ where: { id: sourceLotBefore.id } }),
      prisma.inventoryLot.findMany({
        where: { itemId: item.id, branchCode: "cochabamba" }
      })
    ]);
    expect(replay.id).toBe(transfer.id);
    expect(sourceLotAfter.currentQuantity).toBe(6);
    expect(destinationLots).toHaveLength(1);
    expect(destinationLots[0]).toMatchObject({
      batchNumber: "FAB-2026-08",
      locationCode: "Estante CBBA-2",
      currentQuantity: 4,
      receivedQuantity: 4,
      unitCostCents: 1_250
    });
    expect(destinationLots[0]?.expirationDate?.toISOString()).toBe(
      "2027-03-31T00:00:00.000Z"
    );
    expect(transfer.lotAllocations).toHaveLength(1);
    expect(transfer.lotAllocations[0]).toMatchObject({
      sourceLotId: sourceLotBefore.id,
      destinationLotId: destinationLots[0]?.id,
      quantity: 4
    });
  });

  it("keeps synthetic Cochabamba visits outside the real consolidated result", async () => {
    const patient = await prisma.patient.create({
      data: {
        internalCode: "QA-BRANCH-PATIENT",
        fullName: "Paciente de prueba",
        phone: "00000000"
      }
    });
    await prisma.visit.createMany({
      data: [
        {
          patientId: patient.id,
          branchCode: "el-alto",
          isTestData: false,
          originCity: "El Alto",
          originCountry: "Bolivia"
        },
        {
          patientId: patient.id,
          branchCode: "cochabamba",
          isTestData: true,
          originCity: "Cochabamba",
          originCountry: "Bolivia"
        }
      ]
    });

    const report = await getBranchComparisonReport("direccion");
    const cochabamba = report.rows.find((row) => row.branch.code === "cochabamba");

    expect(report.consolidated.visits).toBe(1);
    expect(cochabamba).toMatchObject({ visits: 0, syntheticVisits: 1 });
  });
});
