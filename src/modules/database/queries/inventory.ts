import type {
  InventoryItemUsage,
  InventoryMovementType,
  Prisma
} from "@/generated/prisma/client";
import { randomUUID } from "node:crypto";
import { todayDatabaseDate } from "@/lib/dates";
import { prisma, withDatabaseError } from "@/modules/database";
import { getPagination, type PaginationInput } from "@/modules/database/pagination";

export class InsufficientStockError extends Error {
  constructor(
    public readonly itemName: string,
    public readonly available: number,
    public readonly requested: number
  ) {
    super("INSUFFICIENT_STOCK");
    this.name = "InsufficientStockError";
  }
}

export class InventoryCatalogError extends Error {
  constructor(
    public readonly code:
      | "duplicate-code"
      | "duplicate-sku"
      | "duplicate-supplier"
      | "concurrent-update"
      | "inactive-item"
      | "not-for-sale"
      | "inactive-supplier"
      | "invalid-preferred"
  ) {
    super(code);
    this.name = "InventoryCatalogError";
  }
}

export function findInsufficientStockError(error: unknown): InsufficientStockError | null {
  let current = error;

  while (current instanceof Error) {
    if (current instanceof InsufficientStockError) return current;
    current = "cause" in current ? current.cause : undefined;
  }

  return null;
}

export function findInventoryCatalogError(error: unknown): InventoryCatalogError | null {
  let current = error;

  while (current instanceof Error) {
    if (current instanceof InventoryCatalogError) return current;
    current = "cause" in current ? current.cause : undefined;
  }

  return null;
}

function normalizeCode(value: string) {
  return value.trim().replace(/\s+/g, "-").toUpperCase();
}

function normalizeOptionalCode(value?: string) {
  const normalized = value?.trim().replace(/\s+/g, "-").toUpperCase();
  return normalized || undefined;
}

