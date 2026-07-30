import type { Prisma } from "@/generated/prisma/client";
import type { CorrectClinicalConsultationInput } from "@/features/clinical-records/schemas/clinical-record.schema";
import {
  changedClinicalSnapshotFields,
  clinicalSnapshotChanged,
  type ClinicalSnapshot
} from "@/features/clinical-records/policy";
import { prisma, withDatabaseError } from "@/modules/database";

export type UpsertClinicalConsultationRecordInput = ClinicalSnapshot & {
  visitId: string;
  doctorId: string;
  expectedRevision: number;
  prescriptionMedication?: string;
  prescriptionDose?: string;
  prescriptionFrequency?: string;
  prescriptionDuration?: string;
  prescriptionObservations?: string;
  evolutionNote?: string;
};

export class ClinicalRecordWorkflowError extends Error {
  constructor(
    public readonly code:
      | "CLINICAL_RECORD_STALE"
      | "CLINICAL_RECORD_FINALIZED"
      | "CLINICAL_RECORD_NOT_FINALIZED"
      | "CLINICAL_RECORD_ALREADY_FINALIZED"
      | "CLINICAL_RECORD_NO_CHANGES"
  ) {
    super(code);
    this.name = "ClinicalRecordWorkflowError";
  }
}

export function findClinicalRecordWorkflowError(
  error: unknown
): ClinicalRecordWorkflowError | null {
  let current = error;

  while (current instanceof Error) {
    if (current instanceof ClinicalRecordWorkflowError) return current;
    current = "cause" in current ? current.cause : undefined;
  }

  return null;
}

function prismaErrorCode(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return error.code;
  }
  return null;
}

async function runClinicalRecordTransaction<T>(
  operation: (tx: Prisma.TransactionClient) => Promise<T>
) {
  try {
    return await prisma.$transaction(operation, {
      isolationLevel: "Serializable"
    });
  } catch (error) {
    if (["P2002", "P2034"].includes(prismaErrorCode(error) ?? "")) {
      throw new ClinicalRecordWorkflowError("CLINICAL_RECORD_STALE");
    }
    throw error;
  }
}

type ConsultationWithSnapshot = Prisma.ClinicalConsultationGetPayload<{
  include: {
    diagnoses: true;
  };
}>;

function diagnosisValue(
  consultation: ConsultationWithSnapshot,
  kind: "primary" | "secondary"
) {
  return consultation.diagnoses.find((diagnosis) => diagnosis.kind === kind)
    ?.name;
}

function snapshotFromConsultation(
  consultation: ConsultationWithSnapshot
): ClinicalSnapshot {
  return {
    motive: consultation.motive,
    primaryDiagnosis: diagnosisValue(consultation, "primary") ?? "",
    secondaryDiagnosis: diagnosisValue(consultation, "secondary"),
    findings: consultation.findings,
    observations: consultation.observations,
    treatmentPlanText: consultation.treatmentPlanText,
    indications: consultation.indications
  };
}

function versionData(
  consultationId: string,
  version: number,
  authorId: string | undefined,
  snapshot: ClinicalSnapshot
) {
  return {
    consultationId,
    version,
    authorId,
    motive: snapshot.motive,
    primaryDiagnosis: snapshot.primaryDiagnosis,
    secondaryDiagnosis: snapshot.secondaryDiagnosis,
    findings: snapshot.findings,
    observations: snapshot.observations,
    treatmentPlanText: snapshot.treatmentPlanText,
    indications: snapshot.indications
  };
}

async function replaceDiagnosesAndPlan(
  tx: Prisma.TransactionClient,
  consultationId: string,
  snapshot: ClinicalSnapshot
) {
  await tx.diagnosis.deleteMany({ where: { consultationId } });
  await tx.diagnosis.create({
    data: {
      consultationId,
      kind: "primary",
      name: snapshot.primaryDiagnosis,
      findings: snapshot.findings,
      observations: snapshot.observations
    }
  });
  if (snapshot.secondaryDiagnosis) {
    await tx.diagnosis.create({
      data: {
        consultationId,
        kind: "secondary",
        name: snapshot.secondaryDiagnosis
      }
    });
  }

  await tx.treatmentPlan.deleteMany({ where: { consultationId } });
  if (snapshot.treatmentPlanText || snapshot.indications) {
    await tx.treatmentPlan.create({
      data: {
        consultationId,
        observations: snapshot.treatmentPlanText,
        medications: snapshot.indications
      }
    });
  }
}

function normalize(value: string | null | undefined) {
  return value?.trim() || null;
}

