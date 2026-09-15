import type {
  FollowUpContactPreference,
  PatientCaptureSource,
  PatientGender,
  PatientRouteArea,
  Prisma,
  SymptomDurationUnit,
  VisitIntakeType
} from "@/generated/prisma/client";
import { dayRange } from "@/lib/dates";
import { prisma, withDatabaseError } from "@/modules/database";
import { createVisitInTransaction } from "@/modules/database/queries/visits";
import { createVisitAttributionInTransaction } from "@/modules/database/queries/attribution";
import { patientSearchWhere } from "@/modules/database/queries/patient-search";
import type { AttributionEvidenceKind } from "@/generated/prisma/client";
import {
  normalizePatientName,
  normalizePatientPhone
} from "@/features/patient-duplicates/normalize";
import { recordDuplicateCandidatesInTransaction } from "@/modules/database/queries/patient-duplicates";
import {
  appendPatientIdentityVersionInTransaction,
  normalizePatientDocument
} from "@/modules/database/queries/patients";

export type ReceptionIntakeRecordInput = {
  idempotencyKey?: string;
  userId?: string;
  branchCode: string;
  patientId?: string;
  patient: {
    fullName: string;
    phone: string;
    documentNumber?: string;
    secondaryPhone?: string;
    birthDate?: Date;
    gender?: PatientGender;
    city?: string;
    department?: string | null;
    country?: string;
    address?: string;
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
      const reused = input.idempotencyKey
        ? await tx.visit.findUnique({
            where: {
              branchCode_idempotencyKey: {
                branchCode: input.branchCode,
                idempotencyKey: input.idempotencyKey
              }
            },
            include: {
              attribution: {
                include: {
                  campaignAssignment: { include: { campaign: true } },
                  touches: { include: { source: true } }
                }
              }
            }
          })
        : null;
      if (reused?.attribution) {
        return {
          patientId: reused.patientId,
          visit: reused,
          attribution: reused.attribution
        };
      }

      let patientId = input.patientId;
      const {
        captureSource,
        captureSources,
        ...patientProfile
      } = input.patient;

      if (patientId) {
        const existing = await tx.patient.findUnique({
          where: { id: patientId },
          include: { branchRecords: { where: { branchCode: input.branchCode }, take: 1 } }
        });
        if (!existing || (!existing.branchRecords[0] && existing.normalizedPhone !== normalizePatientPhone(patientProfile.phone))) {
          throw new Error("PATIENT_EXACT_MATCH_REQUIRED");
        }
        const patient = await tx.patient.update({
          where: { id: patientId },
          // La fuente original del paciente no cambia en visitas posteriores.
          data: {
            fullName: patientProfile.fullName,
            phone: patientProfile.phone,
            documentNumber: patientProfile.documentNumber,
            normalizedDocumentNumber: normalizePatientDocument(patientProfile.documentNumber),
            secondaryPhone: patientProfile.secondaryPhone,
            birthDate: patientProfile.birthDate,
            city: patientProfile.city,
            department: patientProfile.department,
            country: patientProfile.country,
            address: patientProfile.address,
            normalizedName: normalizePatientName(patientProfile.fullName),
            normalizedPhone: normalizePatientPhone(patientProfile.phone),
            normalizedSecondaryPhone: patientProfile.secondaryPhone
              ? normalizePatientPhone(patientProfile.secondaryPhone)
              : "",
            followUpPreference:
              input.patient.followUpPreference ?? existing.followUpPreference,
            revision: { increment: 1 }
          }
        });
        await appendPatientIdentityVersionInTransaction(
          tx,
          patient,
          input.userId,
          "Actualización durante recepción"
        );
        await tx.patientBranchRecord.upsert({
          where: { patientId_branchCode: { patientId, branchCode: input.branchCode } },
          create: {
            patientId,
            branchCode: input.branchCode,
            recordNumber: `${input.branchCode}-${patient.internalCode}`,
            allergies: patientProfile.allergies,
            relevantHistory: patientProfile.relevantHistory,
            currentMedication: patientProfile.currentMedication
          },
          update: {
            allergies: patientProfile.allergies,
            relevantHistory: patientProfile.relevantHistory,
            currentMedication: patientProfile.currentMedication
          }
        });
      } else {
        const patientCount = await tx.patient.count();
        const patient = await tx.patient.create({
          data: {
            internalCode: `SI-${String(patientCount + 1).padStart(6, "0")}`,
            fullName: patientProfile.fullName,
            phone: patientProfile.phone,
            documentNumber: patientProfile.documentNumber,
            normalizedDocumentNumber: normalizePatientDocument(patientProfile.documentNumber),
            secondaryPhone: patientProfile.secondaryPhone,
            birthDate: patientProfile.birthDate,
            city: patientProfile.city,
            department: patientProfile.department,
            country: patientProfile.country,
            address: patientProfile.address,
            normalizedName: normalizePatientName(patientProfile.fullName),
            normalizedPhone: normalizePatientPhone(patientProfile.phone),
            normalizedSecondaryPhone: patientProfile.secondaryPhone
              ? normalizePatientPhone(patientProfile.secondaryPhone)
              : "",
            gender: patientProfile.gender,
            captureSource: captureSource ?? "other",
            captureSources:
              captureSources && captureSources.length > 0
                ? captureSources
                : [captureSource ?? "other"],
            followUpPreference: input.patient.followUpPreference ?? "unknown"
          }
        });
        patientId = patient.id;
        await tx.patientBranchRecord.create({
          data: {
            patientId,
            branchCode: input.branchCode,
            recordNumber: `${input.branchCode}-${patient.internalCode}`,
            allergies: patientProfile.allergies,
            relevantHistory: patientProfile.relevantHistory,
            currentMedication: patientProfile.currentMedication
          }
        });
        await appendPatientIdentityVersionInTransaction(
          tx,
          patient,
          input.userId,
          "Creación durante recepción"
        );
      }

      const visit = await createVisitInTransaction(tx, {
        idempotencyKey: input.idempotencyKey,
        patientId,
        userId: input.userId,
        branchCode: input.branchCode,
        note: "Llegada registrada en recepción",
        ...input.visit
      });
      const attribution = await createVisitAttributionInTransaction(tx, {
        branchCode: input.branchCode,
        patientId,
        visitId: visit.id,
        capturedById: input.userId,
        ...input.attribution
      });
      await recordDuplicateCandidatesInTransaction(tx, patientId);

      return { patientId, visit, attribution };
    });
  });
}

