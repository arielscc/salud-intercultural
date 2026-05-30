import type { ClinicalOrderType, PatientRouteArea } from "@/generated/prisma/client";
import { prisma, withDatabaseError } from "@/modules/database";
import { getPagination, type PaginationInput } from "@/modules/database/pagination";

export type UpsertClinicalConsultationRecordInput = {
  visitId: string;
  doctorId?: string;
  motive: string;
  primaryDiagnosis: string;
  secondaryDiagnosis?: string;
  findings?: string;
  observations?: string;
  treatmentPlanText?: string;
  indications?: string;
  prescriptionMedication?: string;
  prescriptionDose?: string;
  prescriptionFrequency?: string;
  prescriptionDuration?: string;
  prescriptionObservations?: string;
  evolutionNote?: string;
};

export async function getConsultationVisits(input: PaginationInput = {}) {
  const pagination = getPagination(input);

  return withDatabaseError("getConsultationVisits", async () => {
    return prisma.visit.findMany({
      where: {
        status: "in_consultation"
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
        patient: true,
        route: {
          include: {
            steps: {
              orderBy: { startedAt: "desc" }
            }
          }
        },
        clinicalConsultation: {
          include: {
            diagnoses: {
              orderBy: [{ kind: "asc" }, { createdAt: "asc" }]
            },
            treatmentPlans: {
              orderBy: { createdAt: "desc" }
            }
          }
        },
        prescriptions: {
          orderBy: { createdAt: "desc" },
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
        workItems: {
          orderBy: { createdAt: "desc" }
        }
      }
    });
  });
}

export async function upsertClinicalConsultationRecord(input: UpsertClinicalConsultationRecordInput) {
  return withDatabaseError("upsertClinicalConsultationRecord", async () => {
    return prisma.$transaction(async (tx) => {
      const visit = await tx.visit.findUniqueOrThrow({
        where: { id: input.visitId },
        select: { patientId: true }
      });

      const consultation = await tx.clinicalConsultation.upsert({
        where: { visitId: input.visitId },
        create: {
          visitId: input.visitId,
          patientId: visit.patientId,
          doctorId: input.doctorId,
          motive: input.motive,
          findings: input.findings,
          observations: input.observations,
          treatmentPlanText: input.treatmentPlanText,
          indications: input.indications
        },
        update: {
          doctorId: input.doctorId,
          motive: input.motive,
          findings: input.findings,
          observations: input.observations,
          treatmentPlanText: input.treatmentPlanText,
          indications: input.indications
        }
      });

      await tx.diagnosis.deleteMany({
        where: { consultationId: consultation.id }
      });

      await tx.diagnosis.create({
        data: {
          consultationId: consultation.id,
          kind: "primary",
          name: input.primaryDiagnosis,
          findings: input.findings,
          observations: input.observations
        }
      });

      if (input.secondaryDiagnosis) {
        await tx.diagnosis.create({
          data: {
            consultationId: consultation.id,
            kind: "secondary",
            name: input.secondaryDiagnosis
          }
        });
      }

      await tx.treatmentPlan.deleteMany({
        where: { consultationId: consultation.id }
      });

      if (input.treatmentPlanText || input.indications) {
        await tx.treatmentPlan.create({
          data: {
            consultationId: consultation.id,
            observations: input.treatmentPlanText,
            medications: input.indications
          }
        });
      }

      if (input.prescriptionMedication) {
        const prescription = await tx.prescription.create({
          data: {
            visitId: input.visitId,
            patientId: visit.patientId,
            doctorId: input.doctorId,
            notes: input.prescriptionObservations
          }
        });

        await tx.prescriptionItem.create({
          data: {
            prescriptionId: prescription.id,
            medication: input.prescriptionMedication,
            dose: input.prescriptionDose,
            frequency: input.prescriptionFrequency,
            duration: input.prescriptionDuration,
            observations: input.prescriptionObservations
          }
        });
      }

      if (input.evolutionNote) {
        await tx.clinicalEvolution.create({
          data: {
            visitId: input.visitId,
            patientId: visit.patientId,
            userId: input.doctorId,
            note: input.evolutionNote
          }
        });
      }

      return consultation;
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
