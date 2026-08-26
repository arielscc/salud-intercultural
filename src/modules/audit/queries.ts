import type { Prisma } from "@/generated/prisma/client";
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

export async function getAuditEventPage(filters: AuditEventFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const from = parseStartOfDay(filters.from);
  const to = parseEndOfDay(filters.to);
  const where: Prisma.AuditEventWhereInput = {
    actorId: filters.actorId || undefined,
    action: filters.action || undefined,
    entityType: filters.entityType || undefined,
    occurredAt: from || to ? { gte: from, lte: to } : undefined
  };

  const [events, total, actors, actionRows, entityRows] = await Promise.all([
    prisma.auditEvent.findMany({
      where,
      include: { actor: { select: { name: true, email: true } } },
      orderBy: { occurredAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE
    }),
    prisma.auditEvent.count({ where }),
    prisma.internalUser.findMany({
      where: { auditEvents: { some: {} } },
      select: { id: true, name: true, email: true },
      orderBy: [{ name: "asc" }, { email: "asc" }]
    }),
    prisma.auditEvent.findMany({
      distinct: ["action"],
      select: { action: true },
      orderBy: { action: "asc" }
    }),
    prisma.auditEvent.findMany({
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

