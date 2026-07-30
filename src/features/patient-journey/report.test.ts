import { describe, expect, it } from "vitest";
import {
  aggregatePatientJourney,
  conversionPercent,
  fillDailyJourneyTrends,
  type PatientJourneyRow
} from "@/features/patient-journey/report";

function row(
  visitId: string,
  overrides: Partial<PatientJourneyRow> = {}
): PatientJourneyRow {
  return {
    visitId,
    checkedInAt: new Date("2026-07-30T14:00:00.000Z"),
    branchCode: "el-alto",
    visitStatus: "completed",
    intakeType: "first_visit",
    patient: {
      id: `patient-${visitId}`,
      internalCode: `P-${visitId}`,
      fullName: "Paciente"
    },
    city: "El Alto",
    department: "La Paz",
    source: { code: "tiktok", label: "TikTok" },
    doctor: { id: "doctor-1", label: "Dra. Cinthia" },
    consultationStatus: "finalized",
    proposalStatus: "accepted",
    saleCount: 1,
    soldCents: 10_000,
    collectedCents: 6_000,
    pendingCents: 4_000,
    followUpCount: 1,
    abandoned: false,
    ...overrides
  };
}

describe("patient journey aggregation", () => {
  it("counts a visit once while keeping sale quantity and money separate", () => {
    const report = aggregatePatientJourney([
      row("1", { saleCount: 2, soldCents: 15_000, collectedCents: 8_000 }),
      row("2", {
        intakeType: "treatment_control",
        proposalStatus: "rejected",
        saleCount: 0,
        soldCents: 0,
        collectedCents: 0,
        pendingCents: 0
      })
    ]);

    expect(report.totals).toMatchObject({
      arrivals: 2,
      uniquePatients: 2,
      consultations: 2,
      proposals: 2,
      accepted: 1,
      visitsWithSale: 1,
      sales: 2,
      soldCents: 15_000,
      collectedCents: 8_000,
      firstVisits: 1,
      returnVisits: 1
    });
  });

  it("keeps unattributed visits visible and detects inconsistent legacy paths", () => {
    const report = aggregatePatientJourney([
      row("1", {
        source: null,
        consultationStatus: null,
        proposalStatus: "accepted"
      })
    ]);
    expect(report.sources[0].label).toBe("Sin fuente registrada");
    expect(report.quality).toMatchObject({
      withoutSource: 1,
      proposalWithoutConsultation: 1
    });
  });

  it("rejects duplicated visit rows instead of inflating the funnel", () => {
    expect(() => aggregatePatientJourney([row("1"), row("1")])).toThrow(
      "DUPLICATE_VISIT_IN_PATIENT_JOURNEY_REPORT"
    );
  });

  it("calculates safe percentages", () => {
    expect(conversionPercent(2, 4)).toBe(50);
    expect(conversionPercent(2, 0)).toBe(0);
  });

  it("keeps days without arrivals visible as zero", () => {
    const trends = aggregatePatientJourney([row("1")]).trends;
    const completed = fillDailyJourneyTrends(
      trends,
      new Date("2026-07-29T04:00:00.000Z"),
      new Date("2026-07-31T04:00:00.000Z")
    );
    expect(completed.map((day) => [day.date, day.arrivals])).toEqual([
      ["2026-07-29", 0],
      ["2026-07-30", 1]
    ]);
  });

  it("limits long periods to their latest 31 calendar days", () => {
    const completed = fillDailyJourneyTrends(
      [],
      new Date("2026-01-01T04:00:00.000Z"),
      new Date("2026-04-01T04:00:00.000Z")
    );
    expect(completed).toHaveLength(31);
    expect(completed[0].date).toBe("2026-03-01");
    expect(completed[30].date).toBe("2026-03-31");
  });
});
