import type { InternalPermission, InternalRole } from "@/generated/prisma/enums";
import { roleHasPermission } from "@/features/internal-auth/permissions";
import {
  moduleIsActive,
  modulesEnablingPermission,
  permissionIsEnabled,
  type ActiveModules
} from "@/features/modules/activation";
import type { SigecoModuleCode } from "@/features/modules/catalog";
import { isReadPermission } from "@/features/modules/permission-access";

/**
 * Estado de los módulos para decidir accesos.
 *
 * `suspended` son los que estuvieron lanzados y hoy están apagados. No es lo
 * mismo que un módulo que nunca se encendió: ahí no hay trabajo abierto que
 * consultar, y por eso permanece cerrado para todos.
 */
export type ModuleAccessState = {
  active: ActiveModules;
  suspended: readonly SigecoModuleCode[];
};

/**
 * Quiénes conservan la lectura de un módulo suspendido. Dirección decide qué
 * hacer con lo que quedó abierto y el super administrador vuelve a encenderlo;
 * el resto del personal no tiene nada que resolver ahí.
 */
export function roleKeepsSuspendedAccess(role: InternalRole) {
  return role === "direccion" || role === "super_admin";
}

function targetModules(
  permission: InternalPermission,
  module?: SigecoModuleCode
): readonly SigecoModuleCode[] {
  return module ? [module] : modulesEnablingPermission(permission);
}

export type ModuleAccess = "allowed" | "read_only" | "blocked";

/**
 * Resuelve el acceso de un rol a algo protegido por un permiso.
 *
 * - `allowed`: el módulo está lanzado.
 * - `read_only`: el módulo está suspendido, el permiso es de lectura y el rol
 *   conserva la consulta. Nunca se devuelve para un permiso de escritura.
 * - `blocked`: cualquier otro caso.
 */
export function resolveModuleAccess(
  role: InternalRole,
  access: ModuleAccessState,
  permission: InternalPermission,
  module?: SigecoModuleCode
): ModuleAccess {
  const enabled = module
    ? moduleIsActive(access.active, module)
    : permissionIsEnabled(access.active, permission);

  if (enabled) return "allowed";
  if (!isReadPermission(permission) || !roleKeepsSuspendedAccess(role)) return "blocked";

  const suspended = targetModules(permission, module).some((code) =>
    access.suspended.includes(code)
  );

  return suspended ? "read_only" : "blocked";
}

/**
 * ¿Se puede ofrecer esto en la interfaz?
 *
 * Repite la misma regla que aplica `requirePermission` en el servidor: el rol
 * tiene el permiso y el módulo lo permite. Que las dos capas usen la misma
 * función evita que el menú ofrezca una pantalla que después rebota al inicio.
 *
 * En un módulo suspendido devuelve `true` para lo que se puede mirar y `false`
 * para lo que se puede cambiar: es lo que deja la pantalla en solo lectura sin
 * tocar cada formulario.
 */
export function canUse(
  role: InternalRole,
  access: ModuleAccessState,
  permission: InternalPermission,
  module?: SigecoModuleCode
) {
  if (!roleHasPermission(role, permission)) return false;

  return resolveModuleAccess(role, access, permission, module) !== "blocked";
}

/** El módulo del que depende esta pantalla está suspendido, no apagado de origen. */
export function isReadOnlyAccess(
  role: InternalRole,
  access: ModuleAccessState,
  permission: InternalPermission,
  module?: SigecoModuleCode
) {
  return resolveModuleAccess(role, access, permission, module) === "read_only";
}
