import type {
  ClinicalRecordStatus,
  TreatmentProposalOutcomeStatus,
  VisitIntakeType,
  VisitStatus
} from "@/generated/prisma/client";
import { todayDateOnly } from "@/lib/dates";

export const UNATTRIBUTED_SOURCE_CODE = "__unattributed__";

export type PatientJourneyRow = {
  visitId: string;
  checkedInAt: Date;
  branchCode: string;
  visitStatus: VisitStatus;
  intakeType: VisitIntakeType;
  patient: {
    id: string;
    internalCode: string;
    fullName: string;
  };
  city: string;
  department: string | null;
  source: { code: string; label: string } | null;
  doctor: { id: string; label: string } | null;
  consultationStatus: ClinicalRecordStatus | null;
  proposalStatus: TreatmentProposalOutcomeStatus | null;
  saleCount: number;
  soldCents: number;
  collectedCents: number;
  pendingCents: number;
  followUpCount: number;
  abandoned: boolean;
};

export type PatientJourneyTotals = {
  arrivals: number;
  uniquePatients: number;
  firstVisits: number;
  returnVisits: number;
  consultations: number;
  finalizedConsultations: number;
  proposals: number;
  accepted: number;
  visitsWithSale: number;
  sales: number;
  soldCents: number;
  collectedCents: number;
  pendingCents: number;
  abandoned: number;
  visitsWithFollowUp: number;
  followUps: number;
};

function emptyTotals(): PatientJourneyTotals {
  return {
    arrivals: 0,
    uniquePatients: 0,
    firstVisits: 0,
    returnVisits: 0,
    consultations: 0,
    finalizedConsultations: 0,
    proposals: 0,
    accepted: 0,
    visitsWithSale: 0,
    sales: 0,
    soldCents: 0,
    collectedCents: 0,
    pendingCents: 0,
    abandoned: 0,
    visitsWithFollowUp: 0,
    followUps: 0
  };
}

function addRow(totals: PatientJourneyTotals, row: PatientJourneyRow) {
  totals.arrivals += 1;
  totals.firstVisits += row.intakeType === "first_visit" ? 1 : 0;
  totals.returnVisits += row.intakeType === "first_visit" ? 0 : 1;
  totals.consultations += row.consultationStatus ? 1 : 0;
  totals.finalizedConsultations +=
    row.consultationStatus === "finalized" ? 1 : 0;
  totals.proposals +=
    row.proposalStatus && row.proposalStatus !== "not_applicable" ? 1 : 0;
  totals.accepted += row.proposalStatus === "accepted" ? 1 : 0;
  totals.visitsWithSale += row.saleCount > 0 ? 1 : 0;
  totals.sales += row.saleCount;
  totals.soldCents += row.soldCents;
  totals.collectedCents += row.collectedCents;
  totals.pendingCents += row.pendingCents;
  totals.abandoned += row.abandoned ? 1 : 0;
  totals.visitsWithFollowUp += row.followUpCount > 0 ? 1 : 0;
  totals.followUps += row.followUpCount;
}