function normalizeCategory(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function inventoryListWhere(input: {
  search?: string;
  category?: string;
  usage?: InventoryItemUsage | "all";
  status?: "active" | "inactive" | "all";
}): Prisma.InventoryItemWhereInput {
  const normalizedSearch = input.search?.trim();
  const usage =
    input.usage === "sale"
      ? { in: ["sale", "both"] satisfies InventoryItemUsage[] }
      : input.usage === "internal_use"
        ? { in: ["internal_use", "both"] satisfies InventoryItemUsage[] }
        : input.usage && input.usage !== "all"
          ? input.usage
          : undefined;

  return {
    active:
      input.status === "all" || !input.status
        ? undefined
        : input.status === "active",
    category:
      input.category && input.category !== "all"
        ? { equals: input.category, mode: "insensitive" }
        : undefined,
    usage,
    OR: normalizedSearch
      ? [
          { name: { contains: normalizedSearch, mode: "insensitive" } },
          { sku: { contains: normalizedSearch, mode: "insensitive" } },
          { internalCode: { contains: normalizedSearch, mode: "insensitive" } },
          { category: { contains: normalizedSearch, mode: "insensitive" } }
        ]
      : undefined
  };
}

async function syncLowStockAlert(tx: Prisma.TransactionClient, itemId: string) {
  const item = await tx.inventoryItem.findUniqueOrThrow({ where: { id: itemId } });
  const hasLowStock = item.active && item.currentStock <= item.minimumStock;

  if (hasLowStock) {
    const existing = await tx.inventoryAlert.findFirst({
      where: { itemId, status: "open" }
    });

    if (!existing) {
      await tx.inventoryAlert.create({
        data: {
          itemId,
          status: "open",
          message: `${item.name} está en stock bajo (${item.currentStock} ${item.unit}).`
        }
      });
    }
    return;
  }

  await tx.inventoryAlert.updateMany({
    where: { itemId, status: "open" },
    data: { status: "resolved", resolvedAt: new Date() }
  });
}

async function createItemCatalogVersion(
  tx: Prisma.TransactionClient,
  itemId: string,
  input: { userId?: string; changeReason: string }
) {
  const item = await tx.inventoryItem.findUniqueOrThrow({
    where: { id: itemId },
    include: {
      supplierLinks: {
        where: { active: true, supplier: { active: true } },
        include: { supplier: true },
        orderBy: [{ preferred: "desc" }, { supplier: { name: "asc" } }]
      }
    }
  });

  return tx.inventoryItemCatalogVersion.create({
    data: {
      itemId: item.id,
      version: item.revision,
      sku: item.sku,
      internalCode: item.internalCode,
      name: item.name,
      description: item.description,
      category: item.category,
      unit: item.unit,
      usage: item.usage,
      salePriceCents: item.salePriceCents,
      referenceCostCents: item.referenceCostCents,
      minimumStock: item.minimumStock,
      active: item.active,
      supplierSnapshot: item.supplierLinks.map((link) => ({
        supplierId: link.supplierId,
        name: link.supplier.name,
        preferred: link.preferred
      })),
      changedById: input.userId,
      changeReason: input.changeReason
    }
  });
}

async function createSupplierVersion(
  tx: Prisma.TransactionClient,
  supplierId: string,
  input: { userId?: string; changeReason: string }
) {
  const supplier = await tx.supplier.findUniqueOrThrow({ where: { id: supplierId } });

  return tx.supplierVersion.create({
    data: {
      supplierId,
      version: supplier.revision,
      name: supplier.name,
      contactName: supplier.contactName,
      phone: supplier.phone,
      whatsapp: supplier.whatsapp,
      email: supplier.email,
      address: supplier.address,
      notes: supplier.notes,
      active: supplier.active,
      changedById: input.userId,
      changeReason: input.changeReason
    }
  });
}

async function ensureUniqueItemCodes(
  tx: Prisma.TransactionClient,
  input: { itemId?: string; internalCode?: string; sku?: string }
) {
  if (input.internalCode) {
    const duplicateCode = await tx.inventoryItem.findFirst({
      where: {
        id: input.itemId ? { not: input.itemId } : undefined,
        internalCode: { equals: normalizeCode(input.internalCode), mode: "insensitive" }
      },
      select: { id: true }
    });
    if (duplicateCode) throw new InventoryCatalogError("duplicate-code");
  }

  if (input.sku) {
    const duplicateSku = await tx.inventoryItem.findFirst({
      where: {
        id: input.itemId ? { not: input.itemId } : undefined,
        sku: { equals: normalizeOptionalCode(input.sku), mode: "insensitive" }
      },
      select: { id: true }
    });
    if (duplicateSku) throw new InventoryCatalogError("duplicate-sku");
  }
}

export async function applyInventoryMovement(
  tx: Prisma.TransactionClient,
  input: {
    idempotencyKey?: string;
    itemId: string;
    userId?: string;
    saleId?: string;
    saleItemId?: string;
    purchaseId?: string;
    purchaseLineId?: string;
    receiptId?: string;
    receiptLineId?: string;
    lotId?: string;
    lotAdjustmentId?: string;
    branchCode?: string;
    locationCode?: string;
    type: InventoryMovementType;
    quantityDelta: number;
    reason: string;
  }
) {
  const branchCode = input.branchCode ?? "el-alto";
  await tx.$queryRaw`SELECT "id" FROM "InventoryItem" WHERE "id" = ${input.itemId} FOR UPDATE`;
  const item = await tx.inventoryItem.findUniqueOrThrow({ where: { id: input.itemId } });

  await tx.branchInventoryBalance.upsert({
    where: { itemId_branchCode: { itemId: input.itemId, branchCode } },
    create: { itemId: input.itemId, branchCode, currentStock: 0 },
    update: {}
  });
  await tx.$queryRaw`
    SELECT "itemId" FROM "BranchInventoryBalance"
    WHERE "itemId" = ${input.itemId} AND "branchCode" = ${branchCode}
    FOR UPDATE
  `;
  const balance = await tx.branchInventoryBalance.findUniqueOrThrow({
    where: { itemId_branchCode: { itemId: input.itemId, branchCode } }
  });

  if (!item.active) throw new InventoryCatalogError("inactive-item");
  if (input.type === "automatic_sale_exit" && item.usage === "internal_use") {
    throw new InventoryCatalogError("not-for-sale");
  }

  const stockAfter = balance.currentStock + input.quantityDelta;
  if (stockAfter < 0) {
    throw new InsufficientStockError(item.name, balance.currentStock, Math.abs(input.quantityDelta));
  }

  if (input.type === "automatic_sale_exit" && input.quantityDelta < 0) {
    const today = todayDatabaseDate();
    const allLotStock = await tx.inventoryLot.aggregate({
      where: {
        itemId: input.itemId,
        branchCode,
        currentQuantity: { gt: 0 }
      },
      _sum: { currentQuantity: true }
    });
    const lots = await tx.inventoryLot.findMany({
      where: {
        itemId: input.itemId,
        branchCode,
        active: true,
        currentQuantity: { gt: 0 },
        OR: [{ expirationDate: null }, { expirationDate: { gte: today } }]
      },
      orderBy: [
        { expirationDate: { sort: "asc", nulls: "last" } },
        { createdAt: "asc" }
      ]
    });
    let remaining = Math.abs(input.quantityDelta);
    const validLotStock = lots.reduce(
      (sum, lot) => sum + lot.currentQuantity,
      0
    );
    const legacyStock = Math.max(
      0,
      balance.currentStock - (allLotStock._sum.currentQuantity ?? 0)
    );
    const usableStock = validLotStock + legacyStock;
    if (remaining > usableStock) {
      throw new InsufficientStockError(item.name, usableStock, remaining);
    }
    let runningStock = balance.currentStock;
    let lastMovement = null;

    for (const lot of lots) {
      if (remaining === 0) break;
      const quantity = Math.min(lot.currentQuantity, remaining);
      await tx.inventoryLot.update({
        where: { id: lot.id },
        data: {
          currentQuantity: { decrement: quantity },
          active: lot.currentQuantity - quantity > 0
        }
      });
      runningStock -= quantity;
      lastMovement = await tx.inventoryMovement.create({
        data: {
          itemId: input.itemId,
          saleId: input.saleId,
          saleItemId: input.saleItemId,
          lotId: lot.id,
          purchaseId: lot.purchaseId,
          purchaseLineId: lot.purchaseLineId,
          receiptId: lot.receiptId,
          userId: input.userId,
          type: input.type,
          quantityDelta: -quantity,
          stockAfter: runningStock,
          branchCode: lot.branchCode,
          locationCode: lot.locationCode,
          reason: `${input.reason} · FEFO ${lot.internalLotCode}`
        }
      });
      remaining -= quantity;
    }

    if (remaining > 0) {
      runningStock -= remaining;
      lastMovement = await tx.inventoryMovement.create({
        data: {
          itemId: input.itemId,
          saleId: input.saleId,
          saleItemId: input.saleItemId,
          userId: input.userId,
          type: input.type,
          quantityDelta: -remaining,
          stockAfter: runningStock,
          branchCode,
          reason: `${input.reason} · stock anterior sin lote`
        }
      });
    }

    await tx.branchInventoryBalance.update({
      where: { itemId_branchCode: { itemId: input.itemId, branchCode } },
      data: { currentStock: stockAfter }
    });
    await tx.inventoryItem.update({
      where: { id: input.itemId },
      data: { currentStock: { increment: input.quantityDelta } }
    });
    await syncLowStockAlert(tx, input.itemId);
    return lastMovement!;
  }

  await tx.branchInventoryBalance.update({
    where: { itemId_branchCode: { itemId: input.itemId, branchCode } },
    data: { currentStock: stockAfter }
  });
  await tx.inventoryItem.update({
    where: { id: input.itemId },
    data: { currentStock: { increment: input.quantityDelta } }
  });

  const movement = await tx.inventoryMovement.create({
    data: {
      idempotencyKey: input.idempotencyKey,
      itemId: input.itemId,
      saleId: input.saleId,
      saleItemId: input.saleItemId,
      purchaseId: input.purchaseId,
      purchaseLineId: input.purchaseLineId,
      receiptId: input.receiptId,
      receiptLineId: input.receiptLineId,
      lotId: input.lotId,
      lotAdjustmentId: input.lotAdjustmentId,
      userId: input.userId,
      type: input.type,
      quantityDelta: input.quantityDelta,
      stockAfter,
      branchCode,
      locationCode: input.locationCode,
      reason: input.reason
    }
  });

  await syncLowStockAlert(tx, input.itemId);
  return movement;
}

export async function createInventoryItemRecord(input: {
  sku?: string;
  internalCode: string;
  name: string;
  description?: string;
  category?: string;
  unit?: string;
  usage?: InventoryItemUsage;
  salePriceCents?: number;
  referenceCostCents?: number;
  minimumStock?: number;
  initialStock?: number;
  userId?: string;
  branchCode?: string;
}) {
  return withDatabaseError("createInventoryItemRecord", async () =>
    prisma.$transaction(async (tx) => {
      await ensureUniqueItemCodes(tx, input);
      const item = await tx.inventoryItem.create({
        data: {
          sku: normalizeOptionalCode(input.sku),
          internalCode: normalizeCode(input.internalCode),
          name: input.name.trim(),
          description: input.description,
          category: normalizeCategory(input.category ?? "Sin categoría"),
          unit: input.unit ?? "unidad",
          usage: input.usage ?? "both",
          salePriceCents: input.salePriceCents ?? 0,
          referenceCostCents: input.referenceCostCents ?? 0,
          minimumStock: input.minimumStock ?? 0,
          currentStock: 0
        }
      });

      await createItemCatalogVersion(tx, item.id, {
        userId: input.userId,
        changeReason: "Alta inicial del producto"
      });

      if (input.initialStock && input.initialStock > 0) {
        await applyInventoryMovement(tx, {
          itemId: item.id,
          userId: input.userId,
          branchCode: input.branchCode,
          type: "entry",
          quantityDelta: input.initialStock,
          reason: "Stock inicial"
        });
      } else {
        await syncLowStockAlert(tx, item.id);
      }

      return tx.inventoryItem.findUniqueOrThrow({
        where: { id: item.id },
        include: { alerts: { where: { status: "open" } } }
      });
    })
  );
}

export async function updateInventoryItemRecord(input: {
  itemId: string;
  expectedRevision: number;
  sku?: string;
  name: string;
  description?: string;
  category: string;
  unit: string;
  usage: InventoryItemUsage;
  salePriceCents: number;
  referenceCostCents: number;
  minimumStock: number;
  changeReason: string;
  userId?: string;
}) {
  return withDatabaseError("updateInventoryItemRecord", async () =>
    prisma.$transaction(async (tx) => {
      await ensureUniqueItemCodes(tx, { itemId: input.itemId, sku: input.sku });
      const updated = await tx.inventoryItem.updateMany({
        where: { id: input.itemId, revision: input.expectedRevision },
        data: {
          sku: normalizeOptionalCode(input.sku),
          name: input.name.trim(),
          description: input.description,
          category: normalizeCategory(input.category),
          unit: input.unit.trim(),
          usage: input.usage,
          salePriceCents: input.salePriceCents,
          referenceCostCents: input.referenceCostCents,
          minimumStock: input.minimumStock,
          revision: { increment: 1 }
        }
      });
      if (updated.count !== 1) throw new InventoryCatalogError("concurrent-update");

      await syncLowStockAlert(tx, input.itemId);
      await createItemCatalogVersion(tx, input.itemId, input);
      return tx.inventoryItem.findUniqueOrThrow({ where: { id: input.itemId } });
    })
  );
}

export async function setInventoryItemStatusRecord(input: {
  itemId: string;
  expectedRevision: number;
  active: boolean;
  changeReason: string;
  userId?: string;
}) {
  return withDatabaseError("setInventoryItemStatusRecord", async () =>
    prisma.$transaction(async (tx) => {
      const updated = await tx.inventoryItem.updateMany({
        where: { id: input.itemId, revision: input.expectedRevision },
        data: { active: input.active, revision: { increment: 1 } }
      });
      if (updated.count !== 1) throw new InventoryCatalogError("concurrent-update");

      await syncLowStockAlert(tx, input.itemId);
      await createItemCatalogVersion(tx, input.itemId, input);
      return tx.inventoryItem.findUniqueOrThrow({ where: { id: input.itemId } });
    })
  );
}

export async function updateInventoryItemSuppliersRecord(input: {
  itemId: string;
  expectedRevision: number;
  supplierIds: string[];
  preferredSupplierId?: string;
  changeReason: string;
  userId?: string;
}) {
  return withDatabaseError("updateInventoryItemSuppliersRecord", async () =>
    prisma.$transaction(async (tx) => {
      const supplierIds = [...new Set(input.supplierIds)];
      if (input.preferredSupplierId && !supplierIds.includes(input.preferredSupplierId)) {
        throw new InventoryCatalogError("invalid-preferred");
      }
      const activeSuppliers = await tx.supplier.findMany({
        where: { id: { in: supplierIds }, active: true },
        select: { id: true }
      });
      if (activeSuppliers.length !== supplierIds.length) {
        throw new InventoryCatalogError("inactive-supplier");
      }

      const updated = await tx.inventoryItem.updateMany({
        where: { id: input.itemId, revision: input.expectedRevision },
        data: { revision: { increment: 1 } }
      });
      if (updated.count !== 1) throw new InventoryCatalogError("concurrent-update");

      await tx.inventoryItemSupplier.updateMany({
        where: { itemId: input.itemId },
        data: { active: false, preferred: false }
      });
      for (const supplierId of supplierIds) {
        await tx.inventoryItemSupplier.upsert({
          where: { itemId_supplierId: { itemId: input.itemId, supplierId } },
          create: {
            itemId: input.itemId,
            supplierId,
            active: true,
            preferred: supplierId === input.preferredSupplierId
          },
          update: {
            active: true,
            preferred: supplierId === input.preferredSupplierId
          }
        });
      }

      await createItemCatalogVersion(tx, input.itemId, input);
      return tx.inventoryItem.findUniqueOrThrow({ where: { id: input.itemId } });
    })
  );
}

export async function createSupplierRecord(input: {
  name: string;
  contactName?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  notes?: string;
  userId?: string;
}) {
  return withDatabaseError("createSupplierRecord", async () =>
    prisma.$transaction(async (tx) => {
      const duplicate = await tx.supplier.findFirst({
        where: { name: { equals: input.name.trim(), mode: "insensitive" } },
        select: { id: true }
      });
      if (duplicate) throw new InventoryCatalogError("duplicate-supplier");

      const supplier = await tx.supplier.create({
        data: {
          name: input.name.trim(),
          contactName: input.contactName,
          phone: input.phone,
          whatsapp: input.whatsapp,
          email: input.email,
          address: input.address,
          notes: input.notes
        }
      });
      await createSupplierVersion(tx, supplier.id, {
        userId: input.userId,
        changeReason: "Alta inicial del proveedor"
      });
      return supplier;
    })
  );
}

export async function updateSupplierRecord(input: {
  supplierId: string;
  expectedRevision: number;
  name: string;
  contactName?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  notes?: string;
  changeReason: string;
  userId?: string;
}) {
  return withDatabaseError("updateSupplierRecord", async () =>
    prisma.$transaction(async (tx) => {
      const duplicate = await tx.supplier.findFirst({
        where: {
          id: { not: input.supplierId },
          name: { equals: input.name.trim(), mode: "insensitive" }
        },
        select: { id: true }
      });
      if (duplicate) throw new InventoryCatalogError("duplicate-supplier");

      const updated = await tx.supplier.updateMany({
        where: { id: input.supplierId, revision: input.expectedRevision },
        data: {
          name: input.name.trim(),
          contactName: input.contactName,
          phone: input.phone,
          whatsapp: input.whatsapp,
          email: input.email,
          address: input.address,
          notes: input.notes,
          revision: { increment: 1 }
        }
      });
      if (updated.count !== 1) throw new InventoryCatalogError("concurrent-update");

      await createSupplierVersion(tx, input.supplierId, input);
      return tx.supplier.findUniqueOrThrow({ where: { id: input.supplierId } });
    })
  );
}

export async function setSupplierStatusRecord(input: {
  supplierId: string;
  expectedRevision: number;
  active: boolean;
  changeReason: string;
  userId?: string;
}) {
  return withDatabaseError("setSupplierStatusRecord", async () =>
    prisma.$transaction(async (tx) => {
      const updated = await tx.supplier.updateMany({
        where: { id: input.supplierId, revision: input.expectedRevision },
        data: { active: input.active, revision: { increment: 1 } }
      });
      if (updated.count !== 1) throw new InventoryCatalogError("concurrent-update");
      await createSupplierVersion(tx, input.supplierId, input);
      return tx.supplier.findUniqueOrThrow({ where: { id: input.supplierId } });
    })
  );
}

export async function addInventoryEntryRecord(input: {
  idempotencyKey?: string;
  itemId: string;
  userId?: string;
  branchCode?: string;
  quantity: number;
  reason: string;
}) {
  return withDatabaseError("addInventoryEntryRecord", async () =>
    prisma.$transaction(async (tx) => {
      if (input.idempotencyKey) {
        const reused = await tx.inventoryMovement.findUnique({
          where: { idempotencyKey: input.idempotencyKey }
        });
        if (reused) return reused;
      }
      return applyInventoryMovement(tx, {
        idempotencyKey: input.idempotencyKey,
        itemId: input.itemId,
        userId: input.userId,
        branchCode: input.branchCode,
        type: "entry",
        quantityDelta: input.quantity,
        reason: input.reason
      });
    })
  );
}

export async function createInventoryAdjustmentRecord(input: {
  idempotencyKey?: string;
  itemId: string;
  userId?: string;
  branchCode?: string;
  quantityDelta: number;
  reason: string;
}) {
  return withDatabaseError("createInventoryAdjustmentRecord", async () =>
    prisma.$transaction(async (tx) => {
      if (input.idempotencyKey) {
        const reused = await tx.inventoryMovement.findUnique({
          where: { idempotencyKey: input.idempotencyKey }
        });
        if (reused) return reused;
      }
      await tx.inventoryAdjustment.create({
        data: {
          itemId: input.itemId,
          userId: input.userId,
          branchCode: input.branchCode,
          quantityDelta: input.quantityDelta,
          reason: input.reason
        }
      });
      return applyInventoryMovement(tx, {
        idempotencyKey: input.idempotencyKey,
        itemId: input.itemId,
        userId: input.userId,
        branchCode: input.branchCode,
        type: "authorized_manual_adjustment",
        quantityDelta: input.quantityDelta,
        reason: input.reason
      });
    })
  );
}

export class InventoryTransferError extends Error {
  constructor(
    public readonly code:
      | "same-branch"
      | "branch-not-active"
      | "invalid-quantity"
  ) {
    super(code);
    this.name = "InventoryTransferError";
  }
}

export async function createInventoryTransferRecord(input: {
  itemId: string;
  sourceBranchCode: string;
  destinationBranchCode: string;
  quantity: number;
  reason: string;
  createdById: string;
  idempotencyKey: string;
}) {
  return withDatabaseError("createInventoryTransferRecord", () =>
    prisma.$transaction(async (tx) => {
      const reused = await tx.inventoryTransfer.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
        include: { sourceMovement: true, destinationMovement: true }
      });
      if (reused) return reused;
      if (input.sourceBranchCode === input.destinationBranchCode) {
        throw new InventoryTransferError("same-branch");
      }
      if (!Number.isSafeInteger(input.quantity) || input.quantity <= 0) {
        throw new InventoryTransferError("invalid-quantity");
      }

      const branches = await tx.clinicBranch.findMany({
        where: {
          code: { in: [input.sourceBranchCode, input.destinationBranchCode] },
          status: "active"
        },
        select: { code: true }
      });
      if (branches.length !== 2) {
        throw new InventoryTransferError("branch-not-active");
      }

      const sourceMovement = await applyInventoryMovement(tx, {
        idempotencyKey: `transfer-out:${input.idempotencyKey}`,
        itemId: input.itemId,
        userId: input.createdById,
        branchCode: input.sourceBranchCode,
        type: "transfer_out",
        quantityDelta: -input.quantity,
        reason: `Traslado a ${input.destinationBranchCode}: ${input.reason}`
      });
      const destinationMovement = await applyInventoryMovement(tx, {
        idempotencyKey: `transfer-in:${input.idempotencyKey}`,
        itemId: input.itemId,
        userId: input.createdById,
        branchCode: input.destinationBranchCode,
        type: "transfer_in",
        quantityDelta: input.quantity,
        reason: `Traslado desde ${input.sourceBranchCode}: ${input.reason}`
      });

      return tx.inventoryTransfer.create({
        data: {
          transferNumber: `TR-${todayDatabaseDate().toISOString().slice(0, 10).replaceAll("-", "")}-${randomUUID().slice(0, 8).toUpperCase()}`,
          itemId: input.itemId,
          sourceBranchCode: input.sourceBranchCode,
          destinationBranchCode: input.destinationBranchCode,
          quantity: input.quantity,
          reason: input.reason,
          createdById: input.createdById,
          sourceMovementId: sourceMovement.id,
          destinationMovementId: destinationMovement.id,
          idempotencyKey: input.idempotencyKey
        },
        include: { sourceMovement: true, destinationMovement: true }
      });
    })
  );
}

