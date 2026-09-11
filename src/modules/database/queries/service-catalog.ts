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

function mergeServiceConfiguration<
  T extends {
    branchConfigurations: Array<{
      active: boolean;
      basePriceCents: number;
      ownMaxDiscountCents: number;
      sessionCount: number | null;
      packagePriceCents: number | null;
      sessionPriceCents: number | null;
      revision: number;
    }>;
    components: Array<{
      inventoryItem: {
        branchConfigurations: Array<{
          available: boolean;
          salePriceCents: number;
          referenceCostCents: number;
          maxDiscountCents: number;
          minimumStock: number;
        }>;
      };
    }>;
  }
>(item: T) {
  const configuration = item.branchConfigurations[0]!;
  return {
    ...item,
    ...configuration,
    components: item.components.map((component) => ({
      ...component,
      inventoryItem: {
        ...component.inventoryItem,
        ...component.inventoryItem.branchConfigurations[0]!,
        active: component.inventoryItem.branchConfigurations[0]!.available
      }
    }))
  };
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

async function assertComponentsAvailableInConfiguredBranches(
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
    const configurations = await tx.serviceCatalogItemBranch.findMany({
      where: { catalogItemId },
      select: { branchCode: true }
    });
    const branchCodes = configurations.map((configuration) => configuration.branchCode);
    const activeItems = await tx.branchInventoryItem.findMany({
      where: {
        itemId: { in: inventoryItemIds },
        branchCode: { in: branchCodes },
        available: true
      },
      select: { itemId: true, branchCode: true }
    });
    if (activeItems.length !== inventoryItemIds.length * branchCodes.length) {
      throw new ServiceCatalogError("inactive-component");
    }
  }
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
  await assertComponentsAvailableInConfiguredBranches(
    tx,
    catalogItemId,
    [...unique].map(([inventoryItemId, quantity]) => ({ inventoryItemId, quantity }))
  );

  await tx.serviceCatalogComponent.deleteMany({ where: { catalogItemId } });
  for (const [inventoryItemId, quantity] of unique) {
    await tx.serviceCatalogComponent.create({
      data: { catalogItemId, inventoryItemId, quantity }
    });
  }
}

