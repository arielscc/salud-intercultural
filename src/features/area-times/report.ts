import type {
  PatientRouteArea,
  VisitAreaTimeEventType,
  VisitStatus
} from "@/generated/prisma/client";
import { formatTime, todayDateOnly } from "@/lib/dates";

export const measuredRouteAreas = [
  "recepcion",
  "medico",
  "enfermeria",
  "administracion"
] as const satisfies readonly PatientRouteArea[];

export const AREA_WAIT_ALERT_MINUTES = 30;

type MeasuredArea = (typeof measuredRouteAreas)[number];
type ActivePhase = "waiting" | "attention" | "blocked";

export type AreaTimeEventRow = {
  id: string;
  visitId: string;
  routeStepId: string;
  area: PatientRouteArea;
  type: VisitAreaTimeEventType;
  sequence: number;
  occurredAt: Date;
  inferred: boolean;
  reason: string | null;
  branchCode: string;
  visitStatus: VisitStatus;
  isTestData: boolean;
  patient: {
    id: string;
    internalCode: string;
    fullName: string;
  };
};

export type AreaTimeSession = {
  visitId: string;
  routeStepId: string;
  area: MeasuredArea;
  branchCode: string;
  patient: AreaTimeEventRow["patient"];
  enteredAt: Date;
  exitedAt: Date | null;
  totalMs: number;
  waitingMs: number;
  attentionMs: number;
  blockedMs: number;
  currentPhase: ActivePhase | null;
  currentPhaseStartedAt: Date | null;
  abandoned: boolean;
  inferred: boolean;
  invalidSequence: boolean;
};

export type DurationStats = {
  count: number;
  averageMs: number;
  medianMs: number;
  p75Ms: number;
  p90Ms: number;
};

function eventPhase(type: VisitAreaTimeEventType): ActivePhase | null {
  if (type === "entered" || type === "resumed_waiting") return "waiting";
  if (type === "attention_started" || type === "resumed_attention") {
    return "attention";
  }
  if (type === "blocked") return "blocked";
  return null;
}

function percentile(values: number[], fraction: number) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.max(0, Math.ceil(sorted.length * fraction) - 1);
  return sorted[index] ?? 0;
}

export function durationStats(values: number[]): DurationStats {
  const safe = values.filter(
    (value) => Number.isFinite(value) && value >= 0
  );
  return {
    count: safe.length,
    averageMs:
      safe.length > 0
        ? Math.round(safe.reduce((total, value) => total + value, 0) / safe.length)
        : 0,
    medianMs: percentile(safe, 0.5),
    p75Ms: percentile(safe, 0.75),
    p90Ms: percentile(safe, 0.9)
  };
}

function addElapsed(
  session: Pick<
    AreaTimeSession,
    "waitingMs" | "attentionMs" | "blockedMs"
  >,
  phase: ActivePhase | null,
  elapsed: number
) {
  if (phase === "waiting") session.waitingMs += elapsed;
  if (phase === "attention") session.attentionMs += elapsed;
  if (phase === "blocked") session.blockedMs += elapsed;
}

function summarizeSession(
  events: AreaTimeEventRow[],
  asOf: Date
): AreaTimeSession | null {
  const ordered = [...events].sort(
    (left, right) =>
      left.sequence - right.sequence ||
      left.occurredAt.getTime() - right.occurredAt.getTime()
  );
  const entered = ordered.find((event) => event.type === "entered");
  if (!entered || !measuredRouteAreas.includes(entered.area as MeasuredArea)) {
    return null;
  }

  const session: AreaTimeSession = {
    visitId: entered.visitId,
    routeStepId: entered.routeStepId,
    area: entered.area as MeasuredArea,
    branchCode: entered.branchCode,
    patient: entered.patient,
    enteredAt: entered.occurredAt,
    exitedAt: null,
    totalMs: 0,
    waitingMs: 0,
    attentionMs: 0,
    blockedMs: 0,
    currentPhase: null,
    currentPhaseStartedAt: null,
    abandoned: entered.visitStatus === "left_without_care",
    inferred: ordered.some((event) => event.inferred),
    invalidSequence: ordered[0]?.type !== "entered"
  };

  let phase: ActivePhase | null = null;
  let phaseStartedAt = entered.occurredAt;
  let exited = false;

  for (const event of ordered) {
    if (event.occurredAt < phaseStartedAt || exited) {
      session.invalidSequence = true;
      continue;
    }
    const elapsed = Math.max(
      0,
      event.occurredAt.getTime() - phaseStartedAt.getTime()
    );
    if (!session.inferred) addElapsed(session, phase, elapsed);

    const transitionIsValid =
      (event.type === "entered" && phase === null && event === ordered[0]) ||
      (event.type === "attention_started" && phase === "waiting") ||
      (event.type === "blocked" &&
        (phase === "waiting" || phase === "attention")) ||
      ((event.type === "resumed_waiting" ||
        event.type === "resumed_attention") &&
        phase === "blocked") ||
      (event.type === "exited" && phase !== null);
    if (!transitionIsValid) session.invalidSequence = true;

    if (event.type === "exited") {
      session.exitedAt = event.occurredAt;
      session.totalMs = Math.max(
        0,
        event.occurredAt.getTime() - entered.occurredAt.getTime()
      );
      phase = null;
      exited = true;
    } else {
      const nextPhase = eventPhase(event.type);
      if (!nextPhase) {
        session.invalidSequence = true;
      } else {
        phase = nextPhase;
        phaseStartedAt = event.occurredAt;
      }
    }
  }

  if (!exited) {
    const end = asOf > phaseStartedAt ? asOf : phaseStartedAt;
    if (!session.inferred) {
      addElapsed(session, phase, end.getTime() - phaseStartedAt.getTime());
    }
    session.totalMs = Math.max(
      0,
      end.getTime() - entered.occurredAt.getTime()
    );
    session.currentPhase = phase;
    session.currentPhaseStartedAt = phase ? phaseStartedAt : null;
  }

  return session;
}

