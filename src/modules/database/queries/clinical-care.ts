import type { ClinicalOrderType, PatientRouteArea } from "@/generated/prisma/client";
import { prisma, withDatabaseError } from "@/modules/database";
import { getPagination, type PaginationInput } from "@/modules/database/pagination";
export {
  upsertClinicalConsultationRecord
} from "@/modules/database/queries/clinical-records";
export type {
  UpsertClinicalConsultationRecordInput
} from "@/modules/database/queries/clinical-records";

export async function getConsultationVisits(
  input: PaginationInput & { branchCode?: string } = {}
) {
  const pagination = getPagination(input);

  return withDatabaseError("getConsultationVisits", async () => {
    return prisma.visit.findMany({
      where: {
        status: "in_consultation",
        branchCode: input.branchCode
      },
      include: {
        patient: true,
        clinicalConsultation: {
          include: {
            diagnoses: true
          }
        },
        route: true
      },
      orderBy: {
        checkedInAt: "asc"
      },
      skip: pagination.skip,
      take: pagination.take
    });
  });
}

export async function getClinicalVisitById(visitId: string) {
  return withDatabaseError("getClinicalVisitById", async () => {
    return prisma.visit.findUnique({
      where: { id: visitId },
      include: {
        patient: {
          include: {
            consents: {
              where: { purpose: "follow_up" },
              orderBy: [{ decidedAt: "desc" }, { createdAt: "desc" }],
              take: 1
            }
          }
        },
        route: {
          include: {
            steps: {
              orderBy: { startedAt: "desc" }
            }
          }
        },
        clinicalConsultation: {
          include: {
            finalizedBy: {
              select: { id: true, name: true, email: true }
            },
            diagnoses: {
              orderBy: [{ kind: "asc" }, { createdAt: "asc" }]
            },
            treatmentPlans: {
              orderBy: { createdAt: "desc" }
            },
            versions: {
              orderBy: { version: "desc" },
              select: {
                id: true,
                version: true,
                kind: true,
                correctionType: true,
                correctionReason: true,
                createdAt: true,
                author: {
                  select: { id: true, name: true, email: true }
                }
              }
            }
          }
        },
        prescriptions: {
          orderBy: [{ version: "desc" }, { createdAt: "desc" }],
          include: {
            items: true
          }
        },
        clinicalEvolutions: {
          orderBy: { createdAt: "desc" }
        },
        clinicalNotes: {
          orderBy: { createdAt: "desc" }
        },
        clinicalOrders: {
          orderBy: { createdAt: "desc" },
          include: {
            workItem: true
          }
        },
        studies: {
          orderBy: [{ performedAt: "desc" }, { createdAt: "desc" }],
          include: {
            recordedBy: true,
            attachments: {
              where: { status: "available" },
              select: {
                id: true,
                label: true,
                contentType: true,
                sizeBytes: true,
                createdAt: true
              }
            }
          }
        },
        vitalSigns: {
          orderBy: { recordedAt: "desc" }
        },
        nursingApplications: {
          orderBy: { appliedAt: "desc" }
        },
        nursingNotes: {
          orderBy: { createdAt: "desc" },
          include: { user: true }
        },
        workItems: {
          orderBy: { createdAt: "desc" }
        },
        treatmentProposalOutcomes: {
          orderBy: [{ decidedAt: "desc" }, { createdAt: "desc" }],
          include: {
            doctor: true,
            administrationOrder: {
              include: {
                workItem: {
                  include: {
                    sales: {
                      include: { payments: true },
                      orderBy: { createdAt: "desc" }
                    }
                  }
                }
              }
            },
            followUpTask: true
          }
        }
      }
    });
  });
}

export async function createClinicalOrderRecord(input: {
  visitId: string;
  doctorId?: string;
  type: ClinicalOrderType;
  targetArea: PatientRouteArea;
  title: string;
  details?: string;
}) {
  return withDatabaseError("createClinicalOrderRecord", async () => {
    return prisma.$transaction(async (tx) => {
      const visit = await tx.visit.findUniqueOrThrow({
        where: { id: input.visitId },
        select: { patientId: true }
      });

      const workItem = await tx.visitWorkItem.create({
        data: {
          visitId: input.visitId,
          createdById: input.doctorId,
          area: input.targetArea,
          status: "pending",
          title: input.title,
          description: input.details
        }
      });

      return tx.clinicalOrder.create({
        data: {
          visitId: input.visitId,
          patientId: visit.patientId,
          doctorId: input.doctorId,
          workItemId: workItem.id,
          type: input.type,
          targetArea: input.targetArea,
          title: input.title,
          details: input.details
        }
      });
    });
  });
}
