import { describe, expect, it } from "vitest";
import type { AreaTimeEventRow } from "@/features/area-times/report";
import {
  aggregateAreaTimeReport,
  durationStats,
  formatDurationShort
} from "@/features/area-times/report";

const minute = 60_000;

function event(
  type: AreaTimeEventRow["type"],
  minuteOffset: number,
  overrides: Partial<AreaTimeEventRow> = {}
): AreaTimeEventRow {
  return {
    id: `${type}-${minuteOffset}`,
    visitId: "visit-1",
    routeStepId: "step-1",
    area: "recepcion",
    type,
    sequence: minuteOffset + 1,
    occurredAt: new Date(Date.UTC(2026, 6, 30, 12, minuteOffset)),
    inferred: false,
    reason: null,
    branchCode: "el-alto",
    visitStatus: "completed",
    isTestData: false,
    patient: {
      id: "patient-1",
      internalCode: "P-1",
      fullName: "Paciente"
    },
    ...overrides
  };
}

describe("area time report", () => {
  it("separates waiting, attention and blocked time from immutable events", () => {
    const report = aggregateAreaTimeReport([
      event("entered", 0),
      event("attention_started", 10),
      event("blocked", 20),
      event("resumed_attention", 25),
      event("exited", 40)
    ]);
    const session = report.sessions[0];

    expect(session).toMatchObject({
      waitingMs: 10 * minute,
      attentionMs: 25 * minute,
      blockedMs: 5 * minute,
      totalMs: 40 * minute
    });
  });

  it("keeps an abandonment duration through its exit event", () => {
    const report = aggregateAreaTimeReport([
      event("entered", 0, { visitStatus: "left_without_care" }),
      event("exited", 18, { visitStatus: "left_without_care" })
    ]);
    expect(report.sessions[0]).toMatchObject({
      abandoned: true,
      waitingMs: 18 * minute,
      totalMs: 18 * minute
    });
  });

  it("excludes cancelled and test visits", () => {
    const report = aggregateAreaTimeReport([
      event("entered", 0, { visitStatus: "cancelled" }),
      event("entered", 0, {
        visitId: "visit-test",
        routeStepId: "step-test",
        isTestData: true
      })
    ]);
    expect(report.sessions).toHaveLength(0);
  });

  it("does not invent detailed phases for inferred historical boundaries", () => {
    const report = aggregateAreaTimeReport([
      event("entered", 0, { inferred: true }),
      event("exited", 30, { inferred: true })
    ]);
    expect(report.sessions[0]).toMatchObject({
      inferred: true,
      waitingMs: 0,
      attentionMs: 0,
      blockedMs: 0,
      totalMs: 30 * minute
    });
    expect(report.areas[0].sessions).toBe(0);
    expect(report.quality.inferredSessions).toBe(1);
  });

  it("uses nearest-rank median, p75 and p90", () => {
    expect(durationStats([10, 20, 30, 40]).medianMs).toBe(20);
    expect(durationStats([10, 20, 30, 40]).p75Ms).toBe(30);
    expect(durationStats([10, 20, 30, 40]).p90Ms).toBe(40);
    expect(formatDurationShort(90 * minute)).toBe("1 h 30 min");
  });

  it("flags an impossible repeated attention start", () => {
    const report = aggregateAreaTimeReport([
      event("entered", 0),
      event("attention_started", 5),
      event("attention_started", 6),
      event("exited", 10)
    ]);
    expect(report.sessions[0].invalidSequence).toBe(true);
    expect(report.quality.invalidSequences).toBe(1);
    expect(report.totals.sessions).toBe(0);
  });
});