function groupSessions(events: AreaTimeEventRow[], asOf: Date) {
  const byStep = new Map<string, AreaTimeEventRow[]>();
  for (const event of events) {
    if (event.isTestData || event.visitStatus === "cancelled") continue;
    const rows = byStep.get(event.routeStepId) ?? [];
    rows.push(event);
    byStep.set(event.routeStepId, rows);
  }
  return Array.from(byStep.values())
    .map((rows) => summarizeSession(rows, asOf))
    .filter((session): session is AreaTimeSession => Boolean(session));
}

export function aggregateAreaTimeReport(
  events: AreaTimeEventRow[],
  asOf = new Date()
) {
  const sessions = groupSessions(events, asOf);
  const measuredClosed = sessions.filter(
    (session) =>
      Boolean(session.exitedAt) &&
      !session.inferred &&
      !session.invalidSequence
  );

  const areas = measuredRouteAreas.map((area) => {
    const rows = measuredClosed.filter((session) => session.area === area);
    return {
      area,
      sessions: rows.length,
      abandoned: rows.filter((session) => session.abandoned).length,
      waiting: durationStats(rows.map((session) => session.waitingMs)),
      attention: durationStats(rows.map((session) => session.attentionMs)),
      blocked: durationStats(rows.map((session) => session.blockedMs)),
      total: durationStats(rows.map((session) => session.totalMs))
    };
  });

  const daily = new Map<string, AreaTimeSession[]>();
  const hourly = new Map<string, AreaTimeSession[]>();
  for (const session of measuredClosed) {
    const day = todayDateOnly(session.enteredAt);
    const hour = Number(formatTime(session.enteredAt).slice(0, 2));
    const dailyKey = `${day}:${session.area}`;
    const hourlyKey = `${hour}:${session.area}`;
    daily.set(dailyKey, [...(daily.get(dailyKey) ?? []), session]);
    hourly.set(hourlyKey, [...(hourly.get(hourlyKey) ?? []), session]);
  }

  const trendMetrics = (rows: AreaTimeSession[]) => ({
    sessions: rows.length,
    averageWaitMs: durationStats(rows.map((row) => row.waitingMs)).averageMs,
    p90WaitMs: durationStats(rows.map((row) => row.waitingMs)).p90Ms,
    averageTotalMs: durationStats(rows.map((row) => row.totalMs)).averageMs
  });

  return {
    sessions,
    totals: {
      sessions: measuredClosed.length,
      abandoned: measuredClosed.filter((session) => session.abandoned).length,
      waiting: durationStats(
        measuredClosed.map((session) => session.waitingMs)
      ),
      attention: durationStats(
        measuredClosed.map((session) => session.attentionMs)
      ),
      blocked: durationStats(
        measuredClosed.map((session) => session.blockedMs)
      ),
      total: durationStats(measuredClosed.map((session) => session.totalMs))
    },
    areas,
    daily: Array.from(daily.entries())
      .map(([key, rows]) => {
        const [date, area] = key.split(":") as [string, MeasuredArea];
        return { date, area, ...trendMetrics(rows) };
      })
      .sort((left, right) =>
        `${left.date}:${left.area}`.localeCompare(`${right.date}:${right.area}`)
      ),
    hourly: Array.from(hourly.entries())
      .map(([key, rows]) => {
        const [hour, area] = key.split(":") as [string, MeasuredArea];
        return { hour: Number(hour), area, ...trendMetrics(rows) };
      })
      .sort((left, right) => left.hour - right.hour),
    active: sessions
      .filter((session) => !session.exitedAt)
      .sort((left, right) => right.totalMs - left.totalMs),
    quality: {
      inferredSessions: sessions.filter((session) => session.inferred).length,
      invalidSequences: sessions.filter((session) => session.invalidSequence)
        .length,
      closedWithoutExit: sessions.filter(
        (session) =>
          !session.exitedAt &&
          ["completed", "left_without_care"].includes(
            events.find((event) => event.routeStepId === session.routeStepId)
              ?.visitStatus ?? ""
          )
      ).length
    }
  };
}

export function formatDurationShort(milliseconds: number) {
  const totalMinutes = Math.max(0, Math.round(milliseconds / 60_000));
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours} h ${minutes} min` : `${hours} h`;
}
