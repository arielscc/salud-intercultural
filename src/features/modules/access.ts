import type { InternalPermission, InternalRole } from "@/generated/prisma/enums";
import { roleHasPermission } from "@/features/internal-auth/permissions";
import {
  moduleIsActive,
  permissionIsEnabled,
  type ActiveModules
} from "@/features/modules/activation";
import type { SigecoModuleCode } from "@/features/modules/catalog";

/**
 * ¿Se puede ofrecer esto en la interfaz?
 *
 * Repite la misma regla que aplica `requirePermission` en el servidor: el rol
 * tiene el permiso **y** el módulo está lanzado. Se usa para decidir qué mostrar;
 * el control real sigue siendo el del servidor. Que las dos capas usen la misma
 * función evita que el menú ofrezca una pantalla que después rebota al inicio.
 *
 * `module` fija la pertenencia cuando varios módulos comparten el permiso, igual
 * que en la guarda de servidor.
 */
export function canUse(
  role: InternalRole,
  activeModules: ActiveModules,
  permission: InternalPermission,
  module?: SigecoModuleCode
) {
  if (!roleHasPermission(role, permission)) return false;

  return module
    ? moduleIsActive(activeModules, module)
    : permissionIsEnabled(activeModules, permission);
}
