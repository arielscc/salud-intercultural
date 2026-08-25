import { cache } from "react";
import type { InternalRole } from "@/generated/prisma/client";
import {
  normalizeActiveModules,
  type ActiveModules
} from "@/features/modules/activation";
import {
  sigecoModules,
  type SigecoModule,
  type SigecoModuleCode
} from "@/features/modules/catalog";
import { prisma, withDatabaseError } from "@/modules/database";

/**
 * Lectura del estado de activación de los módulos.
 *
 * El catálogo vive en código; la base solo guarda el estado. Una fila con un
 * código que ya no existe en el catálogo se descarta, y un módulo del catálogo
 * sin fila queda apagado: nunca se asume activo por omisión.
 */

/**
 * Módulos encendidos. Memoizado por request con `cache` de React: el layout, el
 * gate de permisos y cada página lo piden por separado dentro del mismo render
 * y solo debe costar una consulta.
 *
 * Cuidado al usarlo dentro de una acción que acaba de cambiar el estado: en ese
 * mismo request seguirá devolviendo el valor anterior. Las acciones de la Tarea
 * 5 revalidan y redirigen, así que el siguiente render lee el estado nuevo.
 */
export const getActiveModules = cache(async (): Promise<ActiveModules> => {
  return withDatabaseError("getActiveModules", async () => {
    const rows = await prisma.moduleActivation.findMany({
      where: { status: "active" },
      select: { code: true }
    });

    return normalizeActiveModules(rows.map((row) => row.code));
  });
});

const actorSelect = { id: true, name: true, email: true, role: true } as const;

export type ModuleActivationActor = {
  id: string;
  name: string | null;
  email: string;
  role: InternalRole;
};

export type ModuleActivationState = Pick<
  SigecoModule,
  "code" | "name" | "description" | "dependsOn"
> & {
  alwaysActive: boolean;
  active: boolean;
  activatedAt: Date | null;
  activatedBy: ModuleActivationActor | null;
  deactivatedAt: Date | null;
  deactivatedBy: ModuleActivationActor | null;
  note: string | null;
};

/**
 * Estado de los once módulos, en el orden del catálogo. Une lo declarado en
 * código con lo guardado en base para que la pantalla del super administrador
 * (Tarea 5) no tenga que cruzarlos por su cuenta.
 */
export async function getModuleActivationStates(): Promise<ModuleActivationState[]> {
  return withDatabaseError("getModuleActivationStates", async () => {
    const rows = await prisma.moduleActivation.findMany({
      select: {
        code: true,
        status: true,
        activatedAt: true,
        deactivatedAt: true,
        note: true,
        activatedBy: { select: actorSelect },
        deactivatedBy: { select: actorSelect }
      }
    });
    const byCode = new Map(rows.map((row) => [row.code, row]));

    return sigecoModules.map((entry) => {
      const row = byCode.get(entry.code);
      const alwaysActive = entry.alwaysActive === true;

      return {
        code: entry.code,
        name: entry.name,
        description: entry.description,
        dependsOn: entry.dependsOn,
        alwaysActive,
        // Sin fila, el módulo está apagado. El núcleo es activo por definición.
        active: alwaysActive || row?.status === "active",
        activatedAt: row?.activatedAt ?? null,
        activatedBy: row?.activatedBy ?? null,
        deactivatedAt: row?.deactivatedAt ?? null,
        deactivatedBy: row?.deactivatedBy ?? null,
        note: row?.note ?? null
      };
    });
  });
}

export type ModuleActivationHistoryEntry = {
  id: string;
  moduleCode: string;
  previousStatus: "active" | "inactive";
  status: "active" | "inactive";
  reason: string | null;
  actor: ModuleActivationActor | null;
  actorRole: InternalRole | null;
  occurredAt: Date;
};

/**
 * Historial append-only, del cambio más reciente al más antiguo. Sin `code`
 * devuelve el historial completo, que es lo que revisa Dirección.
 */
export async function getModuleActivationHistory(options?: {
  code?: SigecoModuleCode;
  limit?: number;
}): Promise<ModuleActivationHistoryEntry[]> {
  const limit = Math.min(Math.max(options?.limit ?? 50, 1), 200);

  return withDatabaseError("getModuleActivationHistory", async () => {
    const events = await prisma.moduleActivationEvent.findMany({
      where: options?.code ? { moduleCode: options.code } : undefined,
      select: {
        id: true,
        moduleCode: true,
        previousStatus: true,
        status: true,
        reason: true,
        actorRole: true,
        occurredAt: true,
        actor: { select: actorSelect }
      },
      orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
      take: limit
    });

    return events.map((event) => ({
      id: event.id,
      moduleCode: event.moduleCode,
      previousStatus: event.previousStatus,
      status: event.status,
      reason: event.reason,
      actor: event.actor,
      actorRole: event.actorRole,
      occurredAt: event.occurredAt
    }));
  });
}
