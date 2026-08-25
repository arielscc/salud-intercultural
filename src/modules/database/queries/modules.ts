import { cache } from "react";
import type { InternalRole } from "@/generated/prisma/client";
import {
  moduleCanBeDeactivated,
  moduleIsActive,
  normalizeActiveModules,
  resolveActivationBlockers,
  resolveDeactivationBlockers,
  type ActiveModules
} from "@/features/modules/activation";
import {
  sigecoModuleCodes,
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

/**
 * Módulos que estuvieron encendidos y hoy están apagados: no es lo mismo que un
 * módulo que todavía no se lanzó. Se usa para avisar en el shell que hay una
 * parte de la operación suspendida.
 */
export async function getSuspendedModules(): Promise<
  { code: SigecoModuleCode; note: string | null; deactivatedAt: Date }[]
> {
  return withDatabaseError("getSuspendedModules", async () => {
    const rows = await prisma.moduleActivation.findMany({
      where: { status: "inactive", deactivatedAt: { not: null } },
      select: { code: true, note: true, deactivatedAt: true },
      orderBy: { deactivatedAt: "desc" }
    });

    return rows
      .filter((row) => isSigecoModuleCode(row.code))
      .map((row) => ({
        code: row.code as SigecoModuleCode,
        note: row.note,
        deactivatedAt: row.deactivatedAt as Date
      }));
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

/** Motivos por los que un cambio de estado se rechaza. */
export type ModuleActivationErrorCode =
  | "unknown_module"
  | "missing_dependencies"
  | "required_by_active_modules"
  | "always_active"
  | "reason_required";

export class ModuleActivationError extends Error {
  constructor(
    public readonly code: ModuleActivationErrorCode,
    public readonly blockers: readonly SigecoModuleCode[] = []
  ) {
    super(`MODULE_ACTIVATION_${code.toUpperCase()}`);
    this.name = "ModuleActivationError";
  }
}

export function isSigecoModuleCode(value: string): value is SigecoModuleCode {
  return (sigecoModuleCodes as readonly string[]).includes(value);
}

/**
 * Enciende o apaga un módulo y deja el cambio en el historial, en una sola
 * transacción. Aplica las dependencias duras en los dos sentidos: no se activa
 * un módulo sin sus prerrequisitos ni se apaga uno del que otro activo depende.
 *
 * Es la única escritura del estado. La pantalla del super administrador
 * (Tarea 5) y el script de línea de comandos la comparten para que no existan
 * dos caminos con reglas distintas.
 */
export async function setModuleActivation(input: {
  code: SigecoModuleCode;
  active: boolean;
  reason?: string | null;
  actorId?: string | null;
  actorRole?: InternalRole | null;
}) {
  const { code, active } = input;
  const reason = input.reason?.trim() || null;

  if (!isSigecoModuleCode(code)) throw new ModuleActivationError("unknown_module");
  if (!active && !moduleCanBeDeactivated(code)) {
    throw new ModuleActivationError("always_active");
  }
  // Apagar exige motivo: es la decisión que Dirección va a querer explicada.
  if (!active && !reason) throw new ModuleActivationError("reason_required");

  // La lectura y las validaciones quedan fuera de `withDatabaseError`: si el
  // rechazo se envolviera en un DatabaseError, la pantalla perdería el motivo y
  // no podría decir qué dependencia falta.
  const rows = await withDatabaseError("setModuleActivation.read", () =>
    prisma.moduleActivation.findMany({
      where: { status: "active" },
      select: { code: true }
    })
  );
  const activeModules = normalizeActiveModules(rows.map((row) => row.code));

  if (active) {
    const blockers = resolveActivationBlockers(activeModules, code);
    if (blockers.length > 0) {
      throw new ModuleActivationError("missing_dependencies", blockers);
    }
  } else {
    const blockers = resolveDeactivationBlockers(activeModules, code);
    if (blockers.length > 0) {
      throw new ModuleActivationError("required_by_active_modules", blockers);
    }
  }

  const alreadyInState = moduleIsActive(activeModules, code) === active;
  const now = new Date();

  return withDatabaseError("setModuleActivation", async () => {
    return prisma.$transaction(async (tx) => {
      const previousStatus = alreadyInState
        ? active
          ? "active"
          : "inactive"
        : active
          ? "inactive"
          : "active";

      const activation = await tx.moduleActivation.upsert({
        where: { code },
        create: {
          code,
          status: active ? "active" : "inactive",
          activatedAt: active ? now : null,
          activatedById: active ? (input.actorId ?? null) : null,
          note: reason
        },
        update: {
          status: active ? "active" : "inactive",
          ...(active
            ? { activatedAt: now, activatedById: input.actorId ?? null }
            : { deactivatedAt: now, deactivatedById: input.actorId ?? null }),
          note: reason
        }
      });

      // El historial registra incluso un cambio que no altera el estado: deja
      // ver que alguien lo intentó y cuándo.
      await tx.moduleActivationEvent.create({
        data: {
          moduleCode: code,
          previousStatus,
          status: active ? "active" : "inactive",
          reason,
          actorId: input.actorId ?? null,
          actorRole: input.actorRole ?? null
        }
      });

      return activation;
    });
  });
}