export function aggregatePatientJourney(rows: PatientJourneyRow[]) {
  const uniqueRows = new Map<string, PatientJourneyRow>();
  for (const row of rows) {
    if (uniqueRows.has(row.visitId)) {
      throw new Error("DUPLICATE_VISIT_IN_PATIENT_JOURNEY_REPORT");
    }
    uniqueRows.set(row.visitId, row);
  }

  const totals = emptyTotals();
  const patients = new Set<string>();
  const trends = new Map<string, PatientJourneyTotals>();
  const trendPatients = new Map<string, Set<string>>();
  const sources = new Map<
    string,
    {
      code: string;
      label: string;
      totals: PatientJourneyTotals;
    }
  >();
  const sourcePatients = new Map<string, Set<string>>();

  for (const row of uniqueRows.values()) {
    addRow(totals, row);
    patients.add(row.patient.id);

    const date = todayDateOnly(row.checkedInAt);
    const trend = trends.get(date) ?? emptyTotals();
    addRow(trend, row);
    trends.set(date, trend);
    const patientsForDay = trendPatients.get(date) ?? new Set<string>();
    patientsForDay.add(row.patient.id);
    trendPatients.set(date, patientsForDay);

    const source = row.source ?? {
      code: UNATTRIBUTED_SOURCE_CODE,
      label: "Sin fuente registrada"
    };
    const sourceRow = sources.get(source.code) ?? {
      ...source,
      totals: emptyTotals()
    };
    addRow(sourceRow.totals, row);
    sources.set(source.code, sourceRow);
    const patientsForSource =
      sourcePatients.get(source.code) ?? new Set<string>();
    patientsForSource.add(row.patient.id);
    sourcePatients.set(source.code, patientsForSource);
  }
  totals.uniquePatients = patients.size;
  for (const [date, dayTotals] of trends) {
    dayTotals.uniquePatients = trendPatients.get(date)?.size ?? 0;
  }
  for (const [code, sourceRow] of sources) {
    sourceRow.totals.uniquePatients = sourcePatients.get(code)?.size ?? 0;
  }

  const funnel = [
    { key: "arrivals", label: "Llegadas", value: totals.arrivals },
    {
      key: "consultations",
      label: "Consultas registradas",
      value: totals.consultations
    },
    { key: "proposals", label: "Propuestas", value: totals.proposals },
    { key: "accepted", label: "Aceptadas", value: totals.accepted },
    {
      key: "visitsWithSale",
      label: "Visitas con compra",
      value: totals.visitsWithSale
    }
  ].map((stage, index, stages) => ({
    ...stage,
    previousValue: index === 0 ? stage.value : stages[index - 1].value,
    loss:
      index === 0
        ? 0
        : Math.max(stages[index - 1].value - stage.value, 0)
  }));

  return {
    totals,
    funnel,
    trends: Array.from(trends.entries())
      .map(([date, dayTotals]) => ({ date, ...dayTotals }))
      .sort((left, right) => left.date.localeCompare(right.date)),
    sources: Array.from(sources.values()).sort(
      (left, right) =>
        right.totals.collectedCents - left.totals.collectedCents ||
        right.totals.arrivals - left.totals.arrivals ||
        left.label.localeCompare(right.label, "es")
    ),
    quality: {
      withoutSource: rows.filter((row) => !row.source).length,
      saleWithoutAcceptedProposal: rows.filter(
        (row) => row.saleCount > 0 && row.proposalStatus !== "accepted"
      ).length,
      proposalWithoutConsultation: rows.filter(
        (row) =>
          Boolean(row.proposalStatus) && row.consultationStatus === null
      ).length,
      nonMonotonicFunnelStages: funnel.filter(
        (stage) => stage.value > stage.previousValue
      ).length
    }
  };
}

export function conversionPercent(part: number, total: number) {
  return total > 0 ? (part / total) * 100 : 0;
}

export function fillDailyJourneyTrends(
  trends: Array<{ date: string } & PatientJourneyTotals>,
  from?: Date,
  to?: Date
) {
  if (!from || !to || to <= from) return trends;
  const last = todayDateOnly(new Date(to.getTime() - 1));
  const byDate = new Map(trends.map((trend) => [trend.date, trend]));
  const completed: Array<{ date: string } & PatientJourneyTotals> = [];
  const final = new Date(`${last}T12:00:00.000Z`);
  const requestedFirst = new Date(`${todayDateOnly(from)}T12:00:00.000Z`);
  const visibleFirst = new Date(
    final.getTime() - 30 * 24 * 60 * 60 * 1000
  );
  let cursor = requestedFirst > visibleFirst ? requestedFirst : visibleFirst;

  while (cursor <= final) {
    const date = cursor.toISOString().slice(0, 10);
    completed.push(byDate.get(date) ?? { date, ...emptyTotals() });
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
  }
  return completed;
}
