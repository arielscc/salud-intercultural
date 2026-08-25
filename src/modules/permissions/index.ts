import { redirect } from "next/navigation";
import type { InternalPermission, InternalRole } from "@/generated/prisma/client";
import { roleHasPermission } from "@/features/internal-auth/permissions";
import { modulesEnablingPermission } from "@/features/modules/activation";
import { resolveModuleAccess } from "@/features/modules/access";
import type { SigecoModuleCode } from "@/features/modules/catalog";
import { moduleDisabledNotice, permissionDeniedNotice } from "@/features/modules/notices";
import {
  getInternalSessionByToken,
  getInternalSessionToken,
  getInternalUserBySessionToken
} from "@/features/internal-auth/session";
import { appendAuditEvent } from "@/modules/audit/append";
import { getModuleAccessState } from "@/modules/database/queries/modules";

export async function getCurrentInternalUser() {
  const token = await getInternalSessionToken();

  if (!token) return null;

  return getInternalUserBySessionToken(token);
}

export async function requireInternalUser() {
  const user = await getCurrentInternalUser();

  if (!user) {
    redirect("/sigeco/login");
  }
  if (user.mustChangePassword) {
    redirect("/sigeco/cambiar-contrasena");
  }

  return user;
}

export async function getCurrentInternalSession() {
  const token = await getInternalSessionToken();
  if (!token) return null;
  return getInternalSessionByToken(token);
}

export async function requireInternalSession() {
  const session = await getCurrentInternalSession();
  if (!session) redirect("/sigeco/login");
  return session;
}

/**
 * Verifica si un permiso está habilitado por el lanzamiento por etapas.
 *
 * Sin `module`, alcanza con que uno de los módulos que declaran el permiso esté
 * activo. Con `module`, manda la ruta: se usa cuando una pantalla pertenece a un
 * módulo concreto pero comparte permiso con otro. `/sigeco/inventario` usa
 * `inventory_read`, que también habilitan Administración y Compras; sin fijar el
 * módulo, la pantalla de Inventario seguiría abierta con Inventario apagado.
 */
async function moduleAccessFor(
  role: InternalRole,
  permission: InternalPermission,
  module?: SigecoModuleCode
) {
  return resolveModuleAccess(role, await getModuleAccessState(), permission, module);
}

/**
 * Guarda de página. Exige el permiso del rol y, además, que el módulo esté
 * lanzado. El super administrador tampoco evade el módulo: lo que puede hacer es
 * encenderlo desde `/sigeco/modulos`.
 */
export async function requirePermission(
  permission: InternalPermission,
  options?: { module?: SigecoModuleCode }
) {
  const user = await requireInternalUser();
  const actor = { id: user.id, role: user.role };

  if (!roleHasPermission(user.role, permission)) {
    // Entrar por URL a una pantalla que el rol no tiene deja rastro: el menú
    // nunca la ofrece, así que un intento es una señal, no ruido.
    await appendAuditEvent({
      actor,
      action: "page.denied",
      entityType: "page",
      result: "denied",
      context: { permission, reason: "missing_permission" }
    });
    redirect(`/sigeco?aviso=${permissionDeniedNotice}`);
  }

  // Un módulo suspendido conserva la lectura para Dirección y el super
  // administrador; la escritura queda bloqueada para todos, ellos incluidos.
  if ((await moduleAccessFor(user.role, permission, options?.module)) === "blocked") {
    await appendAuditEvent({
      actor,
      action: "module.disabled",
      entityType: "module",
      entityId: options?.module ?? null,
      result: "denied",
      context: {
        reason: "module_disabled",
        permission,
        modules: options?.module
          ? [options.module]
          : modulesEnablingPermission(permission)
      }
    });
    redirect(`/sigeco?aviso=${moduleDisabledNotice}`);
  }

  return user;
}

/**
 * Guarda de módulo sin permiso asociado, para pantallas o rutas que pertenecen a
 * un módulo pero no piden un permiso propio.
 */
export async function requireModule(module: SigecoModuleCode) {
  const user = await requireInternalUser();
  const { active } = await getModuleAccessState();

  if (!active.includes(module) && module !== "core") {
    await appendAuditEvent({
      actor: { id: user.id, role: user.role },
      action: "module.disabled",
      entityType: "module",
      entityId: module,
      result: "denied",
      context: { reason: "module_disabled", modules: [module] }
    });
    redirect(`/sigeco?aviso=${moduleDisabledNotice}`);
  }

  return user;
}