export async function createServiceCatalogItemRecord(input: {
  branchCode: string;
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
      const normalizedCode = normalizeCode(input.code);
      const existing = await tx.serviceCatalogItem.findUnique({
        where: { code: normalizedCode },
        include: { branchConfigurations: { where: { branchCode: input.branchCode } } }
      });
      if (existing?.branchConfigurations.length || (existing && existing.kind !== input.kind)) {
        throw new ServiceCatalogError("duplicate-code");
      }
      await ensureUniqueCode(tx, { code: input.code, catalogItemId: existing?.id });

      if (existing) {
        const item = await tx.serviceCatalogItem.update({
          where: { id: existing.id },
          data: {
            name: input.name.trim(),
            description: input.description,
            category: normalizeCategory(input.category ?? existing.category),
            requiresNursing: input.kind === "study" || (input.requiresNursing ?? false),
            supportsSessions: input.kind === "service" && (input.supportsSessions ?? false),
            revision: { increment: 1 },
            branchConfigurations: {
              create: {
                branchCode: input.branchCode,
                active: true,
                basePriceCents: input.basePriceCents,
                ownMaxDiscountCents: input.ownMaxDiscountCents ?? 0,
                sessionCount: input.sessionCount,
                packagePriceCents: input.packagePriceCents,
                sessionPriceCents: input.sessionPriceCents
              }
            }
          }
        });
        if (input.kind === "treatment") {
          if (input.components) {
            await syncComponents(tx, item.id, input.components);
          } else {
            const currentComponents = await tx.serviceCatalogComponent.findMany({
              where: { catalogItemId: item.id },
              select: { inventoryItemId: true, quantity: true }
            });
            await assertComponentsAvailableInConfiguredBranches(
              tx,
              item.id,
              currentComponents
            );
          }
        }
        await createServiceCatalogItemVersion(tx, item.id, {
          userId: input.userId,
          changeReason: `Oferta asignada a la sucursal ${input.branchCode}`
        });
        return item;
      }

      const item = await tx.serviceCatalogItem.create({
        data: {
          code: normalizedCode,
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
          sessionPriceCents: input.sessionPriceCents,
          branchConfigurations: {
            create: {
              branchCode: input.branchCode,
              active: true,
              basePriceCents: input.basePriceCents,
              ownMaxDiscountCents: input.ownMaxDiscountCents ?? 0,
              sessionCount: input.sessionCount,
              packagePriceCents: input.packagePriceCents,
              sessionPriceCents: input.sessionPriceCents
            }
          }
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
  branchCode: string;
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

      const localUpdate = await tx.serviceCatalogItemBranch.updateMany({
        where: {
          catalogItemId: input.catalogItemId,
          branchCode: input.branchCode,
          revision: input.expectedRevision
        },
        data: {
          basePriceCents: input.basePriceCents,
          sessionCount: current.kind === "service" ? input.sessionCount : null,
          packagePriceCents: current.kind === "service" ? input.packagePriceCents : null,
          sessionPriceCents: current.kind === "service" ? input.sessionPriceCents : null,
          revision: { increment: 1 }
        }
      });
      if (localUpdate.count !== 1) throw new ServiceCatalogError("concurrent-update");
      await tx.serviceCatalogItem.update({
        where: { id: input.catalogItemId },
        data: {
          name: input.name.trim(),
          description: input.description,
          category: normalizeCategory(input.category),
          requiresNursing: current.kind === "study" || input.requiresNursing,
          supportsSessions: current.kind === "service" && input.supportsSessions,
          revision: { increment: 1 }
        }
      });

      if (current.kind === "treatment" && input.components) {
        await syncComponents(tx, input.catalogItemId, input.components);
      }

      await createServiceCatalogItemVersion(tx, input.catalogItemId, input);
      const [item, configuration] = await Promise.all([
        tx.serviceCatalogItem.findUniqueOrThrow({ where: { id: input.catalogItemId } }),
        tx.serviceCatalogItemBranch.findUniqueOrThrow({
          where: {
            catalogItemId_branchCode: {
              catalogItemId: input.catalogItemId,
              branchCode: input.branchCode
            }
          }
        })
      ]);
      return { ...item, ...configuration };
    })
  );
}

export async function setServiceCatalogItemStatusRecord(input: {
  catalogItemId: string;
  branchCode: string;
  expectedRevision: number;
  active: boolean;
  changeReason: string;
  userId?: string;
}) {
  return withDatabaseError("setServiceCatalogItemStatusRecord", async () =>
    prisma.$transaction(async (tx) => {
      const updated = await tx.serviceCatalogItemBranch.updateMany({
        where: {
          catalogItemId: input.catalogItemId,
          branchCode: input.branchCode,
          revision: input.expectedRevision
        },
        data: { active: input.active, revision: { increment: 1 } }
      });
      if (updated.count !== 1) throw new ServiceCatalogError("concurrent-update");

      const configuration = await tx.serviceCatalogItemBranch.findUniqueOrThrow({
        where: {
          catalogItemId_branchCode: {
            catalogItemId: input.catalogItemId,
            branchCode: input.branchCode
          }
        }
      });
      return { id: input.catalogItemId, ...configuration };
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
  branchCode: string;
  expectedRevision: number;
  ownMaxDiscountCents: number;
  changeReason: string;
  userId?: string;
}) {
  return withDatabaseError("updateServiceCatalogOwnThresholdRecord", async () =>
    prisma.$transaction(async (tx) => {
      const updated = await tx.serviceCatalogItemBranch.updateMany({
        where: {
          catalogItemId: input.catalogItemId,
          branchCode: input.branchCode,
          revision: input.expectedRevision
        },
        data: { ownMaxDiscountCents: input.ownMaxDiscountCents, revision: { increment: 1 } }
      });
      if (updated.count !== 1) throw new ServiceCatalogError("concurrent-update");

      const configuration = await tx.serviceCatalogItemBranch.findUniqueOrThrow({
        where: {
          catalogItemId_branchCode: {
            catalogItemId: input.catalogItemId,
            branchCode: input.branchCode
          }
        }
      });
      return { id: input.catalogItemId, ...configuration };
    })
  );
}

function serviceCatalogListWhere(input: {
  branchCode: string;
  search?: string;
  category?: string;
  kind?: ServiceCatalogKind | "all";
  status?: "active" | "inactive" | "all";
}): Prisma.ServiceCatalogItemWhereInput {
  const search = input.search?.trim();
  return {
    branchConfigurations: {
      some: {
        branchCode: input.branchCode,
        active:
          input.status === "all" || !input.status
            ? undefined
            : input.status === "active"
      }
    },
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
  branchCode: string;
  search?: string;
  category?: string;
  kind?: ServiceCatalogKind | "all";
  status?: "active" | "inactive" | "all";
};

export async function getServiceCatalogItems(input: ServiceCatalogListInput) {
  const pagination = getPagination(input);
  return withDatabaseError("getServiceCatalogItems", () =>
    prisma.serviceCatalogItem.findMany({
      where: serviceCatalogListWhere(input),
      include: {
        branchConfigurations: { where: { branchCode: input.branchCode } },
        components: {
          include: {
            inventoryItem: {
              include: { branchConfigurations: { where: { branchCode: input.branchCode } } }
            }
          },
          orderBy: { createdAt: "asc" }
        }
      },
      orderBy: { name: "asc" },
      skip: pagination.skip,
      take: pagination.take
    }).then((items) => items.map((item) => mergeServiceConfiguration(item)))
  );
}

export async function countServiceCatalogItems(
  input: Omit<ServiceCatalogListInput, keyof PaginationInput>
) {
  return withDatabaseError("countServiceCatalogItems", () =>
    prisma.serviceCatalogItem.count({ where: serviceCatalogListWhere(input) })
  );
}

export async function getServiceCatalogCategories(branchCode: string) {
  return withDatabaseError("getServiceCatalogCategories", async () => {
    const items = await prisma.serviceCatalogItem.findMany({
      where: { branchConfigurations: { some: { branchCode } } },
      distinct: ["category"],
      select: { category: true },
      orderBy: { category: "asc" }
    });
    return items.map((item) => item.category);
  });
}

export async function getServiceCatalogItemById(id: string, branchCode: string) {
  return withDatabaseError("getServiceCatalogItemById", async () => {
    const item = await prisma.serviceCatalogItem.findFirst({
      where: { id, branchConfigurations: { some: { branchCode } } },
      include: {
        branchConfigurations: { where: { branchCode } },
        components: {
          include: {
            inventoryItem: {
              include: { branchConfigurations: { where: { branchCode } } }
            }
          },
          orderBy: { createdAt: "asc" }
        },
        versions: {
          include: { changedBy: { select: { id: true, name: true, email: true } } },
          orderBy: { version: "desc" },
          take: 30
        }
      }
    });
    return item ? mergeServiceConfiguration(item) : null;
  });
}

/** Productos activos para elegir componentes de un tratamiento. */
export async function getInventoryProductOptions(branchCode: string) {
  return withDatabaseError("getInventoryProductOptions", () =>
    prisma.inventoryItem.findMany({
      where: {
        branchConfigurations: { some: { branchCode, available: true } }
      },
      select: {
        id: true,
        name: true,
        branchConfigurations: {
          where: { branchCode },
          select: { maxDiscountCents: true }
        }
      },
      orderBy: { name: "asc" }
    }).then((items) =>
      items.map((item) => ({
        id: item.id,
        name: item.name,
        maxDiscountCents: item.branchConfigurations[0]!.maxDiscountCents
      }))
    )
  );
}

/** Ofertas activas para el selector del médico (Tarea 2); excluye estudios. */
export async function getActiveServiceCatalogItems(branchCode: string) {
  return withDatabaseError("getActiveServiceCatalogItems", () =>
    prisma.serviceCatalogItem.findMany({
      where: {
        kind: { in: ["service", "treatment"] },
        branchConfigurations: { some: { branchCode, active: true } }
      },
      include: {
        branchConfigurations: { where: { branchCode } },
        components: {
          include: {
            inventoryItem: {
              include: { branchConfigurations: { where: { branchCode } } }
            }
          },
          orderBy: { createdAt: "asc" }
        }
      },
      orderBy: [{ kind: "asc" }, { name: "asc" }]
    }).then((items) => items.map((item) => mergeServiceConfiguration(item)))
  );
}

/** Estudios activos del catálogo administrable (Tarea 8). */
export async function getActiveStudyCatalogItems(branchCode: string) {
  return withDatabaseError("getActiveStudyCatalogItems", () =>
    prisma.serviceCatalogItem.findMany({
      where: {
        kind: "study",
        branchConfigurations: { some: { branchCode, active: true } }
      },
      select: {
        id: true,
        name: true,
        branchConfigurations: {
          where: { branchCode },
          select: { basePriceCents: true, ownMaxDiscountCents: true }
        }
      },
      orderBy: { name: "asc" }
    }).then((items) =>
      items.map((item) => ({
        id: item.id,
        name: item.name,
        ...item.branchConfigurations[0]!
      }))
    )
  );
}
