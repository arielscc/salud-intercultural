import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/modules/database";
import { getBranchComparisonReport } from "@/modules/database/queries/branches";
import {
  createInventoryItemRecord,
  createInventoryTransferRecord
} from "@/modules/database/queries/inventory";

describe("multi-branch operations", () => {
  beforeEach(async () => {
    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "InventoryTransfer", "InventoryMovement", "BranchInventoryBalance", "InventoryAdjustment", "InventoryAlert", "InventoryItemCatalogVersion", "InventoryItem", "Visit", "Patient", "InternalSession", "InternalUser" CASCADE'
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
