import type {
  FollowUpContactPreference,
  PatientCaptureSource,
  PatientGender,
  PatientRouteArea,
  SymptomDurationUnit,
  VisitIntakeType
} from "@/generated/prisma/client";
import { dayRange } from "@/lib/dates";
import { prisma, withDatabaseError } from "@/modules/database";
import { createVisitInTransaction } from "@/modules/database/queries/visits";
import { createVisitAttributionInTransaction } from "@/modules/database/queries/attribution";
import { patientSearchWhere } from "@/modules/database/queries/patient-search";
import type { AttributionEvidenceKind } from "@/generated/prisma/client";

export type ReceptionIntakeRecordInput = {
  userId?: string;
  patientId?: string;
  patient: {
    fullName: string;
    phone: string;
    birthDate?: Date;
    gender?: PatientGender;
    city?: string;
    department?: string | null;
    country?: string;
    captureSource?: PatientCaptureSource;
    captureSources?: PatientCaptureSource[];
    allergies?: string;
    relevantHistory?: string;
    currentMedication?: string;
    followUpPreference?: FollowUpContactPreference;
  };
  visit: {
    reason: string;
    intakeType?: VisitIntakeType;
    symptomDurationValue?: number;
    symptomDurationUnit?: SymptomDurationUnit;
    previouslyTreated?: boolean;
    bringsStudies?: boolean;
    originCity: string;
    originDepartment?: string;
    originCountry: string;
    originMatchesPatient: boolean;
  };
  attribution: {
    primarySourceCode: string;
    supportSourceCodes: string[];
    campaignId?: string;
    evidenceKind?: AttributionEvidenceKind;
    externalEvidenceCode?: string;
  };
};

export async function createReceptionIntake(input: ReceptionIntakeRecordInput) {
  return withDatabaseError("createReceptionIntake", async () => {
    return prisma.$transaction(async (tx) => {
      let patientId = input.patientId;
      const {
        captureSource,
        captureSources,
        ...patientProfile
      } = input.patient;

      if (patientId) {
        await tx.patient.update({
          where: { id: patientId },
          // La fuente original del paciente no cambia en visitas posteriores.
          data: patientProfile
        });
      } else {
        const patientCount = await tx.patient.count();
        const patient = await tx.patient.create({
          data: {
            internalCode: `SI-${String(patientCount + 1).padStart(6, "0")}`,
            ...patientProfile,
            gender: input.patient.gender ?? "unknown",
            captureSource: captureSource ?? "other",
            captureSources:
              captureSources && captureSources.length > 0
                ? captureSources
                : [captureSource ?? "other"],
            followUpPreference: input.patient.followUpPreference ?? "unknown"
          }
        });
        patientId = patient.id;
      }

      const visit = await createVisitInTransaction(tx, {
        patientId,
        userId: input.userId,
        note: "Llegada registrada en recepción",
        ...input.visit
      });
      const attribution = await createVisitAttributionInTransaction(tx, {
        patientId,
        visitId: visit.id,
        capturedById: input.userId,
        ...input.attribution
      });

      return { patientId, visit, attribution };
    });
  });
}

const receptionPatientSelect = {
  id: true,
  internalCode: true,
  fullName: true,
  phone: true,
  birthDate: true,
  gender: true,
  city: true,
  department: true,
  country: true,
  captureSource: true,
  captureSources: true,
  allergies: true,
  relevantHistory: true,
  currentMedication: true,
  followUpPreference: true
} as const;

export type ReceptionPatientEditData = {
  fullName: string;
  phone: string;
  birthDate: Date | null;
  gender: PatientGender;
  city: string;
  department: string | null;
  country: string;
  allergies: string | null;
  relevantHistory: string | null;
  currentMedication: string | null;
};

const dashboardRouteAreas: PatientRouteArea[] = [
  "recepcion",
  "medico",
  "enfermeria",
  "administracion",
  "seguimiento",
  "cierre"
];

export async function getReceptionDashboardSummary(date = new Date()) {
  const day = dayRange(date);

  return withDatabaseError("getReceptionDashboardSummary", async () => {
    const [todayPatients, activeGroups, abandonmentEvents, latestArrivals] = await Promise.all([
      prisma.visit.findMany({
        where: { checkedInAt: { gte: day.start, lt: day.end } },
        distinct: ["patientId"],
        select: { patientId: true }
      }),
      prisma.patientRoute.groupBy({
        by: ["currentArea"],
        where: { active: true },
        _count: { _all: true }
      }),
      prisma.visitStatusHistory.findMany({
        where: {
          toStatus: "left_without_care",
          createdAt: { gte: day.start, lt: day.end }
        },
        distinct: ["visitId"],
        select: { visitId: true }
      }),
      prisma.visit.findMany({
        where: { checkedInAt: { gte: day.start, lt: day.end } },
        include: { patient: true, route: true },
        orderBy: { checkedInAt: "desc" },
        take: 8
      })
    ]);

    const activeByArea = Object.fromEntries(
      dashboardRouteAreas.map((area) => [
        area,
        activeGroups.find((group) => group.currentArea === area)?._count._all ?? 0
      ])
    ) as Record<PatientRouteArea, number>;

    return {
      patientsToday: todayPatients.length,
      activeTotal: activeGroups.reduce((total, group) => total + group._count._all, 0),
      activeByArea,
      abandonmentsToday: abandonmentEvents.length,
      latestArrivals
    };
  });
}

export async function updateReceptionPatient(id: string, data: ReceptionPatientEditData) {
  return withDatabaseError("updateReceptionPatient", async () => {
    return prisma.patient.update({
      where: { id },
      data,
      select: receptionPatientSelect
    });
  });
}

export async function getReceptionPatientById(id: string) {
  return withDatabaseError("getReceptionPatientById", async () => {
    return prisma.patient.findUnique({
      where: { id },
      select: receptionPatientSelect
    });
  });
}

export async function searchReceptionPatients(search: string) {
  return withDatabaseError("searchReceptionPatients", async () => {
    return prisma.patient.findMany({
      where: patientSearchWhere(search),
      select: receptionPatientSelect,
      orderBy: { updatedAt: "desc" },
      take: 5
    });
  });
}