async function appendPrescriptionWhenChanged(
  tx: Prisma.TransactionClient,
  input: UpsertClinicalConsultationRecordInput,
  patientId: string
) {
  if (!input.prescriptionMedication) return;

  const latest = await tx.prescription.findFirst({
    where: { visitId: input.visitId },
    orderBy: { createdAt: "desc" },
    include: { items: { take: 1, orderBy: { createdAt: "asc" } } }
  });
  const latestItem = latest?.items[0];
  const unchanged =
    normalize(latestItem?.medication) ===
      normalize(input.prescriptionMedication) &&
    normalize(latestItem?.dose) === normalize(input.prescriptionDose) &&
    normalize(latestItem?.frequency) ===
      normalize(input.prescriptionFrequency) &&
    normalize(latestItem?.duration) ===
      normalize(input.prescriptionDuration) &&
    normalize(latestItem?.observations) ===
      normalize(input.prescriptionObservations);

  if (unchanged) return;

  const prescription = await tx.prescription.create({
    data: {
      visitId: input.visitId,
      patientId,
      doctorId: input.doctorId,
      version: (latest?.version ?? 0) + 1,
      supersedesId: latest?.id,
      correctionReason: latest
        ? "Actualización registrada antes del cierre de la consulta"
        : null,
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

async function appendEvolution(
  tx: Prisma.TransactionClient,
  input: UpsertClinicalConsultationRecordInput,
  patientId: string
) {
  if (!input.evolutionNote) return;
  await tx.clinicalEvolution.create({
    data: {
      visitId: input.visitId,
      patientId,
      userId: input.doctorId,
      note: input.evolutionNote
    }
  });
}

export async function upsertClinicalConsultationRecord(
  input: UpsertClinicalConsultationRecordInput
) {
  return withDatabaseError("upsertClinicalConsultationRecord", async () => {
    return runClinicalRecordTransaction(async (tx) => {
        const visit = await tx.visit.findUniqueOrThrow({
          where: { id: input.visitId },
          select: { patientId: true }
        });
        const existing = await tx.clinicalConsultation.findUnique({
          where: { visitId: input.visitId },
          include: { diagnoses: true }
        });

        if (!existing) {
          if (input.expectedRevision !== 0) {
            throw new ClinicalRecordWorkflowError("CLINICAL_RECORD_STALE");
          }
          const consultation = await tx.clinicalConsultation.create({
            data: {
              visitId: input.visitId,
              patientId: visit.patientId,
              doctorId: input.doctorId,
              motive: input.motive,
              findings: input.findings,
              observations: input.observations,
              treatmentPlanText: input.treatmentPlanText,
              indications: input.indications
            }
          });
          await replaceDiagnosesAndPlan(tx, consultation.id, input);
          await tx.clinicalConsultationVersion.create({
            data: {
              ...versionData(
                consultation.id,
                consultation.revision,
                input.doctorId,
                input
              ),
              kind: "draft"
            }
          });
          await appendPrescriptionWhenChanged(tx, input, visit.patientId);
          await appendEvolution(tx, input, visit.patientId);
          return consultation;
        }

        if (existing.status === "finalized") {
          throw new ClinicalRecordWorkflowError("CLINICAL_RECORD_FINALIZED");
        }
        if (existing.revision !== input.expectedRevision) {
          throw new ClinicalRecordWorkflowError("CLINICAL_RECORD_STALE");
        }

        const nextRevision = existing.revision + 1;
        const updated = await tx.clinicalConsultation.updateMany({
          where: {
            id: existing.id,
            revision: input.expectedRevision,
            status: "draft"
          },
          data: {
            doctorId: input.doctorId,
            revision: nextRevision,
            motive: input.motive,
            findings: input.findings,
            observations: input.observations,
            treatmentPlanText: input.treatmentPlanText,
            indications: input.indications
          }
        });
        if (updated.count !== 1) {
          throw new ClinicalRecordWorkflowError("CLINICAL_RECORD_STALE");
        }

        await replaceDiagnosesAndPlan(tx, existing.id, input);
        await tx.clinicalConsultationVersion.create({
          data: {
            ...versionData(existing.id, nextRevision, input.doctorId, input),
            kind: "draft"
          }
        });
        await appendPrescriptionWhenChanged(tx, input, visit.patientId);
        await appendEvolution(tx, input, visit.patientId);

        return tx.clinicalConsultation.findUniqueOrThrow({
          where: { id: existing.id }
        });
    });
  });
}

export async function finalizeClinicalConsultation(input: {
  visitId: string;
  consultationId: string;
  expectedRevision: number;
  finalizedById: string;
}) {
  return withDatabaseError("finalizeClinicalConsultation", async () => {
    return runClinicalRecordTransaction(async (tx) => {
        const consultation = await tx.clinicalConsultation.findFirstOrThrow({
          where: { id: input.consultationId, visitId: input.visitId },
          include: { diagnoses: true }
        });
        if (consultation.status === "finalized") {
          throw new ClinicalRecordWorkflowError(
            "CLINICAL_RECORD_ALREADY_FINALIZED"
          );
        }
        if (consultation.revision !== input.expectedRevision) {
          throw new ClinicalRecordWorkflowError("CLINICAL_RECORD_STALE");
        }

        const nextRevision = consultation.revision + 1;
        const finalizedAt = new Date();
        const updated = await tx.clinicalConsultation.updateMany({
          where: {
            id: consultation.id,
            status: "draft",
            revision: input.expectedRevision
          },
          data: {
            status: "finalized",
            revision: nextRevision,
            finalizedById: input.finalizedById,
            finalizedAt
          }
        });
        if (updated.count !== 1) {
          throw new ClinicalRecordWorkflowError("CLINICAL_RECORD_STALE");
        }

        await tx.clinicalConsultationVersion.create({
          data: {
            ...versionData(
              consultation.id,
              nextRevision,
              input.finalizedById,
              snapshotFromConsultation(consultation)
            ),
            kind: "finalized"
          }
        });

        return tx.clinicalConsultation.findUniqueOrThrow({
          where: { id: consultation.id }
        });
    });
  });
}

export async function correctClinicalConsultation(
  input: CorrectClinicalConsultationInput & { correctedById: string }
) {
  return withDatabaseError("correctClinicalConsultation", async () => {
    return runClinicalRecordTransaction(async (tx) => {
        const consultation = await tx.clinicalConsultation.findFirstOrThrow({
          where: { id: input.consultationId, visitId: input.visitId },
          include: { diagnoses: true }
        });
        if (consultation.status !== "finalized") {
          throw new ClinicalRecordWorkflowError(
            "CLINICAL_RECORD_NOT_FINALIZED"
          );
        }
        if (consultation.revision !== input.expectedRevision) {
          throw new ClinicalRecordWorkflowError("CLINICAL_RECORD_STALE");
        }

        const previous = snapshotFromConsultation(consultation);
        if (!clinicalSnapshotChanged(previous, input)) {
          throw new ClinicalRecordWorkflowError("CLINICAL_RECORD_NO_CHANGES");
        }

        const [sales, applications, orders] = await Promise.all([
          tx.sale.count({ where: { visitId: input.visitId } }),
          tx.nursingApplication.count({ where: { visitId: input.visitId } }),
          tx.clinicalOrder.count({ where: { visitId: input.visitId } })
        ]);
        const nextRevision = consultation.revision + 1;
        const updated = await tx.clinicalConsultation.updateMany({
          where: {
            id: consultation.id,
            status: "finalized",
            revision: input.expectedRevision
          },
          data: {
            revision: nextRevision,
            motive: input.motive,
            findings: input.findings,
            observations: input.observations,
            treatmentPlanText: input.treatmentPlanText,
            indications: input.indications
          }
        });
        if (updated.count !== 1) {
          throw new ClinicalRecordWorkflowError("CLINICAL_RECORD_STALE");
        }

        await replaceDiagnosesAndPlan(tx, consultation.id, input);
        const version = await tx.clinicalConsultationVersion.create({
          data: {
            ...versionData(
              consultation.id,
              nextRevision,
              input.correctedById,
              input
            ),
            kind: "correction",
            correctionType: input.correctionType,
            correctionReason: input.correctionReason
          }
        });

        return {
          version,
          changedFields: changedClinicalSnapshotFields(previous, input),
          relatedRecords: { sales, applications, orders }
        };
    });
  });
}

export async function getClinicalConsultationVersionHistory(visitId: string) {
  return withDatabaseError(
    "getClinicalConsultationVersionHistory",
    async () => {
      return prisma.clinicalConsultation.findUnique({
        where: { visitId },
        include: {
          finalizedBy: {
            select: { id: true, name: true, email: true }
          },
          versions: {
            orderBy: { version: "asc" },
            include: {
              author: {
                select: { id: true, name: true, email: true }
              }
            }
          },
          visit: {
            select: {
              id: true,
              patient: {
                select: {
                  id: true,
                  internalCode: true,
                  fullName: true
                }
              }
            }
          }
        }
      });
    }
  );
}
