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
      | "branch-mismatch"
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
  branchCode: string;
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
    branchConfigurations: {
      some: {
        branchCode: input.branchCode,
        available:
          input.status === "all" || !input.status
            ? undefined
            : input.status === "active"
      }
    },
    category:
      input.category && input.category !== "all"
        ? { equals: input.category, mode: "insensitive" }
        : undefined,
    usage,
    OR: normalizedSearch
      ? [
          { name: { contains: normalizedSearch, mode: "insensitive" } },
          {
            branchConfigurations: {
              some: {
                branchCode: input.branchCode,
                sku: { contains: normalizedSearch, mode: "insensitive" }
              }
            }
          },
          { internalCode: { contains: normalizedSearch, mode: "insensitive" } },
          { category: { contains: normalizedSearch, mode: "insensitive" } }
        ]
      : undefined
  };
}

async function syncLowStockAlert(
  tx: Prisma.TransactionClient,
  itemId: string,
  branchCode: string
) {
  await tx.branchInventoryBalance.upsert({
    where: { itemId_branchCode: { itemId, branchCode } },
    create: { itemId, branchCode, currentStock: 0 },
    update: {}
  });
  const [item, configuration, balance] = await Promise.all([
    tx.inventoryItem.findUniqueOrThrow({ where: { id: itemId } }),
    tx.branchInventoryItem.findUniqueOrThrow({
      where: { itemId_branchCode: { itemId, branchCode } }
    }),
    tx.branchInventoryBalance.findUnique({
      where: { itemId_branchCode: { itemId, branchCode } }
    })
  ]);
  const currentStock = balance?.currentStock ?? 0;
  const hasLowStock =
    configuration.available && currentStock <= configuration.minimumStock;

  if (hasLowStock) {
    const existing = await tx.inventoryAlert.findFirst({
      where: { itemId, branchCode, status: "open" }
    });

    if (!existing) {
      await tx.inventoryAlert.create({
        data: {
          itemId,
          branchCode,
          status: "open",
          message: `${item.name} está en stock bajo (${currentStock} ${item.unit}) en ${branchCode}.`
        }
      });
    }
    return;
  }

  await tx.inventoryAlert.updateMany({
    where: { itemId, branchCode, status: "open" },
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
    include: { supplierLinks: { include: { supplier: true } } }
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
      presentation: item.presentation,
      manufacturer: item.manufacturer,
      barcode: item.barcode,
      salePriceCents: item.salePriceCents,
      referenceCostCents: item.referenceCostCents,
      maxDiscountCents: item.maxDiscountCents,
      minimumStock: item.minimumStock,
      active: item.active,
      supplierSnapshot: item.supplierLinks.map((link) => ({
        supplierId: link.supplierId,
        name: link.supplier.name,
        preferred: false
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
      country: supplier.country,
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
  input: {
    itemId?: string;
    branchCode: string;
    internalCode?: string;
    sku?: string;
    barcode?: string;
  }
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
    const duplicateSku = await tx.branchInventoryItem.findFirst({
      where: {
        itemId: input.itemId ? { not: input.itemId } : undefined,
        branchCode: input.branchCode,
        sku: { equals: normalizeOptionalCode(input.sku), mode: "insensitive" }
      },
      select: { itemId: true }
    });
    if (duplicateSku) throw new InventoryCatalogError("duplicate-sku");
  }

  if (input.barcode) {
    const duplicateBarcode = await tx.inventoryItem.findFirst({
      where: {
        id: input.itemId ? { not: input.itemId } : undefined,
        barcode: { equals: normalizeOptionalCode(input.barcode), mode: "insensitive" }
      },
      select: { id: true }
    });
    if (duplicateBarcode) throw new InventoryCatalogError("duplicate-code");
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
    branchCode: string;
    locationCode?: string;
    type: InventoryMovementType;
    quantityDelta: number;
    reason: string;
  }
) {
  const branchCode = input.branchCode;
  await tx.$queryRaw`SELECT "id" FROM "InventoryItem" WHERE "id" = ${input.itemId} FOR UPDATE`;
  const [item, configuration] = await Promise.all([
    tx.inventoryItem.findUniqueOrThrow({ where: { id: input.itemId } }),
    tx.branchInventoryItem.findUnique({
      where: { itemId_branchCode: { itemId: input.itemId, branchCode } }
    })
  ]);

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

  if (!configuration?.available) throw new InventoryCatalogError("inactive-item");
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
        where: { id_branchCode: { id: lot.id, branchCode } },
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
          purchaseId: lot.purchaseId ?? undefined,
          purchaseLineId: lot.purchaseLineId ?? undefined,
          receiptId: lot.receiptId ?? undefined,
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
    await syncLowStockAlert(tx, input.itemId, branchCode);
    return lastMovement!;
  }

  await tx.branchInventoryBalance.update({
    where: { itemId_branchCode: { itemId: input.itemId, branchCode } },
    data: { currentStock: stockAfter }
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

  await syncLowStockAlert(tx, input.itemId, branchCode);
  return movement;
}

export type NewInventoryItemInput = {
  sku?: string;
  internalCode: string;
  name: string;
  description?: string;
  category?: string;
  unit?: string;
  presentation?: string;
  manufacturer?: string;
  barcode?: string;
  locationCode?: string;
  usage?: InventoryItemUsage;
  salePriceCents?: number;
  referenceCostCents?: number;
  minimumStock?: number;
  initialStock?: number;
  userId?: string;
  branchCode: string;
  supplierIds?: string[];
  preferredSupplierId?: string;
};

export async function createInventoryItemInTransaction(
  tx: Prisma.TransactionClient,
  input: NewInventoryItemInput
) {
  const existing = await tx.inventoryItem.findUnique({
    where: { internalCode: normalizeCode(input.internalCode) },
    include: { branchConfigurations: { where: { branchCode: input.branchCode } } }
  });
  if (existing?.branchConfigurations.length) {
    throw new InventoryCatalogError("duplicate-code");
  }
  await ensureUniqueItemCodes(tx, { ...input, itemId: existing?.id });
  const supplierIds = [...new Set(input.supplierIds ?? [])];
  if (input.preferredSupplierId && !supplierIds.includes(input.preferredSupplierId)) {
    throw new InventoryCatalogError("invalid-preferred");
  }
  if (supplierIds.length > 0) {
    const activeSuppliers = await tx.supplierBranchProfile.count({
      where: {
        supplierId: { in: supplierIds },
        branchCode: input.branchCode,
        active: true
      }
    });
    if (activeSuppliers !== supplierIds.length) {
      throw new InventoryCatalogError("inactive-supplier");
    }
  }

  if (existing) {
    const item = await tx.inventoryItem.update({
      where: { id: existing.id },
      data: {
        name: input.name.trim(),
        description: input.description,
        category: normalizeCategory(input.category ?? existing.category),
        unit: input.unit ?? existing.unit,
        usage: input.usage ?? existing.usage,
        presentation: input.presentation,
        manufacturer: input.manufacturer,
        barcode: normalizeOptionalCode(input.barcode),
        revision: { increment: 1 },
        supplierLinks: {
          connectOrCreate: supplierIds.map((supplierId) => ({
            where: { itemId_supplierId: { itemId: existing.id, supplierId } },
            create: { supplierId }
          }))
        },
        branchConfigurations: {
          create: {
            branchCode: input.branchCode,
            sku: normalizeOptionalCode(input.sku),
            available: true,
            salePriceCents: input.salePriceCents ?? 0,
            referenceCostCents: input.referenceCostCents ?? 0,
            minimumStock: input.minimumStock ?? 0,
            locationCode: input.locationCode,
            preferredSupplierId: input.preferredSupplierId
          }
        }
      }
    });
    await createItemCatalogVersion(tx, item.id, {
      userId: input.userId,
      changeReason: `Producto asignado a la sucursal ${input.branchCode}`
    });
    await syncLowStockAlert(tx, item.id, input.branchCode);
    return item;
  }

  const item = await tx.inventoryItem.create({
    data: {
      sku: normalizeOptionalCode(input.sku),
      internalCode: normalizeCode(input.internalCode),
      name: input.name.trim(),
      description: input.description,
      category: normalizeCategory(input.category ?? "Sin categoría"),
      unit: input.unit ?? "unidad",
      usage: input.usage ?? "both",
      presentation: input.presentation,
      manufacturer: input.manufacturer,
      barcode: normalizeOptionalCode(input.barcode),
      salePriceCents: input.salePriceCents ?? 0,
      referenceCostCents: input.referenceCostCents ?? 0,
      minimumStock: input.minimumStock ?? 0,
      supplierLinks: {
        create: supplierIds.map((supplierId) => ({
          supplierId
        }))
      },
      branchConfigurations: {
        create: {
          branchCode: input.branchCode,
          sku: normalizeOptionalCode(input.sku),
          available: true,
          salePriceCents: input.salePriceCents ?? 0,
          referenceCostCents: input.referenceCostCents ?? 0,
          minimumStock: input.minimumStock ?? 0,
          locationCode: input.locationCode,
          preferredSupplierId: input.preferredSupplierId
        }
      }
    }
  });

  await createItemCatalogVersion(tx, item.id, {
    userId: input.userId,
    changeReason: "Alta inicial del producto"
  });
  await syncLowStockAlert(tx, item.id, input.branchCode);
  return item;
}

export async function addInventoryItemSupplierLinksInTransaction(
  tx: Prisma.TransactionClient,
  input: {
    itemId: string;
    branchCode: string;
    supplierIds: string[];
    preferredSupplierId?: string;
    userId?: string;
    changeReason: string;
  }
) {
  const supplierIds = [...new Set(input.supplierIds)];
  if (supplierIds.length === 0) return;
  const activeSuppliers = await tx.supplierBranchProfile.count({
    where: {
      supplierId: { in: supplierIds },
      branchCode: input.branchCode,
      active: true
    }
  });
  if (activeSuppliers !== supplierIds.length) {
    throw new InventoryCatalogError("inactive-supplier");
  }
  const item = await tx.inventoryItem.findUniqueOrThrow({
    where: { id: input.itemId },
    include: {
      supplierLinks: true,
      branchConfigurations: { where: { branchCode: input.branchCode } }
    }
  });
  const activeIds = new Set(item.supplierLinks.map((link) => link.supplierId));
  const additions = supplierIds.filter((supplierId) => !activeIds.has(supplierId));
  const configuration = item.branchConfigurations[0];
  if (
    additions.length === 0 &&
    configuration?.preferredSupplierId === input.preferredSupplierId
  ) {
    return;
  }
  for (const supplierId of additions) {
    await tx.inventoryItemSupplier.upsert({
      where: { itemId_supplierId: { itemId: input.itemId, supplierId } },
      create: { itemId: input.itemId, supplierId },
      update: {}
    });
  }
  await tx.branchInventoryItem.update({
    where: {
      itemId_branchCode: { itemId: input.itemId, branchCode: input.branchCode }
    },
    data: {
      preferredSupplierId: input.preferredSupplierId,
      revision: { increment: 1 }
    }
  });
}

export async function createInventoryItemRecord(input: NewInventoryItemInput) {
  return withDatabaseError("createInventoryItemRecord", async () =>
    prisma.$transaction(async (tx) => {
      const item = await createInventoryItemInTransaction(tx, input);

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
        await syncLowStockAlert(tx, item.id, input.branchCode);
      }

      const [record, balance] = await Promise.all([
        tx.inventoryItem.findUniqueOrThrow({
          where: { id: item.id },
          include: {
            alerts: { where: { branchCode: input.branchCode, status: "open" } }
          }
        }),
        tx.branchInventoryBalance.findUnique({
          where: {
            itemId_branchCode: { itemId: item.id, branchCode: input.branchCode }
          }
        })
      ]);
      return { ...record, currentStock: balance?.currentStock ?? 0 };
    })
  );
}

export async function updateInventoryItemRecord(input: {
  itemId: string;
  branchCode: string;
  expectedRevision: number;
  sku?: string;
  name: string;
  description?: string;
  category: string;
  unit: string;
  presentation?: string;
  manufacturer?: string;
  barcode?: string;
  locationCode?: string;
  usage: InventoryItemUsage;
  salePriceCents: number;
  referenceCostCents: number;
  minimumStock: number;
  changeReason: string;
  userId?: string;
}) {
  return withDatabaseError("updateInventoryItemRecord", async () =>
    prisma.$transaction(async (tx) => {
      await ensureUniqueItemCodes(tx, input);
      const localUpdate = await tx.branchInventoryItem.updateMany({
        where: {
          itemId: input.itemId,
          branchCode: input.branchCode,
          revision: input.expectedRevision
        },
        data: {
          sku: normalizeOptionalCode(input.sku),
          salePriceCents: input.salePriceCents,
          referenceCostCents: input.referenceCostCents,
          minimumStock: input.minimumStock,
          locationCode: input.locationCode,
          revision: { increment: 1 }
        }
      });
      if (localUpdate.count !== 1) throw new InventoryCatalogError("concurrent-update");
      await tx.inventoryItem.update({
        where: { id: input.itemId },
        data: {
          name: input.name.trim(),
          description: input.description,
          category: normalizeCategory(input.category),
          unit: input.unit.trim(),
          usage: input.usage,
          presentation: input.presentation,
          manufacturer: input.manufacturer,
          barcode: normalizeOptionalCode(input.barcode),
          revision: { increment: 1 }
        }
      });

      await syncLowStockAlert(tx, input.itemId, input.branchCode);
      await createItemCatalogVersion(tx, input.itemId, input);
      const [item, configuration] = await Promise.all([
        tx.inventoryItem.findUniqueOrThrow({ where: { id: input.itemId } }),
        tx.branchInventoryItem.findUniqueOrThrow({
          where: {
            itemId_branchCode: { itemId: input.itemId, branchCode: input.branchCode }
          }
        })
      ]);
      return { ...item, ...configuration, active: configuration.available };
    })
  );
}

/**
 * Edita el umbral de descuento máximo por producto (centavos). Solo se invoca
 * desde una acción con permiso `discount_threshold_manage` (Dirección / Super
 * administrador). Este umbral acota el descuento que el médico puede aplicar:
 * el tope de un tratamiento es la suma de los umbrales de sus productos.
 */
export async function updateInventoryItemMaxDiscountRecord(input: {
  itemId: string;
  branchCode: string;
  expectedRevision: number;
  maxDiscountCents: number;
  changeReason: string;
  userId?: string;
}) {
  return withDatabaseError("updateInventoryItemMaxDiscountRecord", async () =>
    prisma.$transaction(async (tx) => {
      const updated = await tx.branchInventoryItem.updateMany({
        where: {
          itemId: input.itemId,
          branchCode: input.branchCode,
          revision: input.expectedRevision
        },
        data: {
          maxDiscountCents: input.maxDiscountCents,
          revision: { increment: 1 }
        }
      });
      if (updated.count !== 1) throw new InventoryCatalogError("concurrent-update");
      const configuration = await tx.branchInventoryItem.findUniqueOrThrow({
        where: {
          itemId_branchCode: { itemId: input.itemId, branchCode: input.branchCode }
        }
      });
      return { id: input.itemId, ...configuration };
    })
  );
}

export async function setInventoryItemStatusRecord(input: {
  itemId: string;
  branchCode: string;
  expectedRevision: number;
  active: boolean;
  changeReason: string;
  userId?: string;
}) {
  return withDatabaseError("setInventoryItemStatusRecord", async () =>
    prisma.$transaction(async (tx) => {
      const updated = await tx.branchInventoryItem.updateMany({
        where: {
          itemId: input.itemId,
          branchCode: input.branchCode,
          revision: input.expectedRevision
        },
        data: { available: input.active, revision: { increment: 1 } }
      });
      if (updated.count !== 1) throw new InventoryCatalogError("concurrent-update");

      await syncLowStockAlert(tx, input.itemId, input.branchCode);
      const configuration = await tx.branchInventoryItem.findUniqueOrThrow({
        where: {
          itemId_branchCode: { itemId: input.itemId, branchCode: input.branchCode }
        }
      });
      return { id: input.itemId, ...configuration, active: configuration.available };
    })
  );
}

export async function updateInventoryItemSuppliersRecord(input: {
  itemId: string;
  branchCode: string;
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
      const activeSuppliers = await tx.supplierBranchProfile.findMany({
        where: {
          supplierId: { in: supplierIds },
          branchCode: input.branchCode,
          active: true
        },
        select: { supplierId: true }
      });
      if (activeSuppliers.length !== supplierIds.length) {
        throw new InventoryCatalogError("inactive-supplier");
      }

      const updated = await tx.branchInventoryItem.updateMany({
        where: {
          itemId: input.itemId,
          branchCode: input.branchCode,
          revision: input.expectedRevision
        },
        data: {
          preferredSupplierId: input.preferredSupplierId,
          revision: { increment: 1 }
        }
      });
      if (updated.count !== 1) throw new InventoryCatalogError("concurrent-update");

      for (const supplierId of supplierIds) {
        await tx.inventoryItemSupplier.upsert({
          where: { itemId_supplierId: { itemId: input.itemId, supplierId } },
          create: { itemId: input.itemId, supplierId },
          update: {}
        });
      }

      const item = await tx.inventoryItem.findUniqueOrThrow({ where: { id: input.itemId } });
      return { ...item, revision: input.expectedRevision + 1 };
    })
  );
}

export async function createSupplierRecord(input: {
  branchCode: string;
  name: string;
  country?: string;
  contactName?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  notes?: string;
  accountExecutiveName?: string;
  accountExecutivePhone?: string;
  commercialTerms?: string;
  paymentTermDays?: number;
  references?: string;
  userId?: string;
}) {
  return withDatabaseError("createSupplierRecord", async () =>
    prisma.$transaction(async (tx) => {
      const duplicate = await tx.supplier.findFirst({
        where: { name: { equals: input.name.trim(), mode: "insensitive" } },
        include: { branchProfiles: { where: { branchCode: input.branchCode } } }
      });
      if (duplicate?.branchProfiles.length) {
        throw new InventoryCatalogError("duplicate-supplier");
      }

      if (duplicate) {
        const supplier = await tx.supplier.update({
          where: { id: duplicate.id },
          data: {
            name: input.name.trim(),
            country: input.country,
            contactName: input.contactName,
            phone: input.phone,
            whatsapp: input.whatsapp,
            email: input.email,
            address: input.address,
            revision: { increment: 1 },
            branchProfiles: {
              create: {
                branchCode: input.branchCode,
                active: true,
                accountExecutiveName: input.accountExecutiveName,
                accountExecutivePhone: input.accountExecutivePhone,
                commercialTerms: input.commercialTerms,
                paymentTermDays: input.paymentTermDays,
                references: input.references,
                notes: input.notes
              }
            }
          }
        });
        await createSupplierVersion(tx, supplier.id, {
          userId: input.userId,
          changeReason: `Proveedor asignado a la sucursal ${input.branchCode}`
        });
        return { ...supplier, active: true };
      }

      const supplier = await tx.supplier.create({
        data: {
          name: input.name.trim(),
          country: input.country,
          contactName: input.contactName,
          phone: input.phone,
          whatsapp: input.whatsapp,
          email: input.email,
          address: input.address,
          notes: input.notes,
          branchProfiles: {
            create: {
              branchCode: input.branchCode,
              active: true,
              accountExecutiveName: input.accountExecutiveName,
              accountExecutivePhone: input.accountExecutivePhone,
              commercialTerms: input.commercialTerms,
              paymentTermDays: input.paymentTermDays,
              references: input.references,
              notes: input.notes
            }
          }
        }
      });
      await createSupplierVersion(tx, supplier.id, {
        userId: input.userId,
        changeReason: "Alta inicial del proveedor"
      });
      return { ...supplier, active: true };
    })
  );
}

export async function updateSupplierRecord(input: {
  supplierId: string;
  branchCode: string;
  expectedRevision: number;
  name: string;
  country?: string;
  contactName?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  notes?: string;
  accountExecutiveName?: string;
  accountExecutivePhone?: string;
  commercialTerms?: string;
  paymentTermDays?: number;
  references?: string;
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

      const localUpdate = await tx.supplierBranchProfile.updateMany({
        where: {
          supplierId: input.supplierId,
          branchCode: input.branchCode,
          revision: input.expectedRevision
        },
        data: {
          accountExecutiveName: input.accountExecutiveName,
          accountExecutivePhone: input.accountExecutivePhone,
          commercialTerms: input.commercialTerms,
          paymentTermDays: input.paymentTermDays,
          references: input.references,
          notes: input.notes,
          revision: { increment: 1 }
        }
      });
      if (localUpdate.count !== 1) throw new InventoryCatalogError("concurrent-update");
      await tx.supplier.update({
        where: { id: input.supplierId },
        data: {
          name: input.name.trim(),
          country: input.country,
          contactName: input.contactName,
          phone: input.phone,
          whatsapp: input.whatsapp,
          email: input.email,
          address: input.address,
          revision: { increment: 1 }
        }
      });

      await createSupplierVersion(tx, input.supplierId, input);
      const [supplier, profile] = await Promise.all([
        tx.supplier.findUniqueOrThrow({ where: { id: input.supplierId } }),
        tx.supplierBranchProfile.findUniqueOrThrow({
          where: {
            supplierId_branchCode: {
              supplierId: input.supplierId,
              branchCode: input.branchCode
            }
          }
        })
      ]);
      return { ...supplier, ...profile };
    })
  );
}

