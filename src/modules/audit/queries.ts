import type { InternalPlatformRole, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/modules/database";

export type AuditEventFilters = {
  from?: string;
  to?: string;
  actorId?: string;
  action?: string;
  entityType?: string;
  page?: number;
};

const PAGE_SIZE = 30;

function parseStartOfDay(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T00:00:00-04:00`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function parseEndOfDay(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T23:59:59.999-04:00`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

async function getScopedAuditEventPage(
  filters: AuditEventFilters,
  scopeWhere: Prisma.AuditEventWhereInput
) {
  const page = Math.max(1, filters.page ?? 1);
  const from = parseStartOfDay(filters.from);
  const to = parseEndOfDay(filters.to);
  const where: Prisma.AuditEventWhereInput = {
    ...scopeWhere,
    actorId: filters.actorId || undefined,
    action: filters.action || undefined,
    entityType: filters.entityType || undefined,
    occurredAt: from || to ? { gte: from, lte: to } : undefined
  };

  const [events, total, actors, actionRows, entityRows] = await Promise.all([
    prisma.auditEvent.findMany({
      where,
      select: {
        id: true,
        actorRole: true,
        action: true,
        entityType: true,
        entityId: true,
        result: true,
        requestId: true,
        occurredAt: true,
        actor: { select: { name: true, email: true } }
      },
      orderBy: { occurredAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE
    }),
    prisma.auditEvent.count({ where }),
    prisma.internalUser.findMany({
      where: { auditEvents: { some: scopeWhere } },
      select: { id: true, name: true, email: true },
      orderBy: [{ name: "asc" }, { email: "asc" }]
    }),
    prisma.auditEvent.findMany({
      where: scopeWhere,
      distinct: ["action"],
      select: { action: true },
      orderBy: { action: "asc" }
    }),
    prisma.auditEvent.findMany({
      where: scopeWhere,
      distinct: ["entityType"],
      select: { entityType: true },
      orderBy: { entityType: "asc" }
    })
  ]);

  return {
    events,
    total,
    page,
    pageSize: PAGE_SIZE,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    actors,
    actions: actionRows.map((row) => row.action),
    entityTypes: entityRows.map((row) => row.entityType)
  };
}

/** Vista operativa: nunca consulta ni opciones ni IDs fuera de una sede. */
export function getBranchAuditEventPage(
  branchCode: string,
  filters: AuditEventFilters
) {
  return getScopedAuditEventPage(filters, { scope: "branch", branchCode });
}

/** Vista global separada; el llamador debe validar el permiso de plataforma. */
export function getPlatformAuditEventPage(
  filters: AuditEventFilters,
  platformRole: InternalPlatformRole | null
) {
  if (platformRole !== "super_admin") {
    throw new Error("PLATFORM_AUDIT_PERMISSION_REQUIRED");
  }
  return getScopedAuditEventPage(filters, { scope: "platform", branchCode: null });
}
