import { redirect } from "next/navigation";
import type { InternalPermission, InternalRole } from "@/generated/prisma/client";
import { appendAuditEvent, getRequestId } from "@/modules/audit/append";
import { roleHasPermission } from "@/features/internal-auth/permissions";
import { modulesEnablingPermission } from "@/features/modules/activation";
import { resolveModuleAccess } from "@/features/modules/access";
import type { SigecoModuleCode } from "@/features/modules/catalog";
import {
  moduleDisabledNotice,
  permissionDeniedNotice
} from "@/features/modules/notices";
import { getModuleAccessState } from "@/features/modules/request-state";
import { sanitizeAuditContext } from "@/modules/audit/sanitize";
import {
  BranchContextMismatchError,
  BranchContextUnavailableError,
  getBranchContext,
  type BranchRequestContext
} from "@/features/branches/context";
import { getCurrentInternalUser } from "@/modules/permissions";
import { branchOwnedEntityExists } from "@/modules/database/queries/branch-ownership";

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
  /**
   * Módulo al que pertenece la acción. Solo hace falta cuando el permiso lo
   * comparten varios módulos y la acción es de uno concreto: editar la ficha
   * desde Recepción usa `patients_update`, que Administración también tiene.
   * Sin fijarlo, esa acción seguiría disponible con Recepción apagada.
   */
  module?: SigecoModuleCode;
  action: string;
  entityType: string;
  entityId?: string | null;
  context?: unknown;
};

type BranchAuditedOperationInput = AuditedOperationInput & { branchless?: false };
type PlatformAuditedOperationInput = AuditedOperationInput & { branchless: true };
type BranchAuditedOperation<T> = (
  actor: AuditActor,
  branchContext: BranchRequestContext
) => Promise<AuditOperationResult<T>>;
type PlatformAuditedOperation<T> = (
  actor: AuditActor,
  branchContext: null
) => Promise<AuditOperationResult<T>>;

class AuditAccessDeniedError extends Error {
  constructor(public readonly reason: string) {
    super("AUDIT_ACCESS_DENIED");
    this.name = "AuditAccessDeniedError";
  }
}

export { appendAuditEvent } from "@/modules/audit/append";

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
export function runAuditedAction<T>(
  input: BranchAuditedOperationInput,
  operation: BranchAuditedOperation<T>
): Promise<T>;
export function runAuditedAction<T>(
  input: PlatformAuditedOperationInput,
  operation: PlatformAuditedOperation<T>
): Promise<T>;
export async function runAuditedAction<T>(
  input: BranchAuditedOperationInput | PlatformAuditedOperationInput,
  operation: BranchAuditedOperation<T> | PlatformAuditedOperation<T>
) {
  const requestId = await getRequestId();
  let branchContext: BranchRequestContext | null = null;
  let user;

  if (input.branchless) {
    if (input.action !== "user.password.change") {
      throw new Error("BRANCHLESS_AUDITED_ACTION_NOT_ALLOWED");
    }
    user = await getCurrentInternalUser();
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
  } else {
    try {
      branchContext = await getBranchContext();
      user = branchContext.user;
    } catch (error) {
      if (!(error instanceof BranchContextUnavailableError)) throw error;
      await appendAuditEvent({
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        result: "denied",
        requestId,
        context: { ...sanitizeAuditContext(input.context), reason: error.reason }
      });
      if (error.reason === "unauthenticated") redirect("/sigeco/login");
      if (error.reason === "password_change_required") {
        redirect("/sigeco/cambiar-contrasena");
      }
      redirect("/sigeco/seleccionar-sucursal");
    }
  }

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

  const operationalRole = branchContext?.operationalRole ?? user.role;
  const actor = { id: user.id, role: operationalRole };
  const auditedContext = {
    ...sanitizeAuditContext(input.context),
    ...(branchContext ? { branchCode: branchContext.activeBranch.code } : {})
  };

  if (user.mustChangePassword && input.action !== "user.password.change") {
    await appendAuditEvent({
      actor,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      result: "denied",
      requestId,
      context: { ...auditedContext, reason: "password_change_required" }
    });
    redirect("/sigeco/cambiar-contrasena");
  }

  if (!roleHasPermission(operationalRole, input.permission)) {
    await appendAuditEvent({
      actor,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      result: "denied",
      requestId,
      context: { ...auditedContext, reason: "missing_permission" }
    });
    redirect(`/sigeco?aviso=${permissionDeniedNotice}`);
  }

  // El módulo apagado se registra como un rechazo propio: Dirección puede
  // filtrar `module.disabled` en la auditoría y ver qué se intentó usar antes de
  // que esa etapa estuviera lanzada, sin confundirlo con una falta de permiso.
  const moduleAccess = resolveModuleAccess(
    operationalRole,
    await getModuleAccessState(),
    input.permission,
    input.module
  );

  if (moduleAccess === "blocked") {
    await appendAuditEvent({
      actor,
      action: "module.disabled",
      entityType: "module",
      entityId: input.module ?? null,
      result: "denied",
      requestId,
      context: {
        ...(branchContext ? { branchCode: branchContext.activeBranch.code } : {}),
        reason: "module_disabled",
        attemptedAction: input.action,
        attemptedEntityType: input.entityType,
        permission: input.permission,
        modules: input.module ? [input.module] : modulesEnablingPermission(input.permission)
      }
    });
    redirect(`/sigeco?aviso=${moduleDisabledNotice}`);
  }

  if (branchContext && input.entityId) {
    const belongsToActiveBranch = await branchOwnedEntityExists({
      entityType: input.entityType,
      entityId: input.entityId,
      branchCode: branchContext.activeBranch.code
    });

    if (belongsToActiveBranch === false) {
      await appendAuditEvent({
        actor,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        result: "denied",
        requestId,
        context: { ...auditedContext, reason: "entity_not_found" }
      });
      redirect("/sigeco");
    }
  }

  let operationResult: AuditOperationResult<T>;

  try {
    operationResult = branchContext
      ? await (operation as BranchAuditedOperation<T>)(actor, branchContext)
      : await (operation as PlatformAuditedOperation<T>)(actor, null);
  } catch (error) {
    if (error instanceof AuditAccessDeniedError || error instanceof BranchContextMismatchError) {
      await appendAuditEvent({
        actor,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        result: "denied",
        requestId,
        context: {
          ...auditedContext,
          reason:
            error instanceof BranchContextMismatchError
              ? "branch_context_mismatch"
              : error.reason
        }
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
      context: auditedContext
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
    context: {
      ...sanitizeAuditContext(operationResult.audit?.context ?? input.context),
      ...(branchContext ? { branchCode: branchContext.activeBranch.code } : {})
    }
  });
  return operationResult.value;
}