export async function setSupplierStatusRecord(input: {
  supplierId: string;
  branchCode: string;
  expectedRevision: number;
  active: boolean;
  changeReason: string;
  userId?: string;
}) {
  return withDatabaseError("setSupplierStatusRecord", async () =>
    prisma.$transaction(async (tx) => {
      const updated = await tx.supplierBranchProfile.updateMany({
        where: {
          supplierId: input.supplierId,
          branchCode: input.branchCode,
          revision: input.expectedRevision
        },
        data: { active: input.active, revision: { increment: 1 } }
      });
      if (updated.count !== 1) throw new InventoryCatalogError("concurrent-update");
      const profile = await tx.supplierBranchProfile.findUniqueOrThrow({
        where: {
          supplierId_branchCode: {
            supplierId: input.supplierId,
            branchCode: input.branchCode
          }
        }
      });
      return { id: input.supplierId, ...profile };
    })
  );
}

export async function addInventoryEntryRecord(input: {
  idempotencyKey?: string;
  itemId: string;
  userId?: string;
  branchCode: string;
  quantity: number;
  reason: string;
}) {
  return withDatabaseError("addInventoryEntryRecord", async () =>
    prisma.$transaction(async (tx) => {
      if (input.idempotencyKey) {
        const reused = await tx.inventoryMovement.findUnique({
          where: {
            branchCode_idempotencyKey: {
              branchCode: input.branchCode,
              idempotencyKey: input.idempotencyKey
            }
          }
        });
        if (reused) {
          if (reused.branchCode !== input.branchCode || reused.itemId !== input.itemId) {
            throw new InventoryCatalogError("branch-mismatch");
          }
          return reused;
        }
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
  branchCode: string;
  quantityDelta: number;
  reason: string;
}) {
  return withDatabaseError("createInventoryAdjustmentRecord", async () =>
    prisma.$transaction(async (tx) => {
      if (input.idempotencyKey) {
        const reused = await tx.inventoryMovement.findUnique({
          where: {
            branchCode_idempotencyKey: {
              branchCode: input.branchCode,
              idempotencyKey: input.idempotencyKey
            }
          }
        });
        if (reused) {
          if (reused.branchCode !== input.branchCode || reused.itemId !== input.itemId) {
            throw new InventoryCatalogError("branch-mismatch");
          }
          return reused;
        }
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
      | "inactive-item"
      | "reconciliation-failed"
      | "branch-mismatch"
      | "invalid-authorizer"
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
  destinationLocationCode: string;
  quantity: number;
  reason: string;
  createdById: string;
  idempotencyKey: string;
}) {
  return withDatabaseError("createInventoryTransferRecord", () =>
    prisma.$transaction(async (tx) => {
      const reused = await tx.inventoryTransfer.findUnique({
        where: {
          sourceBranchCode_idempotencyKey: {
            sourceBranchCode: input.sourceBranchCode,
            idempotencyKey: input.idempotencyKey
          }
        },
        include: {
          sourceMovement: true,
          destinationMovement: true,
          lotAllocations: { include: { sourceLot: true, destinationLot: true } }
        }
      });
      if (reused) {
        if (
          reused.sourceBranchCode !== input.sourceBranchCode ||
          reused.destinationBranchCode !== input.destinationBranchCode ||
          reused.itemId !== input.itemId
        ) {
          throw new InventoryTransferError("branch-mismatch");
        }
        return reused;
      }
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
      const authorizer = await tx.internalUser.findFirst({
        where: {
          id: input.createdById,
          active: true,
          OR: [
            { platformRole: "super_admin" },
            {
              AND: [
                {
                  branchAssignments: {
                    some: { branchCode: input.sourceBranchCode, active: true }
                  }
                },
                {
                  branchAssignments: {
                    some: { branchCode: input.destinationBranchCode, active: true }
                  }
                }
              ]
            }
          ]
        },
        select: { id: true }
      });
      if (!authorizer) throw new InventoryTransferError("invalid-authorizer");
      const configuredBranches = await tx.branchInventoryItem.count({
        where: {
          itemId: input.itemId,
          branchCode: { in: [input.sourceBranchCode, input.destinationBranchCode] },
          available: true
        }
      });
      if (configuredBranches !== 2) {
        throw new InventoryTransferError("inactive-item");
      }

      await tx.$queryRaw`SELECT "id" FROM "InventoryItem" WHERE "id" = ${input.itemId} FOR UPDATE`;
      await tx.branchInventoryBalance.upsert({
        where: {
          itemId_branchCode: {
            itemId: input.itemId,
            branchCode: input.sourceBranchCode
          }
        },
        create: {
          itemId: input.itemId,
          branchCode: input.sourceBranchCode,
          currentStock: 0
        },
        update: {}
      });
      await tx.$queryRaw`
        SELECT "itemId" FROM "BranchInventoryBalance"
        WHERE "itemId" = ${input.itemId}
          AND "branchCode" = ${input.sourceBranchCode}
        FOR UPDATE
      `;

      const reusedAfterLock = await tx.inventoryTransfer.findUnique({
        where: {
          sourceBranchCode_idempotencyKey: {
            sourceBranchCode: input.sourceBranchCode,
            idempotencyKey: input.idempotencyKey
          }
        },
        include: {
          sourceMovement: true,
          destinationMovement: true,
          lotAllocations: { include: { sourceLot: true, destinationLot: true } }
        }
      });
      if (reusedAfterLock) {
        if (
          reusedAfterLock.sourceBranchCode !== input.sourceBranchCode ||
          reusedAfterLock.destinationBranchCode !== input.destinationBranchCode ||
          reusedAfterLock.itemId !== input.itemId
        ) {
          throw new InventoryTransferError("branch-mismatch");
        }
        return reusedAfterLock;
      }

      const sourceBalance = await tx.branchInventoryBalance.findUniqueOrThrow({
        where: {
          itemId_branchCode: {
            itemId: input.itemId,
            branchCode: input.sourceBranchCode
          }
        }
      });
      const today = todayDatabaseDate();
      const allLotStock = await tx.inventoryLot.aggregate({
        where: {
          itemId: input.itemId,
          branchCode: input.sourceBranchCode,
          currentQuantity: { gt: 0 }
        },
        _sum: { currentQuantity: true }
      });
      const sourceLots = await tx.inventoryLot.findMany({
        where: {
          itemId: input.itemId,
          branchCode: input.sourceBranchCode,
          active: true,
          currentQuantity: { gt: 0 },
          OR: [{ expirationDate: null }, { expirationDate: { gte: today } }]
        },
        orderBy: [
          { expirationDate: { sort: "asc", nulls: "last" } },
          { createdAt: "asc" }
        ]
      });
      const validLotStock = sourceLots.reduce(
        (total, lot) => total + lot.currentQuantity,
        0
      );
      const legacyStock = Math.max(
        0,
        sourceBalance.currentStock - (allLotStock._sum.currentQuantity ?? 0)
      );
      const transferableStock = Math.min(
        sourceBalance.currentStock,
        validLotStock + legacyStock
      );
      if (input.quantity > transferableStock) {
        const item = await tx.inventoryItem.findUniqueOrThrow({
          where: { id: input.itemId },
          select: { name: true }
        });
        throw new InsufficientStockError(
          item.name,
          transferableStock,
          input.quantity
        );
      }

      let remaining = input.quantity;
      const lotAllocations: Array<{
        sourceLot: (typeof sourceLots)[number];
        quantity: number;
      }> = [];
      for (const sourceLot of sourceLots) {
        if (remaining === 0) break;
        const quantity = Math.min(sourceLot.currentQuantity, remaining);
        await tx.inventoryLot.update({
          where: {
            id_branchCode: {
              id: sourceLot.id,
              branchCode: input.sourceBranchCode
            }
          },
          data: {
            currentQuantity: { decrement: quantity },
            active: sourceLot.currentQuantity - quantity > 0
          }
        });
        lotAllocations.push({ sourceLot, quantity });
        remaining -= quantity;
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
        locationCode: input.destinationLocationCode,
        type: "transfer_in",
        quantityDelta: input.quantity,
        reason: `Traslado desde ${input.sourceBranchCode}: ${input.reason}`
      });
      const [sourceAfter, destinationAfter] = await Promise.all([
        tx.branchInventoryBalance.findUniqueOrThrow({
          where: {
            itemId_branchCode: {
              itemId: input.itemId,
              branchCode: input.sourceBranchCode
            }
          }
        }),
        tx.branchInventoryBalance.findUniqueOrThrow({
          where: {
            itemId_branchCode: {
              itemId: input.itemId,
              branchCode: input.destinationBranchCode
            }
          }
        })
      ]);
      if (
        sourceMovement.quantityDelta + destinationMovement.quantityDelta !== 0 ||
        sourceMovement.stockAfter !== sourceAfter.currentStock ||
        destinationMovement.stockAfter !== destinationAfter.currentStock
      ) {
        throw new InventoryTransferError("reconciliation-failed");
      }

      const transfer = await tx.inventoryTransfer.create({
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
        }
      });

      for (const allocation of lotAllocations) {
        const destinationLot = await tx.inventoryLot.create({
          data: {
            internalLotCode: `${allocation.sourceLot.internalLotCode}-${input.destinationBranchCode.toUpperCase()}-${randomUUID().slice(0, 8).toUpperCase()}`,
            itemId: allocation.sourceLot.itemId,
            supplierId: allocation.sourceLot.supplierId,
            batchNumber: allocation.sourceLot.batchNumber,
            expirationDate: allocation.sourceLot.expirationDate,
            branchCode: input.destinationBranchCode,
            locationCode: input.destinationLocationCode,
            receivedQuantity: allocation.quantity,
            currentQuantity: allocation.quantity,
            unitCostCents: allocation.sourceLot.unitCostCents
          }
        });
        await tx.inventoryTransferLotAllocation.create({
          data: {
            transferId: transfer.id,
            sourceLotId: allocation.sourceLot.id,
            destinationLotId: destinationLot.id,
            sourceBranchCode: input.sourceBranchCode,
            destinationBranchCode: input.destinationBranchCode,
            quantity: allocation.quantity
          }
        });
      }

      return tx.inventoryTransfer.findUniqueOrThrow({
        where: {
          id_sourceBranchCode_destinationBranchCode: {
            id: transfer.id,
            sourceBranchCode: input.sourceBranchCode,
            destinationBranchCode: input.destinationBranchCode
          }
        },
        include: {
          sourceMovement: true,
          destinationMovement: true,
          lotAllocations: { include: { sourceLot: true, destinationLot: true } }
        }
      });
    })
  );
}

export async function getInventoryTransfers(branchCode: string) {
  return withDatabaseError("getInventoryTransfers", () =>
    prisma.inventoryTransfer.findMany({
      where: {
        OR: [{ sourceBranchCode: branchCode }, { destinationBranchCode: branchCode }]
      },
      include: {
        item: true,
        sourceBranch: true,
        destinationBranch: true,
        sourceMovement: true,
        destinationMovement: true,
        createdBy: { select: { id: true, name: true, email: true } },
        lotAllocations: {
          include: { sourceLot: true, destinationLot: true },
          orderBy: { createdAt: "asc" }
        }
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
  branchCode: string;
};

export async function getInventoryItems(input: InventoryListInput) {
  const pagination = getPagination(input);
  return withDatabaseError("getInventoryItems", async () => {
    const items = await prisma.inventoryItem.findMany({
      where: inventoryListWhere(input),
      include: {
        branchBalances: {
          where: { branchCode: input.branchCode },
          select: { currentStock: true }
        },
        branchConfigurations: {
          where: { branchCode: input.branchCode }
        },
        supplierLinks: {
          where: {
            supplier: {
              branchProfiles: {
                some: { branchCode: input.branchCode, active: true }
              }
            }
          },
          include: { supplier: true },
          orderBy: { supplier: { name: "asc" } }
        },
        alerts: {
          where: { branchCode: input.branchCode, status: "open" },
          orderBy: { createdAt: "desc" },
          take: 1
        }
      },
      orderBy: { name: "asc" },
      skip: pagination.skip,
      take: pagination.take
    });
    return items.map((item) => {
      const configuration = item.branchConfigurations[0]!;
      return {
        ...item,
        ...configuration,
        active: configuration.available,
        currentStock: item.branchBalances[0]?.currentStock ?? 0,
        supplierLinks: [...item.supplierLinks].sort((left, right) =>
          left.supplierId === configuration.preferredSupplierId
            ? -1
            : right.supplierId === configuration.preferredSupplierId
              ? 1
              : left.supplier.name.localeCompare(right.supplier.name)
        )
      };
    });
  });
}

export async function countInventoryItems(input: Omit<InventoryListInput, keyof PaginationInput>) {
  return withDatabaseError("countInventoryItems", () =>
    prisma.inventoryItem.count({ where: inventoryListWhere(input) })
  );
}

export async function getInventoryCategories(branchCode: string) {
  return withDatabaseError("getInventoryCategories", async () => {
    const items = await prisma.inventoryItem.findMany({
      where: { branchConfigurations: { some: { branchCode } } },
      distinct: ["category"],
      select: { category: true },
      orderBy: { category: "asc" }
    });
    return items.map((item) => item.category);
  });
}

export async function getInventoryItemById(id: string, branchCode: string) {
  return withDatabaseError("getInventoryItemById", async () => {
    const item = await prisma.inventoryItem.findFirst({
      where: { id, branchConfigurations: { some: { branchCode } } },
      include: {
        branchBalances: {
          where: { branchCode },
          select: { currentStock: true }
        },
        branchConfigurations: { where: { branchCode } },
        supplierLinks: {
          where: {
            supplier: { branchProfiles: { some: { branchCode, active: true } } }
          },
          include: { supplier: true },
          orderBy: { supplier: { name: "asc" } }
        },
        catalogVersions: {
          include: { changedBy: { select: { id: true, name: true, email: true } } },
          orderBy: { version: "desc" },
          take: 30
        },
        alerts: { where: { branchCode }, orderBy: { createdAt: "desc" }, take: 8 },
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
    if (!item) return null;
    const configuration = item.branchConfigurations[0]!;
    return {
      ...item,
      ...configuration,
      active: configuration.available,
      currentStock: item.branchBalances[0]?.currentStock ?? 0,
      supplierLinks: item.supplierLinks.map((link) => ({
        ...link,
        preferred: link.supplierId === configuration.preferredSupplierId,
        active: true
      }))
    };
  });
}

export async function getSuppliers(
  input: PaginationInput & {
    branchCode: string;
    search?: string;
    status?: "active" | "inactive" | "all";
  }
) {
  const pagination = getPagination(input);
  const search = input.search?.trim();
  return withDatabaseError("getSuppliers", () =>
    prisma.supplier.findMany({
      where: {
        branchProfiles: {
          some: {
            branchCode: input.branchCode,
            active:
              input.status === "all" || !input.status
                ? undefined
                : input.status === "active"
          }
        },
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
        branchProfiles: { where: { branchCode: input.branchCode } },
        _count: {
          select: {
            itemLinks: {
              where: {
                item: { branchConfigurations: { some: { branchCode: input.branchCode } } }
              }
            }
          }
        }
      },
      orderBy: { name: "asc" },
      skip: pagination.skip,
      take: pagination.take
    }).then((suppliers) =>
      suppliers.map((supplier) => ({ ...supplier, ...supplier.branchProfiles[0]! }))
    )
  );
}

export async function countSuppliers(input: {
  branchCode: string;
  search?: string;
  status?: "active" | "inactive" | "all";
}) {
  const search = input.search?.trim();
  return withDatabaseError("countSuppliers", () =>
    prisma.supplier.count({
      where: {
        branchProfiles: {
          some: {
            branchCode: input.branchCode,
            active:
              input.status === "all" || !input.status
                ? undefined
                : input.status === "active"
          }
        },
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

export async function getActiveSuppliers(branchCode: string) {
  return withDatabaseError("getActiveSuppliers", () =>
    prisma.supplier.findMany({
      where: { branchProfiles: { some: { branchCode, active: true } } },
      select: { id: true, name: true },
      orderBy: { name: "asc" }
    })
  );
}

export async function getSupplierById(id: string, branchCode: string) {
  return withDatabaseError("getSupplierById", async () => {
    const supplier = await prisma.supplier.findFirst({
      where: { id, branchProfiles: { some: { branchCode } } },
      include: {
        branchProfiles: { where: { branchCode } },
        itemLinks: {
          where: { item: { branchConfigurations: { some: { branchCode } } } },
          include: {
            item: { include: { branchConfigurations: { where: { branchCode } } } }
          },
          orderBy: { item: { name: "asc" } }
        },
        versions: {
          include: { changedBy: { select: { id: true, name: true, email: true } } },
          orderBy: { version: "desc" },
          take: 30
        }
      }
    });
    if (!supplier) return null;
    const profile = supplier.branchProfiles[0]!;
    return {
      ...supplier,
      ...profile,
      itemLinks: supplier.itemLinks.map((link) => ({
        ...link,
        preferred:
          link.item.branchConfigurations[0]?.preferredSupplierId === supplier.id,
        active: true
      }))
    };
  });
}

export async function getLowStockItems(branchCode: string) {
  return withDatabaseError("getLowStockItems", async () => {
    const balances = await prisma.branchInventoryBalance.findMany({
      where: {
        branchCode,
        item: { branchConfigurations: { some: { branchCode, available: true } } }
      },
      include: {
        item: { include: { branchConfigurations: { where: { branchCode } } } }
      },
      orderBy: { currentStock: "asc" }
    });
    return balances
      .filter(
        (balance) =>
          balance.currentStock <= balance.item.branchConfigurations[0]!.minimumStock
      )
      .slice(0, 50)
      .map((balance) => ({
        ...balance.item,
        ...balance.item.branchConfigurations[0]!,
        active: balance.item.branchConfigurations[0]!.available,
        currentStock: balance.currentStock
      }));
  });
}

export async function getInventorySummary(branchCode: string) {
  return withDatabaseError("getInventorySummary", async () => {
    const [totalItems, balances, openAlerts] = await Promise.all([
      prisma.branchInventoryItem.count({ where: { branchCode, available: true } }),
      prisma.branchInventoryBalance.findMany({
        where: {
          branchCode,
          item: { branchConfigurations: { some: { branchCode, available: true } } }
        },
        select: {
          currentStock: true,
          item: {
            select: {
              branchConfigurations: {
                where: { branchCode },
                select: { minimumStock: true }
              }
            }
          }
        }
      }),
      prisma.inventoryAlert.count({ where: { branchCode, status: "open" } })
    ]);
    const lowStock = balances.filter(
      (balance) =>
        balance.currentStock <= balance.item.branchConfigurations[0]!.minimumStock
    ).length;
    return { totalItems, lowStock, openAlerts };
  });
}
