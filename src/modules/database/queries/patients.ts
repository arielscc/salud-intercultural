import type {
  Patient,
  PatientCaptureSource,
  PatientGender,
  Prisma
} from "@/generated/prisma/client";
import { prisma, withDatabaseError } from "@/modules/database";
import { getPagination, type PaginationInput } from "@/modules/database/pagination";
import { patientSearchWhere } from "@/modules/database/queries/patient-search";
import {
  normalizePatientDocument,
  normalizePatientName,
  normalizePatientPhone
} from "@/features/patient-duplicates/normalize";
import {
  findDuplicatePatientMatches,
  recordDuplicateCandidatesInTransaction,
  type PatientDuplicateScope
} from "@/modules/database/queries/patient-duplicates";

export type CreatePatientRecordInput = {
  branchCode: string;
  fullName: string;
  phone: string;
  documentNumber?: string;
  secondaryPhone?: string;
  birthDate?: Date;
  gender?: PatientGender;
  city?: string;
  department?: string;
  country?: string;
  address?: string;
  captureSource?: PatientCaptureSource;
  generalObservations?: string;
  allergies?: string;
  relevantHistory?: string;
  currentMedication?: string;
  sourceLeadId?: string;
  createdById?: string;
};

function patientListWhere(input: {
  branchCode: string;
  search?: string;
  city?: string;
  department?: string;
}): Prisma.PatientWhereInput {
  return {
    AND: [
      { mergedIntoId: null },
      { branchRecords: { some: { branchCode: input.branchCode } } },
      patientSearchWhere(input.search),
      input.city
        ? { city: { contains: input.city, mode: "insensitive" } }
        : {},
      input.department
        ? { department: { equals: input.department, mode: "insensitive" } }
        : {}
    ]
  };
}

export { normalizePatientDocument } from "@/features/patient-duplicates/normalize";

export async function appendPatientIdentityVersionInTransaction(
  tx: Prisma.TransactionClient,
  patient: Patient,
  changedById: string | undefined,
  changeReason: string
) {
  return tx.patientIdentityVersion.create({
    data: {
      patientId: patient.id,
      revision: patient.revision,
      internalCode: patient.internalCode,
      documentNumber: patient.documentNumber,
      normalizedDocumentNumber: patient.normalizedDocumentNumber,
      fullName: patient.fullName,
      phone: patient.phone,
      secondaryPhone: patient.secondaryPhone,
      birthDate: patient.birthDate,
      gender: patient.gender,
      city: patient.city,
      department: patient.department,
      country: patient.country,
      address: patient.address,
      changedById,
      changeReason
    }
  });
}

export async function createPatientRecord(input: CreatePatientRecordInput) {
  return withDatabaseError("createPatientRecord", async () => {
    return prisma.$transaction(async (tx) => {
      const patientCount = await tx.patient.count();
      const patient = await tx.patient.create({
        data: {
          internalCode: `SI-${String(patientCount + 1).padStart(6, "0")}`,
          documentNumber: input.documentNumber,
          normalizedDocumentNumber: normalizePatientDocument(input.documentNumber),
          fullName: input.fullName,
          phone: input.phone,
          normalizedName: normalizePatientName(input.fullName),
          normalizedPhone: normalizePatientPhone(input.phone),
          normalizedSecondaryPhone: input.secondaryPhone
            ? normalizePatientPhone(input.secondaryPhone)
            : "",
          secondaryPhone: input.secondaryPhone,
          birthDate: input.birthDate,
          gender: input.gender ?? "unknown",
          city: input.city,
          department: input.department,
          country: input.country,
          address: input.address,
          captureSource: input.captureSource ?? "other",
          captureSources: input.captureSource ? [input.captureSource] : []
        }
      });

      await tx.patientBranchRecord.create({
        data: {
          patientId: patient.id,
          branchCode: input.branchCode,
          recordNumber: `${input.branchCode}-${patient.internalCode}`,
          generalObservations: input.generalObservations,
          allergies: input.allergies,
          relevantHistory: input.relevantHistory,
          currentMedication: input.currentMedication
        }
      });
      await appendPatientIdentityVersionInTransaction(
        tx,
        patient,
        input.createdById,
        "Creación de identidad global"
      );

      if (input.sourceLeadId) {
        await tx.lead.update({
          where: { id: input.sourceLeadId },
          data: {
            convertedPatientId: patient.id,
            status: "converted_to_patient"
          }
        });

        await tx.leadStatusHistory.create({
          data: {
            leadId: input.sourceLeadId,
            userId: input.createdById,
            toStatus: "converted_to_patient",
            note: `Convertido a paciente ${patient.internalCode}`
          }
        });
      }

      await recordDuplicateCandidatesInTransaction(tx, patient.id);
      return patient;
    });
  });
}

