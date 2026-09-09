import "server-only";

import { resolveBranchContext } from "@/features/branches/context";
import type { ActiveModules } from "@/features/modules/activation";
import type { ModuleAccessState } from "@/features/modules/access";
import {
  getModuleAccessStateForBranch,
  moduleAccessWithoutBranch
} from "@/modules/database/queries/modules";

/**
 * Estado de los módulos **de la sucursal activa del request**.
 *
 * Mantiene la firma sin argumentos que ya usaban las pantallas y las guardas,
 * así que la sede se resuelve en un solo lugar y no hay que pasarla a mano por
 * treinta y cinco sitios, donde olvidarla sería un agujero silencioso.
 *
 * Vive fuera de la capa de consultas a propósito: resolver la sucursal necesita
 * cookies y sesión, y arrastrar eso hasta `queries/modules` metía `server-only`
 * en un archivo que también importan los scripts de línea de comandos, donde no
 * hay request que resolver. Los scripts usan `getModuleAccessStateForBranch`.
 *
 * Sin sucursal resuelta devuelve solo el núcleo, que es el lado seguro: sin
 * saber en qué sede se está no se sabe qué está lanzado, y suponerlo abriría
 * pantallas que quizá esa sede todavía no tiene.
 */
export async function getModuleAccessState(): Promise<ModuleAccessState> {
  const resolution = await resolveBranchContext();
  if (!resolution.ok) return moduleAccessWithoutBranch;
  const state = await getModuleAccessStateForBranch(
    resolution.context.activeBranch.code
  );
  return {
    ...state,
    readOnly: resolution.context.accessMode === "consult"
  };
}

export async function getActiveModules(): Promise<ActiveModules> {
  return (await getModuleAccessState()).active;
}
