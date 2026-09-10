import type {
  InternalRole,
  PatientRouteArea,
  Prisma,
  VisitAreaTimeEventType
} from "@/generated/prisma/client";
import {
  aggregateAreaTimeReport,
  measuredRouteAreas,
  type AreaTimeEventRow
} from "@/features/area-times/report";
import type { AreaTimeTransitionInput } from "@/features/area-times/schema";
import { prisma, withDatabaseError } from "@/modules/database";

const roleArea: Partial<Record<InternalRole, PatientRouteArea>> = {
  recepcion: "recepcion",
  medico: "medico",
  enfermeria: "enfermeria",
  administracion: "administracion"
};

export async function appendAreaEnteredEvent(
  tx: Prisma.TransactionClient,
  input: {
    visitId: string;
    branchCode: string;
    routeStepId: string;
    area: PatientRouteArea;
    occurredAt: Date;
    recordedById?: string;
  }
) {
  if (!measuredRouteAreas.includes(input.area as (typeof measuredRouteAreas)[number])) {
    return;
  }
  await tx.visitAreaTimeEvent.create({
    data: {
      ...input,
      type: "entered",
      sequence: 1
    }
  });
}

export async function appendAreaExitedEvents(
  tx: Prisma.TransactionClient,
  input: {
    visitId: string;
    branchCode: string;
    routeStepIds: string[];
    areaByStepId: Map<string, PatientRouteArea>;
    occurredAt: Date;
    recordedById?: string;
  }
) {
  const maximumSequences = await tx.visitAreaTimeEvent.groupBy({
    by: ["routeStepId"],
    where: {
      branchCode: input.branchCode,
      routeStepId: { in: input.routeStepIds }
    },
    _max: { sequence: true }
  });
  const maximumByStep = new Map(
    maximumSequences.map((row) => [
      row.routeStepId,
      row._max.sequence ?? 0
    ])
  );
  const rows = input.routeStepIds
    .map((routeStepId) => ({
      routeStepId,
      area: input.areaByStepId.get(routeStepId)
    }))
    .filter(
      (
        row
      ): row is {
        routeStepId: string;
        area: PatientRouteArea;
      } =>
        Boolean(row.area) &&
        measuredRouteAreas.includes(
          row.area as (typeof measuredRouteAreas)[number]
        )
    )
    .map((row) => ({
      visitId: input.visitId,
      branchCode: input.branchCode,
      routeStepId: row.routeStepId,
      area: row.area,
      type: "exited" as const,
      sequence: (maximumByStep.get(row.routeStepId) ?? 0) + 1,
      occurredAt: input.occurredAt,
      recordedById: input.recordedById
    }));
  if (rows.length > 0) {
    await tx.visitAreaTimeEvent.createMany({
      data: rows,
      skipDuplicates: true
    });
  }
}

function phaseFromType(type: VisitAreaTimeEventType) {
  if (type === "entered" || type === "resumed_waiting") return "waiting";
  if (type === "attention_started" || type === "resumed_attention") {
    return "attention";
  }
  if (type === "blocked") return "blocked";
  return "closed";
}

