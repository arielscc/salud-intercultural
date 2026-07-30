import type {
  InventoryItemUsage,
  InventoryMovementType,
  Prisma
} from "@/generated/prisma/client";
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
    itemId: string;
    userId?: string;
    saleId?: string;
    saleItemId?: string;
    type: InventoryMovementType;
    quantityDelta: number;
    reason: string;
  }
) {
  const item = await tx.inventoryItem.findUniqueOrThrow({ where: { id: input.itemId } });

  if (!item.active) throw new InventoryCatalogError("inactive-item");
  if (input.type === "automatic_sale_exit" && item.usage === "internal_use") {
    throw new InventoryCatalogError("not-for-sale");
  }

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
  category?: string;
  unit?: string;
  usage?: InventoryItemUsage;
  salePriceCents?: number;
  referenceCostCents?: number;
  minimumStock?: number;
  initialStock?: number;
  userId?: string;
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
  itemId: string;
  userId?: string;
  quantity: number;
  reason: string;
}) {
  return withDatabaseError("addInventoryEntryRecord", async () =>
    prisma.$transaction((tx) =>
      applyInventoryMovement(tx, {
        itemId: input.itemId,
        userId: input.userId,
        type: "entry",
        quantityDelta: input.quantity,
        reason: input.reason
      })
    )
  );
}

export async function createInventoryAdjustmentRecord(input: {
  itemId: string;
  userId?: string;
  quantityDelta: number;
  reason: string;
}) {
  return withDatabaseError("createInventoryAdjustmentRecord", async () =>
    prisma.$transaction(async (tx) => {
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
    })
  );
}

export type InventoryListInput = PaginationInput & {
  search?: string;
  category?: string;
  usage?: InventoryItemUsage | "all";
  status?: "active" | "inactive" | "all";
};

export async function getInventoryItems(input: InventoryListInput = {}) {
  const pagination = getPagination(input);
  return withDatabaseError("getInventoryItems", () =>
    prisma.inventoryItem.findMany({
      where: inventoryListWhere(input),
      include: {
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
    })
  );
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

export async function getInventoryItemById(id: string) {
  return withDatabaseError("getInventoryItemById", () =>
    prisma.inventoryItem.findUnique({
      where: { id },
      include: {
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
          include: { user: true },
          orderBy: { createdAt: "desc" },
          take: 30
        }
      }
    })
  );
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

export async function getLowStockItems() {
  return withDatabaseError("getLowStockItems", () =>
    prisma.inventoryItem.findMany({
      where: {
        active: true,
        currentStock: { lte: prisma.inventoryItem.fields.minimumStock }
      },
      orderBy: [{ currentStock: "asc" }, { name: "asc" }],
      take: 50
    })
  );
}

export async function getInventorySummary() {
  return withDatabaseError("getInventorySummary", async () => {
    const [totalItems, lowStock, openAlerts] = await Promise.all([
      prisma.inventoryItem.count({ where: { active: true } }),
      prisma.inventoryItem.count({
        where: {
          active: true,
          currentStock: { lte: prisma.inventoryItem.fields.minimumStock }
        }
      }),
      prisma.inventoryAlert.count({ where: { status: "open" } })
    ]);
    return { totalItems, lowStock, openAlerts };
  });
}
