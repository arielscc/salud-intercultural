import type { PatientCaptureSource, PatientGender, Prisma } from "@/generated/prisma/client";
import { prisma, withDatabaseError } from "@/modules/database";
import { getPagination, type PaginationInput } from "@/modules/database/pagination";
import { patientSearchWhere } from "@/modules/database/queries/patient-search";

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

export async function getPatientById(id: string) {
  return withDatabaseError("getPatientById", async () => {
    return prisma.patient.findUnique({
      where: { id },
      include: {
        visits: {
          orderBy: { checkedInAt: "desc" },
          include: {
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

export async function findPossibleDuplicatePatients(phone: string) {
  return withDatabaseError("findPossibleDuplicatePatients", async () => {
    return prisma.patient.findMany({
      where: {
        OR: [{ phone }, { secondaryPhone: phone }]
      },
      take: 5,
      orderBy: {
        updatedAt: "desc"
      }
    });
  });
}
