import type { InventoryMovementType, Prisma } from "@/generated/prisma/client";
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

export function findInsufficientStockError(error: unknown): InsufficientStockError | null {
  let current = error;

  while (current instanceof Error) {
    if (current instanceof InsufficientStockError) return current;
    current = "cause" in current ? current.cause : undefined;
  }

  return null;
}

async function syncLowStockAlert(tx: Prisma.TransactionClient, itemId: string) {
  const item = await tx.inventoryItem.findUniqueOrThrow({
    where: { id: itemId }
  });
  const hasLowStock = item.currentStock <= item.minimumStock;

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
    where: {
      itemId,
      status: "open"
    },
    data: {
      status: "resolved",
      resolvedAt: new Date()
    }
  });
}

export async function applyInventoryMovement(
  tx: Prisma.TransactionClient,
  input: {
    itemId: string;
    userId?: string;
    saleId?: string;
    saleItemId?: string;
    type: InventoryMovementType;
    quantityDelta: number;
    reason: string;
  }
) {
  const item = await tx.inventoryItem.findUniqueOrThrow({
    where: { id: input.itemId }
  });
  const stockAfter = item.currentStock + input.quantityDelta;

  if (stockAfter < 0) {
    throw new InsufficientStockError(item.name, item.currentStock, Math.abs(input.quantityDelta));
  }

  await tx.inventoryItem.update({
    where: { id: input.itemId },
    data: { currentStock: stockAfter }
  });

  const movement = await tx.inventoryMovement.create({
    data: {
      itemId: input.itemId,
      saleId: input.saleId,
      saleItemId: input.saleItemId,
      userId: input.userId,
      type: input.type,
      quantityDelta: input.quantityDelta,
      stockAfter,
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
  unit?: string;
  minimumStock?: number;
  initialStock?: number;
  userId?: string;
}) {
  return withDatabaseError("createInventoryItemRecord", async () => {
    return prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.create({
        data: {
          sku: input.sku,
          internalCode: input.internalCode,
          name: input.name,
          description: input.description,
          unit: input.unit ?? "unidad",
          minimumStock: input.minimumStock ?? 0,
          currentStock: 0
        }
      });

      if (input.initialStock && input.initialStock > 0) {
        await applyInventoryMovement(tx, {
          itemId: item.id,
          userId: input.userId,
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
    });
  });
}

export async function addInventoryEntryRecord(input: {
  itemId: string;
  userId?: string;
  quantity: number;
  reason: string;
}) {
  return withDatabaseError("addInventoryEntryRecord", async () => {
    return prisma.$transaction(async (tx) => {
      return applyInventoryMovement(tx, {
        itemId: input.itemId,
        userId: input.userId,
        type: "entry",
        quantityDelta: input.quantity,
        reason: input.reason
      });
    });
  });
}

export async function createInventoryAdjustmentRecord(input: {
  itemId: string;
  userId?: string;
  quantityDelta: number;
  reason: string;
}) {
  return withDatabaseError("createInventoryAdjustmentRecord", async () => {
    return prisma.$transaction(async (tx) => {
      await tx.inventoryAdjustment.create({
        data: {
          itemId: input.itemId,
          userId: input.userId,
          quantityDelta: input.quantityDelta,
          reason: input.reason
        }
      });

      return applyInventoryMovement(tx, {
        itemId: input.itemId,
        userId: input.userId,
        type: "authorized_manual_adjustment",
        quantityDelta: input.quantityDelta,
        reason: input.reason
      });
    });
  });
}

export async function getInventoryItems(input: PaginationInput & { search?: string } = {}) {
  const pagination = getPagination(input);
  const search = input.search?.trim();

  return withDatabaseError("getInventoryItems", async () => {
    return prisma.inventoryItem.findMany({
      where: {
        OR: search
          ? [
              { name: { contains: search, mode: "insensitive" } },
              { sku: { contains: search, mode: "insensitive" } },
              { internalCode: { contains: search, mode: "insensitive" } }
            ]
          : undefined
      },
      include: {
        supplier: true,
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
  });
}

export async function getInventoryItemById(id: string) {
  return withDatabaseError("getInventoryItemById", async () => {
    return prisma.inventoryItem.findUnique({
      where: { id },
      include: {
        supplier: true,
        alerts: {
          orderBy: { createdAt: "desc" },
          take: 8
        },
        movements: {
          include: { user: true },
          orderBy: { createdAt: "desc" },
          take: 30
        }
      }
    });
  });
}

export async function getLowStockItems() {
  return withDatabaseError("getLowStockItems", async () => {
    return prisma.inventoryItem.findMany({
      where: {
        active: true,
        currentStock: {
          lte: prisma.inventoryItem.fields.minimumStock
        }
      },
      orderBy: [{ currentStock: "asc" }, { name: "asc" }],
      take: 50
    });
  });
}

export async function getInventorySummary() {
  return withDatabaseError("getInventorySummary", async () => {
    const [totalItems, lowStock, openAlerts] = await Promise.all([
      prisma.inventoryItem.count({ where: { active: true } }),
      prisma.inventoryItem.count({
        where: {
          active: true,
          currentStock: {
            lte: prisma.inventoryItem.fields.minimumStock
          }
        }
      }),
      prisma.inventoryAlert.count({ where: { status: "open" } })
    ]);

    return { totalItems, lowStock, openAlerts };
  });
}
