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
  role?: InternalRole;
};

type AuditEventDetails = {
  actor?: AuditActor | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  result: AuditResult;
  requestId?: string;
  context?: unknown;
};

export type AppendAuditEventInput = AuditEventDetails &
  (
    | { scope: "branch"; branchCode: string }
    | { scope: "platform" }
  );

/**
 * Lista cerrada de eventos que pueden existir sin sucursal. Una acción de
 * negocio que no esté aquí debe usar scope=branch y materializar branchCode.
 */
const platformAuditActions = new Set([
  "branch.active.change",
  "branch.context.denied",
  "integration.payload_campaign.deactivate",
  "integration.payload_campaign.sync",
  "session.login",
  "session.logout",
  "session.revoke",
  "user.access.update",
  "user.branches.update",
  "user.create",
  "user.password.change",
  "user.password_change.require",
  "user.profile.update",
  "user.sessions.revoke",
  "user.unlock"
]);

export function isPlatformAuditAction(action: string) {
  return platformAuditActions.has(action);
}

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
  if (input.scope === "platform" && !isPlatformAuditAction(input.action)) {
    throw new Error("PLATFORM_AUDIT_ACTION_NOT_ALLOWED");
  }
  if (input.scope === "branch" && !/^[a-z0-9-]{2,80}$/.test(input.branchCode)) {
    throw new Error("AUDIT_BRANCH_REQUIRED");
  }
  const context = sanitizeAuditContext(input.context);

  return prisma.auditEvent.create({
    data: {
      scope: input.scope,
      branchCode: input.scope === "branch" ? input.branchCode : null,
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