const receptionPatientSelect = {
  id: true,
  internalCode: true,
  fullName: true,
  phone: true,
  documentNumber: true,
  secondaryPhone: true,
  birthDate: true,
  gender: true,
  city: true,
  department: true,
  country: true,
  address: true,
  captureSource: true,
  captureSources: true,
  followUpPreference: true,
  mergedIntoId: true
} as const;

export type ReceptionPatientEditData = {
  fullName: string;
  phone: string;
  documentNumber?: string | null;
  birthDate: Date | null;
  gender: PatientGender;
  city: string;
  department: string | null;
  country: string;
  address: string | null;
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

export async function getReceptionDashboardSummary(branchCode: string, date = new Date()) {
  const day = dayRange(date);

  return withDatabaseError("getReceptionDashboardSummary", async () => {
    const [todayPatients, activeGroups, abandonmentEvents, latestArrivals] = await Promise.all([
      prisma.visit.findMany({
        where: { branchCode, checkedInAt: { gte: day.start, lt: day.end } },
        distinct: ["patientId"],
        select: { patientId: true }
      }),
      prisma.patientRoute.groupBy({
        by: ["currentArea"],
        where: { branchCode, active: true },
        _count: { _all: true }
      }),
      prisma.visitStatusHistory.findMany({
        where: {
          branchCode,
          toStatus: "left_without_care",
          createdAt: { gte: day.start, lt: day.end }
        },
        distinct: ["visitId"],
        select: { visitId: true }
      }),
      prisma.visit.findMany({
        where: { branchCode, checkedInAt: { gte: day.start, lt: day.end } },
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

export async function updateReceptionPatient(
  id: string,
  branchCode: string,
  changedById: string,
  data: ReceptionPatientEditData
) {
  return withDatabaseError("updateReceptionPatient", async () => {
    return prisma.$transaction(async (tx) => {
      const localRecord = await tx.patientBranchRecord.findUnique({
        where: { patientId_branchCode: { patientId: id, branchCode } }
      });
      if (!localRecord) throw new Error("PATIENT_NOT_IN_ACTIVE_BRANCH");
      const { allergies, relevantHistory, currentMedication, ...identity } = data;
      const patient = await tx.patient.update({
        where: { id },
        data: {
          ...identity,
          normalizedDocumentNumber: normalizePatientDocument(data.documentNumber),
          normalizedName: normalizePatientName(data.fullName),
          normalizedPhone: normalizePatientPhone(data.phone),
          revision: { increment: 1 }
        },
        select: receptionPatientSelect
      });
      await tx.patientBranchRecord.update({
        where: { patientId_branchCode: { patientId: id, branchCode } },
        data: { allergies, relevantHistory, currentMedication }
      });
      const fullPatient = await tx.patient.findUniqueOrThrow({ where: { id } });
      await appendPatientIdentityVersionInTransaction(
        tx,
        fullPatient,
        changedById,
        "Actualización de identidad y contacto"
      );
      await recordDuplicateCandidatesInTransaction(tx, id);
      return { ...patient, allergies, relevantHistory, currentMedication };
    });
  });
}

export async function getReceptionPatientById(id: string, branchCode: string) {
  return withDatabaseError("getReceptionPatientById", async () => {
    const patient = await prisma.patient.findFirst({
      where: { id, branchRecords: { some: { branchCode } } },
      select: {
        ...receptionPatientSelect,
        branchRecords: { where: { branchCode }, take: 1 }
      }
    });
    if (!patient) return null;
    const { branchRecords, ...identity } = patient;
    return {
      ...identity,
      allergies: branchRecords[0]?.allergies ?? null,
      relevantHistory: branchRecords[0]?.relevantHistory ?? null,
      currentMedication: branchRecords[0]?.currentMedication ?? null,
      linkedToActiveBranch: true
    };
  });
}

export async function searchReceptionPatients(search: string, branchCode: string) {
  return withDatabaseError("searchReceptionPatients", async () => {
    const normalizedPhone = normalizePatientPhone(search);
    const normalizedDocument = normalizePatientDocument(search);
    const exactDocument =
      normalizedDocument.length >= 4 && /\d/.test(normalizedDocument);
    const exactCode = /^SI-\d+$/i.test(search.trim());
    const exactConditions: Prisma.PatientWhereInput[] = [];
    if (normalizedPhone.length >= 7) {
      exactConditions.push(
        { normalizedPhone },
        { normalizedSecondaryPhone: normalizedPhone },
        {
          aliases: {
            some: {
              OR: [
                { normalizedPhone },
                { normalizedSecondaryPhone: normalizedPhone }
              ]
            }
          }
        }
      );
    }
    if (exactDocument) {
      exactConditions.push(
        { normalizedDocumentNumber: normalizedDocument },
        { aliases: { some: { normalizedDocumentNumber: normalizedDocument } } }
      );
    }
    if (exactCode) {
      exactConditions.push({
        internalCode: { equals: search.trim(), mode: "insensitive" }
      });
      exactConditions.push({
        aliases: {
          some: {
            internalCode: { equals: search.trim(), mode: "insensitive" }
          }
        }
      });
    }
    const exactIdentity =
      normalizedPhone.length >= 7 || exactDocument || exactCode
        ? {
            OR: exactConditions
          }
        : undefined;
    const localWhere = {
      ...patientSearchWhere(search),
      branchRecords: { some: { branchCode } },
      mergedIntoId: null
    };
    const patients = await prisma.patient.findMany({
      where: {
        mergedIntoId: null,
        OR: [localWhere, ...(exactIdentity ? [exactIdentity] : [])]
      },
      select: {
        ...receptionPatientSelect,
        branchRecords: { where: { branchCode }, take: 1 }
      },
      orderBy: { updatedAt: "desc" },
      take: 5
    });
    return patients.map(({ branchRecords, ...patient }) => ({
      ...patient,
      allergies: branchRecords[0]?.allergies ?? null,
      relevantHistory: branchRecords[0]?.relevantHistory ?? null,
      currentMedication: branchRecords[0]?.currentMedication ?? null,
      linkedToActiveBranch: branchRecords.length > 0
    }));
  });
}