export async function getPatients(
  input: PaginationInput & {
    branchCode: string;
    search?: string;
    city?: string;
    department?: string;
  }
) {
  const pagination = getPagination(input);

  return withDatabaseError("getPatients", async () => {
    const patients = await prisma.patient.findMany({
      where: patientListWhere(input),
      include: {
        branchRecords: {
          where: { branchCode: input.branchCode },
          take: 1
        },
        visits: {
          where: { branchCode: input.branchCode },
          orderBy: { checkedInAt: "desc" },
          take: 1
        },
        _count: {
          select: {
            visits: { where: { branchCode: input.branchCode } }
          }
        }
      },
      orderBy: {
        updatedAt: "desc"
      },
      skip: pagination.skip,
      take: pagination.take
    });
    return patients.map(({ branchRecords, ...patient }) => ({
      ...patient,
      status: branchRecords[0]?.status ?? patient.status,
      localRecord: branchRecords[0] ?? null
    }));
  });
}

export async function countPatients(
  input: { branchCode: string; search?: string; city?: string; department?: string }
) {
  return withDatabaseError("countPatients", async () => {
    return prisma.patient.count({ where: patientListWhere(input) });
  });
}

/**
 * Ficha del cliente para Administración: identificación y contacto, nada
 * clínico. La ficha completa —alergias, antecedentes, historia— vive en
 * Recepción y se lee con `getPatientById`.
 */
export async function getWalkInClientById(id: string, branchCode: string) {
  return withDatabaseError("getWalkInClientById", async () => {
    const patient = await prisma.patient.findFirst({
      where: { id, branchRecords: { some: { branchCode } } },
      select: {
        id: true,
        internalCode: true,
        fullName: true,
        phone: true,
        secondaryPhone: true,
        status: true,
        createdAt: true,
        mergedIntoId: true,
        mergedInto: { select: { id: true, fullName: true, internalCode: true } },
        branchRecords: { where: { branchCode }, take: 1 },
        _count: {
          select: {
            visits: { where: { branchCode } },
            sales: { where: { branchCode } }
          }
        }
      }
    });
    if (!patient) return null;
    const { branchRecords, ...identity } = patient;
    return {
      ...identity,
      status: branchRecords[0]?.status ?? identity.status,
      generalObservations: branchRecords[0]?.generalObservations ?? null,
      localRecord: branchRecords[0] ?? null
    };
  });
}

export async function getPatientById(id: string, branchCode: string) {
  return withDatabaseError("getPatientById", async () => {
    const patient = await prisma.patient.findFirst({
      where: { id, branchRecords: { some: { branchCode } } },
      include: {
        branchRecords: { where: { branchCode }, take: 1 },
        mergedInto: {
          select: { id: true, internalCode: true, fullName: true }
        },
        aliases: {
          orderBy: { createdAt: "desc" },
          include: {
            sourcePatient: {
              select: {
                internalCode: true,
                fullName: true,
                phone: true,
                secondaryPhone: true,
              }
            }
          }
        },
        visits: {
          where: { branchCode },
          orderBy: { checkedInAt: "desc" },
          include: {
            attribution: {
              include: {
                campaign: true,
                touches: { include: { source: true } }
              }
            },
            route: {
              include: {
                steps: {
                  orderBy: { startedAt: "desc" }
                }
              }
            },
            statusHistory: {
              orderBy: { createdAt: "desc" }
            },
            workItems: {
              orderBy: { createdAt: "desc" }
            }
          }
        },
        vitalSigns: {
          where: { visit: { branchCode } },
          orderBy: { recordedAt: "desc" },
          take: 8
        },
        nursingApplications: {
          where: { visit: { branchCode } },
          orderBy: { appliedAt: "desc" },
          take: 8
        },
        nursingNotes: {
          where: { visit: { branchCode } },
          orderBy: { createdAt: "desc" },
          take: 8,
          include: { user: true }
        },
        studies: {
          where: { visit: { branchCode } },
          orderBy: [{ performedAt: "desc" }, { createdAt: "desc" }],
          take: 8,
          include: {
            recordedBy: true
          }
        },
        sales: {
          where: { branchCode },
          orderBy: { createdAt: "desc" },
          take: 8,
          include: {
            items: true,
            payments: {
              include: { method: true }
            }
          }
        },
        followUpTasks: {
          where: { branchCode },
          orderBy: [{ dueAt: "desc" }, { createdAt: "desc" }],
          take: 12,
          include: {
            assignedTo: true,
            attempts: {
              orderBy: { contactedAt: "desc" },
              take: 3
            }
          }
        },
        consents: {
          where: {
            OR: [{ branchCode }, { purpose: "clinical_continuity" }]
          },
          include: {
            recordedBy: true
          },
          orderBy: [{ decidedAt: "desc" }, { createdAt: "desc" }]
        }
      }
    });
    if (!patient) return null;
    const { branchRecords, ...identity } = patient;
    const localRecord = branchRecords[0];
    return {
      ...identity,
      status: localRecord?.status ?? identity.status,
      generalObservations: localRecord?.generalObservations ?? null,
      allergies: localRecord?.allergies ?? null,
      relevantHistory: localRecord?.relevantHistory ?? null,
      currentMedication: localRecord?.currentMedication ?? null,
      localRecord: localRecord ?? null
    };
  });
}

export async function findPossibleDuplicatePatients(input: {
  scope: PatientDuplicateScope;
  documentNumber?: string | null;
  fullName: string;
  phone: string;
  secondaryPhone?: string | null;
  birthDate?: Date | null;
  excludePatientId?: string;
}) {
  const matches = await findDuplicatePatientMatches(input);
  return matches.map((match) => ({
    ...match.patient,
    match: match.signals
  }));
}