export async function getInventoryTransfers(branchCode?: string) {
  return withDatabaseError("getInventoryTransfers", () =>
    prisma.inventoryTransfer.findMany({
      where: branchCode
        ? { OR: [{ sourceBranchCode: branchCode }, { destinationBranchCode: branchCode }] }
        : undefined,
      include: {
        item: true,
        sourceBranch: true,
        destinationBranch: true,
        createdBy: { select: { id: true, name: true, email: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 50
    })
  );
}

export type InventoryListInput = PaginationInput & {
  search?: string;
  category?: string;
  usage?: InventoryItemUsage | "all";
  status?: "active" | "inactive" | "all";
  branchCode?: string;
};

export async function getInventoryItems(input: InventoryListInput = {}) {
  const pagination = getPagination(input);
  return withDatabaseError("getInventoryItems", async () => {
    const items = await prisma.inventoryItem.findMany({
      where: inventoryListWhere(input),
      include: {
        branchBalances: {
          where: { branchCode: input.branchCode ?? "el-alto" },
          select: { currentStock: true }
        },
        supplierLinks: {
          where: { active: true, supplier: { active: true } },
          include: { supplier: true },
          orderBy: [{ preferred: "desc" }, { supplier: { name: "asc" } }]
        },
        alerts: {
          where: { status: "open" },
          orderBy: { createdAt: "desc" },
          take: 1
        }
      },
      orderBy: [{ active: "desc" }, { name: "asc" }],
      skip: pagination.skip,
      take: pagination.take
    });
    return items.map((item) => ({
      ...item,
      currentStock: item.branchBalances[0]?.currentStock ?? 0
    }));
  });
}

export async function countInventoryItems(input: Omit<InventoryListInput, keyof PaginationInput> = {}) {
  return withDatabaseError("countInventoryItems", () =>
    prisma.inventoryItem.count({ where: inventoryListWhere(input) })
  );
}

export async function getInventoryCategories() {
  return withDatabaseError("getInventoryCategories", async () => {
    const items = await prisma.inventoryItem.findMany({
      distinct: ["category"],
      select: { category: true },
      orderBy: { category: "asc" }
    });
    return items.map((item) => item.category);
  });
}

export async function getInventoryItemById(id: string, branchCode = "el-alto") {
  return withDatabaseError("getInventoryItemById", async () => {
    const item = await prisma.inventoryItem.findUnique({
      where: { id },
      include: {
        branchBalances: {
          where: { branchCode },
          select: { currentStock: true }
        },
        supplierLinks: {
          where: { active: true },
          include: { supplier: true },
          orderBy: [{ preferred: "desc" }, { supplier: { name: "asc" } }]
        },
        catalogVersions: {
          include: { changedBy: { select: { id: true, name: true, email: true } } },
          orderBy: { version: "desc" },
          take: 30
        },
        alerts: { orderBy: { createdAt: "desc" }, take: 8 },
        movements: {
          where: { branchCode },
          include: {
            user: true,
            purchase: { select: { id: true, purchaseNumber: true } },
            lot: { select: { id: true, internalLotCode: true, batchNumber: true } }
          },
          orderBy: { createdAt: "desc" },
          take: 30
        }
      }
    });
    return item
      ? { ...item, currentStock: item.branchBalances[0]?.currentStock ?? 0 }
      : null;
  });
}

export async function getSuppliers(
  input: PaginationInput & {
    search?: string;
    status?: "active" | "inactive" | "all";
  } = {}
) {
  const pagination = getPagination(input);
  const search = input.search?.trim();
  return withDatabaseError("getSuppliers", () =>
    prisma.supplier.findMany({
      where: {
        active:
          input.status === "all" || !input.status
            ? undefined
            : input.status === "active",
        OR: search
          ? [
              { name: { contains: search, mode: "insensitive" } },
              { contactName: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } },
              { whatsapp: { contains: search, mode: "insensitive" } }
            ]
          : undefined
      },
      include: {
        _count: {
          select: {
            itemLinks: { where: { active: true } }
          }
        }
      },
      orderBy: [{ active: "desc" }, { name: "asc" }],
      skip: pagination.skip,
      take: pagination.take
    })
  );
}

export async function countSuppliers(input: {
  search?: string;
  status?: "active" | "inactive" | "all";
} = {}) {
  const search = input.search?.trim();
  return withDatabaseError("countSuppliers", () =>
    prisma.supplier.count({
      where: {
        active:
          input.status === "all" || !input.status
            ? undefined
            : input.status === "active",
        OR: search
          ? [
              { name: { contains: search, mode: "insensitive" } },
              { contactName: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } },
              { whatsapp: { contains: search, mode: "insensitive" } }
            ]
          : undefined
      }
    })
  );
}

export async function getActiveSuppliers() {
  return withDatabaseError("getActiveSuppliers", () =>
    prisma.supplier.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" }
    })
  );
}

