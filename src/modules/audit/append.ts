import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import type { AuditResult, InternalRole, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/modules/database";
import { sanitizeAuditContext } from "@/modules/audit/sanitize";

/*
 * Escritura del evento de auditoría, separada de `service.ts` a propósito.
 *
 * `service.ts` depende de `@/modules/permissions` para resolver al usuario, y
 * las guardas de página necesitan escribir auditoría. Si vivieran en el mismo
 * archivo, los dos módulos se importarían en círculo.
 */

type AuditActor = {
  id: string;
  role: InternalRole;
};

export type AppendAuditEventInput = {
  actor?: AuditActor | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  result: AuditResult;
  requestId?: string;
  context?: unknown;
};

export async function getRequestId() {
  try {
    const requestHeaders = await headers();
    const candidate =
      requestHeaders.get("x-request-id") ?? requestHeaders.get("x-vercel-id");
    return candidate && /^[a-zA-Z0-9._:-]{1,160}$/.test(candidate)
      ? candidate
      : randomUUID();
  } catch {
    return randomUUID();
  }
}

export async function appendAuditEvent(input: AppendAuditEventInput) {
  const context = sanitizeAuditContext(input.context);

  return prisma.auditEvent.create({
    data: {
      actorId: input.actor?.id ?? null,
      actorRole: input.actor?.role ?? null,
      action: input.action.slice(0, 120),
      entityType: input.entityType.slice(0, 80),
      entityId: input.entityId?.slice(0, 120) ?? null,
      result: input.result,
      requestId: input.requestId ?? (await getRequestId()),
      context: context ? (context as Prisma.InputJsonValue) : undefined
    }
  });
}
