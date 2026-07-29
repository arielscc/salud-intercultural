import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type {
  AuditResult,
  InternalPermission,
  InternalRole,
  Prisma
} from "@/generated/prisma/client";
import { roleHasPermission } from "@/features/internal-auth/permissions";
import { prisma } from "@/modules/database";
import { getCurrentInternalUser } from "@/modules/permissions";
import { sanitizeAuditContext } from "@/modules/audit/sanitize";

type AuditActor = {
  id: string;
  role: InternalRole;
};

type AuditMetadata = {
  entityId?: string | null;
  context?: unknown;
};

type AuditOperationResult<T> = {
  value: T;
  audit?: AuditMetadata;
};

type AuditedOperationInput = {
  permission: InternalPermission;
  action: string;
  entityType: string;
  entityId?: string | null;
  context?: unknown;
};

type AppendAuditEventInput = {
  actor?: AuditActor | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  result: AuditResult;
  requestId?: string;
  context?: unknown;
};

class AuditAccessDeniedError extends Error {
  constructor(public readonly reason: string) {
    super("AUDIT_ACCESS_DENIED");
    this.name = "AuditAccessDeniedError";
  }
}

async function getRequestId() {
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

export function auditedResult<T>(value: T, audit?: AuditMetadata): AuditOperationResult<T> {
  return { value, audit };
}

export function assertAuditedPermission(actor: AuditActor, permission: InternalPermission) {
  if (!roleHasPermission(actor.role, permission)) {
    throw new AuditAccessDeniedError("missing_permission");
  }
}

export function denyAuditedAction(reason = "policy_denied"): never {
  throw new AuditAccessDeniedError(reason);
}

/**
 * Ejecuta una acción protegida y genera exactamente un intento de auditoría:
 * success, failure o denied. Los redirect de validación que ocurren dentro de
 * `operation` se consideran fallos. Los redirect posteriores deben ejecutarse
 * después de que esta función haya terminado.
 */
export async function runAuditedAction<T>(
  input: AuditedOperationInput,
  operation: (actor: AuditActor) => Promise<AuditOperationResult<T>>
) {
  const requestId = await getRequestId();
  const user = await getCurrentInternalUser();

  if (!user) {
    await appendAuditEvent({
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      result: "denied",
      requestId,
      context: { ...sanitizeAuditContext(input.context), reason: "unauthenticated" }
    });
    redirect("/sigeco/login");
  }

  const actor = { id: user.id, role: user.role };

  if (!roleHasPermission(user.role, input.permission)) {
    await appendAuditEvent({
      actor,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      result: "denied",
      requestId,
      context: { ...sanitizeAuditContext(input.context), reason: "missing_permission" }
    });
    redirect("/sigeco");
  }

  let operationResult: AuditOperationResult<T>;

  try {
    operationResult = await operation(actor);
  } catch (error) {
    if (error instanceof AuditAccessDeniedError) {
      await appendAuditEvent({
        actor,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        result: "denied",
        requestId,
        context: { ...sanitizeAuditContext(input.context), reason: error.reason }
      });
      redirect("/sigeco");
    }

    await appendAuditEvent({
      actor,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      result: "failure",
      requestId,
      context: input.context
    });
    throw error;
  }

  await appendAuditEvent({
    actor,
    action: input.action,
    entityType: input.entityType,
    entityId: operationResult.audit?.entityId ?? input.entityId,
    result: "success",
    requestId,
    context: operationResult.audit?.context ?? input.context
  });
  return operationResult.value;
}
