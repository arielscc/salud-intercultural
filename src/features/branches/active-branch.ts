import "server-only";

import { cache } from "react";
import { resolveBranchContext } from "@/features/branches/context";
import {
  getInternalSessionToken,
  getInternalUserBySessionToken
} from "@/features/internal-auth/session";

/**
 * Código de la sucursal activa del request, o `null` si no hay ninguna.
 *
 * Existe porque la activación de módulos es por sucursal y las ~35 pantallas
 * que preguntan qué está encendido no reciben la sede como parámetro: la
 * resuelven por aquí, una sola vez por request gracias a `cache`.
 *
 * Devuelve `null` sin sesión, sin usuario o sin sede asignada y abierta. Quien
 * lo consume trata ese caso como "ningún módulo encendido", que es el lado
 * seguro: sin sucursal no se sabe qué está lanzado, y adivinar habilitaría
 * pantallas. Un fallo de base **no** se convierte en `null`: se propaga, para
 * que la pantalla diga que la base no responde en vez de fingir que no hay
 * módulos.
 *
 * No usa `getCurrentInternalUser` de `@/modules/permissions` a propósito: ese
 * módulo depende de las consultas de módulos, y usarlo aquí cerraría el ciclo.
 */
export const getActiveBranchCode = cache(async (): Promise<string | null> => {
  const token = await getInternalSessionToken();
  if (!token) return null;

  const user = await getInternalUserBySessionToken(token);
  if (!user) return null;

  const { activeBranch } = await resolveBranchContext(user);
  return activeBranch?.code ?? null;
});
