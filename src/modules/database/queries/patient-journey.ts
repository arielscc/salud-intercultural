import type { Prisma } from "@/generated/prisma/client";
import {
  aggregatePatientJourney,
  fillDailyJourneyTrends,
  UNATTRIBUTED_SOURCE_CODE,
  type PatientJourneyRow
} from "@/features/patient-journey/report";
import { dayRange } from "@/lib/dates";
import { prisma, withDatabaseError } from "@/modules/database";

export type PatientJourneyFilters = {
  from?: Date;
  to?: Date;
  sourceCode?: string;
  city?: string;
  doctorId?: string;
  branchCode?: string;
};

function visitWhere(input: PatientJourneyFilters): Prisma.VisitWhereInput {
  const where: Prisma.VisitWhereInput = {
    isTestData: false,
    checkedInAt:
      input.from || input.to
        ? { gte: input.from, lt: input.to }
        : undefined,
    branchCode: input.branchCode || undefined,
    originCity: input.city
      ? { equals: input.city, mode: "insensitive" }
      : undefined,
    clinicalConsultation: input.doctorId
      ? { is: { doctorId: input.doctorId } }
      : undefined
  };

  if (input.sourceCode === UNATTRIBUTED_SOURCE_CODE) {
    where.OR = [
      { attribution: { is: null } },
      {
        attribution: {
          is: { touches: { none: { role: "primary" } } }
        }
      }
    ];
  } else if (input.sourceCode) {
    where.attribution = {
      is: {
        touches: {
          some: {
            role: "primary",
            source: { code: input.sourceCode }
          }
        }
      }
    };
  }
  return where;
}

export async function getPatientJourneyReport(
  input: PatientJourneyFilters = {}
) {
  return withDatabaseError("getPatientJourneyReport", async () => {
    const visits = await prisma.visit.findMany({
      where: visitWhere(input),
      select: {
        id: true,
        branchCode: true,
        status: true,
        intakeType: true,
        checkedInAt: true,
        originCity: true,
        originDepartment: true,
        patient: {
          select: {
            id: true,
            internalCode: true,
            fullName: true
          }
        },
        clinicalConsultation: {
          select: {
            status: true,
            doctor: {
              select: { id: true, name: true, email: true }
            }
          }
        },
        treatmentProposalOutcomes: {
          where: { supersededBy: null },
          orderBy: [{ decidedAt: "desc" }, { createdAt: "desc" }],
          take: 1,
          select: { status: true }
        },
        sales: {
          where: { status: { not: "cancelled" } },
          select: {
            id: true,
            totalCents: true,
            paidCents: true,
            balanceCents: true
          }
        },
        followUpTasks: { select: { id: true } },
        discontinuation: { select: { id: true } },
        attribution: {
          select: {
            touches: {
              where: { role: "primary" },
              take: 1,
              select: {
                source: {
                  select: { code: true, internalLabel: true }
                }
              }
            }
          }
        }
      },
      orderBy: [{ checkedInAt: "desc" }, { id: "desc" }]
    });

    const rows: PatientJourneyRow[] = visits.map((visit) => {
      const sales = visit.sales;
      const source = visit.attribution?.touches[0]?.source;
      const doctor = visit.clinicalConsultation?.doctor;
      return {
        visitId: visit.id,
        checkedInAt: visit.checkedInAt,
        branchCode: visit.branchCode,
        visitStatus: visit.status,
        intakeType: visit.intakeType,
        patient: visit.patient,
        city: visit.originCity,
        department: visit.originDepartment,
        source: source
          ? { code: source.code, label: source.internalLabel }
          : null,
        doctor: doctor
          ? { id: doctor.id, label: doctor.name ?? doctor.email }
          : null,
        consultationStatus: visit.clinicalConsultation?.status ?? null,
        proposalStatus: visit.treatmentProposalOutcomes[0]?.status ?? null,
        saleCount: sales.length,
        soldCents: sales.reduce(
          (total, sale) => total + sale.totalCents,
          0
        ),
        collectedCents: sales.reduce(
          (total, sale) => total + sale.paidCents,
          0
        ),
        pendingCents: sales.reduce(
          (total, sale) => total + sale.balanceCents,
          0
        ),
        followUpCount: visit.followUpTasks.length,
        abandoned: Boolean(visit.discontinuation)
      };
    });

    const report = aggregatePatientJourney(rows);
    const currentDay = dayRange();
    const trendEnd = input.to ?? currentDay.end;
    const trendFrom =
      input.from ??
      new Date(trendEnd.getTime() - 31 * 24 * 60 * 60 * 1000);
    return {
      ...report,
      trends: fillDailyJourneyTrends(report.trends, trendFrom, trendEnd),
      rows
    };
  });
}

export async function getPatientJourneyFilterOptions() {
  return withDatabaseError("getPatientJourneyFilterOptions", async () => {
    const [sources, doctors, cities, branches] = await Promise.all([
      prisma.captureSource.findMany({
        where: {
          attributionTouches: { some: { role: "primary" } }
        },
        select: { code: true, internalLabel: true },
        orderBy: [{ sortOrder: "asc" }, { internalLabel: "asc" }]
      }),
      prisma.internalUser.findMany({
        where: {
          clinicalConsultations: { some: {} }
        },
        select: { id: true, name: true, email: true, active: true },
        orderBy: [{ name: "asc" }, { email: "asc" }]
      }),
      prisma.visit.groupBy({
        by: ["originCity"],
        where: { isTestData: false },
        _count: { _all: true },
        orderBy: { originCity: "asc" }
      }),
      prisma.visit.groupBy({
        by: ["branchCode"],
        where: { isTestData: false },
        _count: { _all: true },
        orderBy: { branchCode: "asc" }
      })
    ]);
    return {
      sources,
      doctors: doctors.map((doctor) => ({
        id: doctor.id,
        label: doctor.name ?? doctor.email,
        active: doctor.active
      })),
      cities: cities.map((city) => ({
        value: city.originCity,
        count: city._count._all
      })),
      branches: branches.map((branch) => ({
        value: branch.branchCode,
        count: branch._count._all
      }))
    };
  });
}
