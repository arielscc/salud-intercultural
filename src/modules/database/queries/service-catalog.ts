import type { Prisma, ServiceCatalogKind } from "@/generated/prisma/client";
import { prisma, withDatabaseError } from "@/modules/database";
import { getPagination, type PaginationInput } from "@/modules/database/pagination";

export class ServiceCatalogError extends Error {
  constructor(
    public readonly code:
      | "duplicate-code"
      | "concurrent-update"
      | "invalid-component"
      | "inactive-component"
  ) {
    super(code);
    this.name = "ServiceCatalogError";
  }
}

export function findServiceCatalogError(error: unknown): ServiceCatalogError | null {
  let current = error;
  while (current instanceof Error) {
    if (current instanceof ServiceCatalogError) return current;
    current = "cause" in current ? current.cause : undefined;
  }
  return null;
}

function normalizeCode(value: string) {
  return value.trim().replace(/\s+/g, "-").toUpperCase();
}

function normalizeCategory(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

/**
 * Tope de descuento (centavos) de una oferta:
 * - Tratamiento: suma de `maxDiscountCents * quantity` de sus productos componentes.
 * - Servicio: su umbral propio `ownMaxDiscountCents`.
 * Solo Dirección y Super administrador editan estos umbrales.
 */
export function computeServiceCatalogMaxDiscountCents(item: {
  kind: ServiceCatalogKind;
  ownMaxDiscountCents: number;
  components: Array<{ quantity: number; inventoryItem: { maxDiscountCents: number } }>;
}) {
  if (item.kind === "treatment" && item.components.length > 0) {
    return item.components.reduce(
      (total, component) => total + component.inventoryItem.maxDiscountCents * component.quantity,
      0
    );
  }
  return item.ownMaxDiscountCents;
}

async function createServiceCatalogItemVersion(
  tx: Prisma.TransactionClient,
  catalogItemId: string,
  input: { userId?: string; changeReason: string }
) {
  const item = await tx.serviceCatalogItem.findUniqueOrThrow({
    where: { id: catalogItemId },
    include: {
      components: {
        include: { inventoryItem: true },
        orderBy: { createdAt: "asc" }
      }
    }
  });

  return tx.serviceCatalogItemVersion.create({
    data: {
      catalogItemId: item.id,
      version: item.revision,
      code: item.code,
      name: item.name,
      description: item.description,
      category: item.category,
      kind: item.kind,
      basePriceCents: item.basePriceCents,
      ownMaxDiscountCents: item.ownMaxDiscountCents,
      requiresNursing: item.requiresNursing,
      supportsSessions: item.supportsSessions,
      sessionCount: item.sessionCount,
      packagePriceCents: item.packagePriceCents,
      sessionPriceCents: item.sessionPriceCents,
      active: item.active,
      componentSnapshot: item.components.map((component) => ({
        inventoryItemId: component.inventoryItemId,
        name: component.inventoryItem.name,
        quantity: component.quantity,
        maxDiscountCents: component.inventoryItem.maxDiscountCents
      })),
      changedById: input.userId,
      changeReason: input.changeReason
    }
  });
}

async function ensureUniqueCode(
  tx: Prisma.TransactionClient,
  input: { catalogItemId?: string; code: string }
) {
  const duplicate = await tx.serviceCatalogItem.findFirst({
    where: {
      id: input.catalogItemId ? { not: input.catalogItemId } : undefined,
      code: { equals: normalizeCode(input.code), mode: "insensitive" }
    },
    select: { id: true }
  });
  if (duplicate) throw new ServiceCatalogError("duplicate-code");
}

async function syncComponents(
  tx: Prisma.TransactionClient,
  catalogItemId: string,
  components: Array<{ inventoryItemId: string; quantity: number }>
) {
  const unique = new Map<string, number>();
  for (const component of components) {
    unique.set(component.inventoryItemId, component.quantity);
  }
  const inventoryItemIds = [...unique.keys()];

  if (inventoryItemIds.length > 0) {
    const activeItems = await tx.inventoryItem.findMany({
      where: { id: { in: inventoryItemIds }, active: true },
      select: { id: true }
    });
    if (activeItems.length !== inventoryItemIds.length) {
      throw new ServiceCatalogError("inactive-component");
    }
  }

  await tx.serviceCatalogComponent.deleteMany({ where: { catalogItemId } });
  for (const [inventoryItemId, quantity] of unique) {
    await tx.serviceCatalogComponent.create({
      data: { catalogItemId, inventoryItemId, quantity }
    });
  }
}

export async function createServiceCatalogItemRecord(input: {
  code: string;
  name: string;
  description?: string;
  category?: string;
  kind: ServiceCatalogKind;
  basePriceCents: number;
  ownMaxDiscountCents?: number;
  requiresNursing?: boolean;
  supportsSessions?: boolean;
  sessionCount?: number;
  packagePriceCents?: number;
  sessionPriceCents?: number;
  components?: Array<{ inventoryItemId: string; quantity: number }>;
  userId?: string;
}) {
  return withDatabaseError("createServiceCatalogItemRecord", async () =>
    prisma.$transaction(async (tx) => {
      await ensureUniqueCode(tx, { code: input.code });
      const item = await tx.serviceCatalogItem.create({
        data: {
          code: normalizeCode(input.code),
          name: input.name.trim(),
          description: input.description,
          category: normalizeCategory(input.category ?? "Sin categoría"),
          kind: input.kind,
          basePriceCents: input.basePriceCents,
          ownMaxDiscountCents: input.ownMaxDiscountCents ?? 0,
          requiresNursing: input.requiresNursing ?? false,
          supportsSessions: input.supportsSessions ?? false,
          sessionCount: input.sessionCount,
          packagePriceCents: input.packagePriceCents,
          sessionPriceCents: input.sessionPriceCents
        }
      });

      if (input.kind === "treatment" && input.components && input.components.length > 0) {
        await syncComponents(tx, item.id, input.components);
      }

      await createServiceCatalogItemVersion(tx, item.id, {
        userId: input.userId,
        changeReason: "Alta inicial de la oferta"
      });

      return tx.serviceCatalogItem.findUniqueOrThrow({ where: { id: item.id } });
    })
  );
}

export async function updateServiceCatalogItemRecord(input: {
  catalogItemId: string;
  expectedRevision: number;
  name: string;
  description?: string;
  category: string;
  basePriceCents: number;
  requiresNursing: boolean;
  supportsSessions: boolean;
  sessionCount?: number;
  packagePriceCents?: number;
  sessionPriceCents?: number;
  components?: Array<{ inventoryItemId: string; quantity: number }>;
  changeReason: string;
  userId?: string;
}) {
  return withDatabaseError("updateServiceCatalogItemRecord", async () =>
    prisma.$transaction(async (tx) => {
      const current = await tx.serviceCatalogItem.findUniqueOrThrow({
        where: { id: input.catalogItemId },
        select: { kind: true }
      });

      const updated = await tx.serviceCatalogItem.updateMany({
        where: { id: input.catalogItemId, revision: input.expectedRevision },
        data: {
          name: input.name.trim(),
          description: input.description,
          category: normalizeCategory(input.category),
          basePriceCents: input.basePriceCents,
          requiresNursing: current.kind === "study" || input.requiresNursing,
          supportsSessions: current.kind === "service" && input.supportsSessions,
          sessionCount: current.kind === "service" ? input.sessionCount : null,
          packagePriceCents: current.kind === "service" ? input.packagePriceCents : null,
          sessionPriceCents: current.kind === "service" ? input.sessionPriceCents : null,
          revision: { increment: 1 }
        }
      });
      if (updated.count !== 1) throw new ServiceCatalogError("concurrent-update");

      if (current.kind === "treatment" && input.components) {
        await syncComponents(tx, input.catalogItemId, input.components);
      }

      await createServiceCatalogItemVersion(tx, input.catalogItemId, input);
      return tx.serviceCatalogItem.findUniqueOrThrow({ where: { id: input.catalogItemId } });
    })
  );
}

export async function setServiceCatalogItemStatusRecord(input: {
  catalogItemId: string;
  expectedRevision: number;
  active: boolean;
  changeReason: string;
  userId?: string;
}) {
  return withDatabaseError("setServiceCatalogItemStatusRecord", async () =>
    prisma.$transaction(async (tx) => {
      const updated = await tx.serviceCatalogItem.updateMany({
        where: { id: input.catalogItemId, revision: input.expectedRevision },
        data: { active: input.active, revision: { increment: 1 } }
      });
      if (updated.count !== 1) throw new ServiceCatalogError("concurrent-update");

      await createServiceCatalogItemVersion(tx, input.catalogItemId, input);
      return tx.serviceCatalogItem.findUniqueOrThrow({ where: { id: input.catalogItemId } });
    })
  );
}

/**
 * Edita el umbral de descuento máximo (centavos). Solo se llama desde una acción
 * con permiso `discount_threshold_manage` (Dirección / Super administrador).
 * Aplica al umbral propio del servicio o, cuando `inventoryItemId` viene, al
 * umbral por producto usado como tope de los tratamientos.
 */
export async function updateServiceCatalogOwnThresholdRecord(input: {
  catalogItemId: string;
  expectedRevision: number;
  ownMaxDiscountCents: number;
  changeReason: string;
  userId?: string;
}) {
  return withDatabaseError("updateServiceCatalogOwnThresholdRecord", async () =>
    prisma.$transaction(async (tx) => {
      const updated = await tx.serviceCatalogItem.updateMany({
        where: { id: input.catalogItemId, revision: input.expectedRevision },
        data: { ownMaxDiscountCents: input.ownMaxDiscountCents, revision: { increment: 1 } }
      });
      if (updated.count !== 1) throw new ServiceCatalogError("concurrent-update");

      await createServiceCatalogItemVersion(tx, input.catalogItemId, input);
      return tx.serviceCatalogItem.findUniqueOrThrow({ where: { id: input.catalogItemId } });
    })
  );
}

function serviceCatalogListWhere(input: {
  search?: string;
  category?: string;
  kind?: ServiceCatalogKind | "all";
  status?: "active" | "inactive" | "all";
}): Prisma.ServiceCatalogItemWhereInput {
  const search = input.search?.trim();
  return {
    active:
      input.status === "all" || !input.status ? undefined : input.status === "active",
    category:
      input.category && input.category !== "all"
        ? { equals: input.category, mode: "insensitive" }
        : undefined,
    kind: input.kind && input.kind !== "all" ? input.kind : undefined,
    OR: search
      ? [
          { name: { contains: search, mode: "insensitive" } },
          { code: { contains: search, mode: "insensitive" } },
          { category: { contains: search, mode: "insensitive" } }
        ]
      : undefined
  };
}

export type ServiceCatalogListInput = PaginationInput & {
  search?: string;
  category?: string;
  kind?: ServiceCatalogKind | "all";
  status?: "active" | "inactive" | "all";
};

export async function getServiceCatalogItems(input: ServiceCatalogListInput = {}) {
  const pagination = getPagination(input);
  return withDatabaseError("getServiceCatalogItems", () =>
    prisma.serviceCatalogItem.findMany({
      where: serviceCatalogListWhere(input),
      include: {
        components: { include: { inventoryItem: true }, orderBy: { createdAt: "asc" } }
      },
      orderBy: [{ active: "desc" }, { name: "asc" }],
      skip: pagination.skip,
      take: pagination.take
    })
  );
}

export async function countServiceCatalogItems(
  input: Omit<ServiceCatalogListInput, keyof PaginationInput> = {}
) {
  return withDatabaseError("countServiceCatalogItems", () =>
    prisma.serviceCatalogItem.count({ where: serviceCatalogListWhere(input) })
  );
}

export async function getServiceCatalogCategories() {
  return withDatabaseError("getServiceCatalogCategories", async () => {
    const items = await prisma.serviceCatalogItem.findMany({
      distinct: ["category"],
      select: { category: true },
      orderBy: { category: "asc" }
    });
    return items.map((item) => item.category);
  });
}

export async function getServiceCatalogItemById(id: string) {
  return withDatabaseError("getServiceCatalogItemById", () =>
    prisma.serviceCatalogItem.findUnique({
      where: { id },
      include: {
        components: {
          include: { inventoryItem: true },
          orderBy: { createdAt: "asc" }
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

/** Productos activos para elegir componentes de un tratamiento. */
export async function getInventoryProductOptions() {
  return withDatabaseError("getInventoryProductOptions", () =>
    prisma.inventoryItem.findMany({
      where: { active: true },
      select: { id: true, name: true, maxDiscountCents: true },
      orderBy: { name: "asc" }
    })
  );
}

/** Ofertas activas para el selector del médico (Tarea 2); excluye estudios. */
export async function getActiveServiceCatalogItems() {
  return withDatabaseError("getActiveServiceCatalogItems", () =>
    prisma.serviceCatalogItem.findMany({
      where: { active: true, kind: { in: ["service", "treatment"] } },
      include: {
        components: { include: { inventoryItem: true }, orderBy: { createdAt: "asc" } }
      },
      orderBy: [{ kind: "asc" }, { name: "asc" }]
    })
  );
}

/** Estudios activos del catálogo administrable (Tarea 8). */
export async function getActiveStudyCatalogItems() {
  return withDatabaseError("getActiveStudyCatalogItems", () =>
    prisma.serviceCatalogItem.findMany({
      where: { active: true, kind: "study" },
      select: { id: true, name: true, basePriceCents: true },
      orderBy: { name: "asc" }
    })
  );
}
