/**
 * Helpers puros de activación de módulos.
 *
 * No importan Prisma ni `server-only`: los usan tanto el gate de servidor
 * (Tarea 3) como la navegación y las pantallas cliente (Tarea 4), que reciben
 * los módulos activos como dato desde el layout.
 */
import type { InternalPermission } from "@/generated/prisma/enums";
import {
  getSigecoModule,
  sigecoModuleCodes,
  sigecoModules,
  type SigecoModuleCode
} from "@/features/modules/catalog";
import { permissionModules } from "@/features/modules/permission-modules";

/** Códigos de los módulos encendidos, tal como los devuelve la base. */
export type ActiveModules = readonly SigecoModuleCode[];

const knownModuleCodes = new Set<string>(sigecoModuleCodes);

/**
 * Convierte lo guardado en base en una lista confiable: descarta códigos que ya
 * no existen en el catálogo, elimina repetidos y garantiza que el núcleo esté
 * siempre presente. Un módulo del catálogo sin fila queda apagado; nunca se
 * asume activo por omisión.
 */
export function normalizeActiveModules(codes: Iterable<string>): SigecoModuleCode[] {
  const active = new Set<SigecoModuleCode>();
  for (const code of codes) {
    if (knownModuleCodes.has(code)) active.add(code as SigecoModuleCode);
  }
  for (const entry of sigecoModules) {
    if (entry.alwaysActive) active.add(entry.code);
  }
  // Orden del catálogo, para que la lista sea estable entre requests.
  return sigecoModules.filter((entry) => active.has(entry.code)).map((entry) => entry.code);
}

export function moduleIsActive(activeModules: ActiveModules, code: SigecoModuleCode) {
  if (getSigecoModule(code).alwaysActive) return true;
  return activeModules.includes(code);
}

/** Módulos que habilitan un permiso. Vacío significa permiso retirado. */
export function modulesEnablingPermission(permission: InternalPermission) {
  return permissionModules[permission] ?? [];
}

/**
 * Un permiso está habilitado cuando al menos uno de sus módulos está activo.
 * Esto no reemplaza al permiso del rol: es una condición adicional.
 */
export function permissionIsEnabled(
  activeModules: ActiveModules,
  permission: InternalPermission
) {
  return modulesEnablingPermission(permission).some((code) =>
    moduleIsActive(activeModules, code)
  );
}

/** Recorre las dependencias duras de un módulo, incluidas las indirectas. */
function collectDependencies(code: SigecoModuleCode, seen = new Set<SigecoModuleCode>()) {
  for (const dependency of getSigecoModule(code).dependsOn) {
    if (seen.has(dependency)) continue;
    seen.add(dependency);
    collectDependencies(dependency, seen);
  }
  return seen;
}

/**
 * Qué falta encender antes de activar un módulo. Devuelve también las
 * dependencias indirectas —activar Enfermería con todo apagado exige Consulta y
 * Recepción— para que la pantalla pueda decir exactamente qué falta.
 * Vacío significa que se puede activar.
 */
export function resolveActivationBlockers(
  activeModules: ActiveModules,
  code: SigecoModuleCode
): readonly SigecoModuleCode[] {
  const missing = collectDependencies(code);
  return sigecoModules
    .filter((entry) => missing.has(entry.code) && !moduleIsActive(activeModules, entry.code))
    .map((entry) => entry.code);
}

/** El núcleo no se apaga; el resto sí, con motivo y auditoría. */
export function moduleCanBeDeactivated(code: SigecoModuleCode) {
  return !getSigecoModule(code).alwaysActive;
}

/**
 * Qué hay que apagar antes de apagar un módulo: los módulos activos que
 * dependen de él, directa o indirectamente. Es la misma regla dura vista desde
 * el otro lado; sin esto se podría apagar Recepción y dejar Consulta encendida.
 */
export function resolveDeactivationBlockers(
  activeModules: ActiveModules,
  code: SigecoModuleCode
): readonly SigecoModuleCode[] {
  return sigecoModules
    .filter(
      (entry) =>
        entry.code !== code &&
        moduleIsActive(activeModules, entry.code) &&
        collectDependencies(entry.code).has(code)
    )
    .map((entry) => entry.code);
}