export async function recordAreaTimeTransition(input: {
  data: AreaTimeTransitionInput;
  branchCode: string;
  userId: string;
  userRole: InternalRole;
}) {
  return withDatabaseError("recordAreaTimeTransition", () =>
    prisma.$transaction(
      async (tx) => {
        const visit = await tx.visit.findUniqueOrThrow({
          where: {
            id_branchCode: {
              id: input.data.visitId,
              branchCode: input.branchCode
            }
          },
          select: {
            id: true,
            status: true,
            route: {
              select: {
                active: true,
                currentArea: true,
                steps: {
                  where: { endedAt: null },
                  orderBy: { startedAt: "desc" },
                  take: 1,
                  select: {
                    id: true,
                    startedAt: true,
                    timeEvents: {
                      orderBy: { sequence: "asc" },
                      select: {
                        id: true,
                        type: true,
                        sequence: true,
                        occurredAt: true
                      }
                    }
                  }
                }
              }
            }
          }
        });
        const route = visit.route;
        const step = route?.steps[0];
        if (
          !route?.active ||
          !step ||
          !measuredRouteAreas.includes(
            route.currentArea as (typeof measuredRouteAreas)[number]
          )
        ) {
          throw new Error("AREA_TIME_VISIT_NOT_ACTIVE");
        }
        const assignedArea = roleArea[input.userRole];
        if (
          input.userRole !== "super_admin" &&
          assignedArea !== route.currentArea
        ) {
          throw new Error("AREA_TIME_WRONG_ROLE_AREA");
        }
        if (step.timeEvents.length === 0) {
          throw new Error("AREA_TIME_ENTRY_MISSING");
        }

        const last = step.timeEvents.at(-1);
        if (!last || last.type === "exited") {
          throw new Error("AREA_TIME_SESSION_CLOSED");
        }
        const currentPhase = phaseFromType(last.type);
        let type: VisitAreaTimeEventType;
        if (input.data.action === "start_attention") {
          if (currentPhase !== "waiting") {
            throw new Error("AREA_TIME_INVALID_TRANSITION");
          }
          type = "attention_started";
        } else if (input.data.action === "block") {
          if (!["waiting", "attention"].includes(currentPhase)) {
            throw new Error("AREA_TIME_INVALID_TRANSITION");
          }
          type = "blocked";
        } else {
          if (currentPhase !== "blocked") {
            throw new Error("AREA_TIME_INVALID_TRANSITION");
          }
          const previous = [...step.timeEvents]
            .reverse()
            .find((event) => phaseFromType(event.type) !== "blocked");
          type =
            previous && phaseFromType(previous.type) === "attention"
              ? "resumed_attention"
              : "resumed_waiting";
        }

        return tx.visitAreaTimeEvent.create({
          data: {
            visitId: visit.id,
            routeStepId: step.id,
            branchCode: input.branchCode,
            area: route.currentArea,
            type,
            sequence: last.sequence + 1,
            reason:
              input.data.action === "block" ? input.data.reason : undefined,
            recordedById: input.userId
          }
        });
      },
      { isolationLevel: "Serializable" }
    )
  );
}

export async function getVisitAreaTimingState(visitId: string, branchCode: string) {
  return withDatabaseError("getVisitAreaTimingState", async () => {
    const visit = await prisma.visit.findUnique({
      where: { id_branchCode: { id: visitId, branchCode } },
      select: {
        id: true,
        status: true,
        route: {
          select: {
            active: true,
            currentArea: true,
            steps: {
              where: { endedAt: null },
              orderBy: { startedAt: "desc" },
              take: 1,
              select: {
                id: true,
                startedAt: true,
                timeEvents: {
                  orderBy: { sequence: "asc" },
                  select: {
                    type: true,
                    sequence: true,
                    reason: true,
                    inferred: true,
                    occurredAt: true
                  }
                }
              }
            }
          }
        }
      }
    });
    const route = visit?.route;
    const step = route?.steps[0];
    const last = step?.timeEvents.at(-1);
    if (!visit || !route?.active || !step || !last || last.type === "exited") {
      return null;
    }
    return {
      visitId: visit.id,
      area: route.currentArea,
      phase: phaseFromType(last.type) as "waiting" | "attention" | "blocked",
      phaseStartedAt: last.occurredAt,
      enteredAt:
        step.timeEvents.find((event) => event.type === "entered")?.occurredAt ??
        step.startedAt,
      inferred: step.timeEvents.some((event) => event.inferred),
      blockReason: last.type === "blocked" ? last.reason : null
    };
  });
}

export type AreaTimeReportFilters = {
  branchCode: string;
  from?: Date;
  to?: Date;
  area?: (typeof measuredRouteAreas)[number];
};

export async function getAreaTimeReport(
  input: AreaTimeReportFilters,
  asOf = new Date()
) {
  return withDatabaseError("getAreaTimeReport", async () => {
    const steps = await prisma.patientRouteStep.findMany({
      where: {
        branchCode: input.branchCode,
        area: input.area,
        startedAt:
          input.from || input.to
            ? { gte: input.from, lt: input.to }
            : undefined,
        route: {
          visit: {
            branchCode: input.branchCode,
            isTestData: false,
            status: { not: "cancelled" }
          }
        }
      },
      select: {
        id: true,
        timeEvents: {
          orderBy: { sequence: "asc" },
          select: {
            id: true,
            visitId: true,
            routeStepId: true,
            area: true,
            type: true,
            sequence: true,
            occurredAt: true,
            inferred: true,
            reason: true
          }
        },
        route: {
          select: {
            visit: {
              select: {
                branchCode: true,
                status: true,
                isTestData: true,
                patient: {
                  select: {
                    id: true,
                    internalCode: true,
                    fullName: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { startedAt: "desc" }
    });
    const events: AreaTimeEventRow[] = steps.flatMap((step) => {
      const visit = step.route.visit;
      return step.timeEvents.map((event) => ({
        ...event,
        branchCode: visit.branchCode,
        visitStatus: visit.status,
        isTestData: visit.isTestData,
        patient: visit.patient
      }));
    });
    return aggregateAreaTimeReport(events, asOf);
  });
}