export async function getSupplierById(id: string) {
  return withDatabaseError("getSupplierById", () =>
    prisma.supplier.findUnique({
      where: { id },
      include: {
        itemLinks: {
          where: { active: true },
          include: { item: true },
          orderBy: [{ preferred: "desc" }, { item: { name: "asc" } }]
        },
        versions: {
          include: { changedBy: { select: { id: true, name: true, email: true } } },
          orderBy: { version: "desc" },
          take: 30
        }
      }
    })
  );
}

export async function getLowStockItems(branchCode = "el-alto") {
  return withDatabaseError("getLowStockItems", async () => {
    const balances = await prisma.branchInventoryBalance.findMany({
      where: { branchCode, item: { active: true } },
      include: { item: true },
      orderBy: { currentStock: "asc" }
    });
    return balances
      .filter((balance) => balance.currentStock <= balance.item.minimumStock)
      .slice(0, 50)
      .map((balance) => ({ ...balance.item, currentStock: balance.currentStock }));
  });
}

export async function getInventorySummary(branchCode = "el-alto") {
  return withDatabaseError("getInventorySummary", async () => {
    const [totalItems, balances] = await Promise.all([
      prisma.inventoryItem.count({ where: { active: true } }),
      prisma.branchInventoryBalance.findMany({
        where: { branchCode, item: { active: true } },
        select: { currentStock: true, item: { select: { minimumStock: true } } }
      })
    ]);
    const lowStock = balances.filter(
      (balance) => balance.currentStock <= balance.item.minimumStock
    ).length;
    const openAlerts = lowStock;
    return { totalItems, lowStock, openAlerts };
  });
}
