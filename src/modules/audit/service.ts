import { redirect } from "next/navigation";
import type { InternalPermission, InternalRole } from "@/generated/prisma/client";
import { appendAuditEvent, getRequestId } from "@/modules/audit/append";
import { roleHasPermission } from "@/features/internal-auth/permissions";
import {
  moduleIsActive,
  modulesEnablingPermission,
  permissionIsEnabled
} from "@/features/modules/activation";
import type { SigecoModuleCode } from "@/features/modules/catalog";
import {
  moduleDisabledNotice,
  permissionDeniedNotice
} from "@/features/modules/notices";
import { getActiveModules } from "@/modules/database/queries/modules";
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

  if (user.mustChangePassword && input.action !== "user.password.change") {
    await appendAuditEvent({
      actor,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      result: "denied",
      requestId,
      context: { reason: "password_change_required" }
    });
    redirect("/sigeco/cambiar-contrasena");
  }

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
    redirect(`/sigeco?aviso=${permissionDeniedNotice}`);
  }

  // El módulo apagado se registra como un rechazo propio: Dirección puede
  // filtrar `module.disabled` en la auditoría y ver qué se intentó usar antes de
  // que esa etapa estuviera lanzada, sin confundirlo con una falta de permiso.
  const activeModules = await getActiveModules();
  const moduleEnabled = input.module
    ? moduleIsActive(activeModules, input.module)
    : permissionIsEnabled(activeModules, input.permission);

  if (!moduleEnabled) {
    await appendAuditEvent({
      actor,
      action: "module.disabled",
      entityType: "module",
      entityId: input.module ?? null,
      result: "denied",
      requestId,
      context: {
        reason: "module_disabled",
        attemptedAction: input.action,
        attemptedEntityType: input.entityType,
        permission: input.permission,
        modules: input.module ? [input.module] : modulesEnablingPermission(input.permission)
      }
    });
    redirect(`/sigeco?aviso=${moduleDisabledNotice}`);
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
