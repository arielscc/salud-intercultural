import type { PatientCaptureSource, PatientGender, Prisma } from "@/generated/prisma/client";
import { prisma, withDatabaseError } from "@/modules/database";
import { getPagination, type PaginationInput } from "@/modules/database/pagination";
import { patientSearchWhere } from "@/modules/database/queries/patient-search";
import {
  normalizePatientName,
  normalizePatientPhone
} from "@/features/patient-duplicates/normalize";
import {
  findDuplicatePatientMatches,
  recordDuplicateCandidatesInTransaction
} from "@/modules/database/queries/patient-duplicates";

export type CreatePatientRecordInput = {
  fullName: string;
  phone: string;
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
  sourceLeadId?: string;
  createdById?: string;
};

function patientListWhere(input: {
  search?: string;
  city?: string;
  department?: string;
}): Prisma.PatientWhereInput {
  return {
    AND: [
      { mergedIntoId: null },
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

export async function createPatientRecord(input: CreatePatientRecordInput) {
  return withDatabaseError("createPatientRecord", async () => {
    return prisma.$transaction(async (tx) => {
      const patientCount = await tx.patient.count();
      const patient = await tx.patient.create({
        data: {
          internalCode: `SI-${String(patientCount + 1).padStart(6, "0")}`,
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
          captureSources: input.captureSource ? [input.captureSource] : [],
          generalObservations: input.generalObservations,
          allergies: input.allergies,
          relevantHistory: input.relevantHistory
        }
      });

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
    search?: string;
    city?: string;
    department?: string;
  } = {}
) {
  const pagination = getPagination(input);

  return withDatabaseError("getPatients", async () => {
    return prisma.patient.findMany({
      where: patientListWhere(input),
      include: {
        visits: {
          orderBy: { checkedInAt: "desc" },
          take: 1
        },
        _count: {
          select: {
            visits: true
          }
        }
      },
      orderBy: {
        updatedAt: "desc"
      },
      skip: pagination.skip,
      take: pagination.take
    });
  });
}

export async function countPatients(
  input: { search?: string; city?: string; department?: string } = {}
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
export async function getWalkInClientById(id: string) {
  return withDatabaseError("getWalkInClientById", async () => {
    return prisma.patient.findUnique({
      where: { id },
      select: {
        id: true,
        internalCode: true,
        fullName: true,
        phone: true,
        secondaryPhone: true,
        generalObservations: true,
        status: true,
        createdAt: true,
        mergedIntoId: true,
        mergedInto: { select: { id: true, fullName: true, internalCode: true } },
        _count: { select: { visits: true, sales: true } }
      }
    });
  });
}

export async function getPatientById(id: string) {
  return withDatabaseError("getPatientById", async () => {
    return prisma.patient.findUnique({
      where: { id },
      include: {
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
                allergies: true,
                relevantHistory: true,
                currentMedication: true,
                generalObservations: true
              }
            }
          }
        },
        visits: {
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
        convertedLeads: {
          select: {
            id: true,
            name: true,
            phone: true,
            status: true
          }
        },
        vitalSigns: {
          orderBy: { recordedAt: "desc" },
          take: 8
        },
        nursingApplications: {
          orderBy: { appliedAt: "desc" },
          take: 8
        },
        nursingNotes: {
          orderBy: { createdAt: "desc" },
          take: 8,
          include: { user: true }
        },
        studies: {
          orderBy: [{ performedAt: "desc" }, { createdAt: "desc" }],
          take: 8,
          include: {
            recordedBy: true
          }
        },
        sales: {
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
          include: {
            recordedBy: true
          },
          orderBy: [{ decidedAt: "desc" }, { createdAt: "desc" }]
        }
      }
    });
  });
}

export async function findPossibleDuplicatePatients(input: {
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
