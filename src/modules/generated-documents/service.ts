import { createHash, randomUUID } from "node:crypto";
import type {
  GeneratedDocument,
  Prisma
} from "@/generated/prisma/client";
import { clinic } from "@/data/clinic";
import { prisma, withDatabaseError } from "@/modules/database";
import {
  generatedDocumentSnapshotSchema,
  type InternalReceiptDocumentSnapshot,
  type PrescriptionDocumentSnapshot
} from "@/modules/generated-documents/types";

export class GeneratedDocumentError extends Error {
  constructor(
    public readonly code:
      | "DOCUMENT_SOURCE_NOT_FOUND"
      | "DOCUMENT_SOURCE_NOT_FINALIZED"
      | "DOCUMENT_PROFESSIONAL_PROFILE_REQUIRED"
      | "DOCUMENT_SOURCE_INCONSISTENT"
      | "PRESCRIPTION_NO_CHANGES"
      | "DOCUMENT_WRONG_KIND"
  ) {
    super(code);
    this.name = "GeneratedDocumentError";
  }
}

export function findGeneratedDocumentError(
  error: unknown
): GeneratedDocumentError | null {
  let current = error;
  while (current instanceof Error) {
    if (current instanceof GeneratedDocumentError) return current;
    current = "cause" in current ? current.cause : undefined;
  }
  return null;
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, stableValue(nested)])
    );
  }
  return value;
}

export function sourceFingerprint(value: unknown) {
  return createHash("sha256")
    .update(JSON.stringify(stableValue(value)))
    .digest("hex");
}

function clinicSnapshot() {
  return {
    name: clinic.name,
    city: clinic.city,
    address: clinic.displayAddress,
    phone: clinic.whatsapp
  };
}

function patientSnapshot(patient: {
  id: string;
  internalCode: string;
  fullName: string;
  birthDate: Date | null;
}) {
  return {
    id: patient.id,
    internalCode: patient.internalCode,
    fullName: patient.fullName,
    identityDocument: null,
    birthDate: patient.birthDate?.toISOString() ?? null
  };
}

function documentNumber(prefix: "REC" | "CINT", now: Date, version: number) {
  const date = now.toISOString().slice(0, 10).replaceAll("-", "");
  return `${prefix}-${date}-${randomUUID().slice(0, 8).toUpperCase()}-V${version}`;
}

function prismaCode(error: unknown) {
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

async function serializableDocumentTransaction<T>(
  operation: (tx: Prisma.TransactionClient) => Promise<T>
) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(operation, {
        isolationLevel: "Serializable"
      });
    } catch (error) {
      lastError = error;
      if (!["P2002", "P2034"].includes(prismaCode(error) ?? "")) throw error;
    }
  }
  throw lastError;
}

export async function generatePrescriptionDocument(input: {
  visitId: string;
  generatedById: string;
}) {
  return withDatabaseError("generatePrescriptionDocument", async () => {
    return serializableDocumentTransaction(async (tx) => {
      const visit = await tx.visit.findUnique({
        where: { id: input.visitId },
        include: {
          patient: true,
          clinicalConsultation: { select: { status: true } },
          prescriptions: {
            orderBy: [{ version: "desc" }, { createdAt: "desc" }],
            take: 1,
            include: {
              items: { orderBy: { createdAt: "asc" } },
              doctor: {
                include: { professionalProfile: true }
              }
            }
          }
        }
      });
      const prescription = visit?.prescriptions[0];
      if (!visit || !prescription || prescription.items.length === 0) {
        throw new GeneratedDocumentError("DOCUMENT_SOURCE_NOT_FOUND");
      }
      if (visit.clinicalConsultation?.status !== "finalized") {
        throw new GeneratedDocumentError("DOCUMENT_SOURCE_NOT_FINALIZED");
      }
      const profile = prescription.doctor?.professionalProfile;
      if (!profile?.active) {
        throw new GeneratedDocumentError(
          "DOCUMENT_PROFESSIONAL_PROFILE_REQUIRED"
        );
      }

      const seriesKey = `prescription:${visit.id}`;
      const source = {
        patient: patientSnapshot(visit.patient),
        visitId: visit.id,
        prescriptionId: prescription.id,
        clinicalVersion: prescription.version,
        createdAt: prescription.createdAt.toISOString(),
        correctionReason: prescription.correctionReason,
        items: prescription.items.map((item) => ({
          medication: item.medication,
          dose: item.dose,
          frequency: item.frequency,
          duration: item.duration,
          observations: item.observations
        })),
        professional: {
          displayName: profile.displayName,
          professionalTitle: profile.professionalTitle,
          specialty: profile.specialty,
          ministryRegistration: profile.ministryRegistration,
          medicalCollegeRegistration: profile.medicalCollegeRegistration
        }
      };
      const fingerprint = sourceFingerprint(source);
      const existing = await tx.generatedDocument.findUnique({
        where: {
          seriesKey_sourceFingerprint: {
            seriesKey,
            sourceFingerprint: fingerprint
          }
        }
      });
      if (existing) return existing;

      const latest = await tx.generatedDocument.findFirst({
        where: { seriesKey },
        orderBy: { version: "desc" }
      });
      const version = (latest?.version ?? 0) + 1;
      const now = new Date();
      const number = documentNumber("REC", now, version);
      const snapshot: PrescriptionDocumentSnapshot = {
        schemaVersion: 1,
        kind: "prescription",
        documentNumber: number,
        version,
        issuedAt: now.toISOString(),
        clinic: clinicSnapshot(),
        patient: source.patient,
        visit: {
          id: visit.id,
          checkedInAt: visit.checkedInAt.toISOString()
        },
        prescription: {
          id: prescription.id,
          clinicalVersion: prescription.version,
          createdAt: prescription.createdAt.toISOString(),
          correctionReason: prescription.correctionReason,
          items: source.items
        },
        professional: source.professional,
        signatureStatus: "prepared_for_handwritten_signature_and_seal"
      };

      return tx.generatedDocument.create({
        data: {
          kind: "prescription",
          documentNumber: number,
          seriesKey,
          version,
          patientId: visit.patientId,
          visitId: visit.id,
          prescriptionId: prescription.id,
          generatedById: input.generatedById,
          supersedesId: latest?.id,
          sourceFingerprint: fingerprint,
          snapshot,
          generatedAt: now
        }
      });
    });
  });
}

export async function generateInternalReceiptDocument(input: {
  saleId: string;
  generatedById: string;
}) {
  return withDatabaseError("generateInternalReceiptDocument", async () => {
    return serializableDocumentTransaction(async (tx) => {
      const sale = await tx.sale.findUnique({
        where: { id: input.saleId },
        include: {
          patient: true,
          items: { orderBy: { createdAt: "asc" } },
          payments: {
            orderBy: { paidAt: "asc" },
            include: {
              method: true,
              receivedBy: { select: { name: true, email: true } },
              cashMovements: {
                include: {
                  corrections: {
                    where: { type: "refund" },
                    select: { amountCents: true }
                  }
                }
              }
            }
          }
        }
      });
      if (!sale || sale.items.length === 0) {
        throw new GeneratedDocumentError("DOCUMENT_SOURCE_NOT_FOUND");
      }
      const itemSubtotal = sale.items.reduce(
        (total, item) => total + item.totalCents,
        0
      );
      const payments = sale.payments.map((payment) => {
        const refundedCents = payment.cashMovements.reduce(
          (movementTotal, movement) =>
            movementTotal +
            movement.corrections.reduce(
              (total, correction) => total + correction.amountCents,
              0
            ),
          0
        );
        return {
          id: payment.id,
          method: payment.method.name,
          amountCents: payment.amountCents,
          refundedCents,
          effectiveCents: payment.amountCents - refundedCents,
          reference: payment.reference,
          paidAt: payment.paidAt.toISOString(),
          receivedBy:
            payment.receivedBy?.name ?? payment.receivedBy?.email ?? null
        };
      });
      const effectivePaid = payments.reduce(
        (total, payment) => total + payment.effectiveCents,
        0
      );
      if (
        itemSubtotal !== sale.subtotalCents ||
        sale.totalCents !== sale.subtotalCents - sale.discountCents ||
        effectivePaid !== sale.paidCents ||
        Math.max(sale.totalCents - effectivePaid, 0) !== sale.balanceCents ||
        payments.some((payment) => payment.effectiveCents < 0)
      ) {
        throw new GeneratedDocumentError("DOCUMENT_SOURCE_INCONSISTENT");
      }

      const seriesKey = `internal-sale-receipt:${sale.id}`;
      const source = {
        patient: patientSnapshot(sale.patient),
        saleId: sale.id,
        saleCreatedAt: sale.createdAt.toISOString(),
        saleStatus: sale.status,
        items: sale.items.map((item) => ({
          id: item.id,
          type: item.type,
          description: item.description,
          quantity: item.quantity,
          unitPriceCents: item.unitPriceCents,
          totalCents: item.totalCents
        })),
        payments,
        subtotalCents: sale.subtotalCents,
        discountCents: sale.discountCents,
        totalCents: sale.totalCents,
        paidCents: effectivePaid,
        balanceCents: sale.balanceCents
      };
      const fingerprint = sourceFingerprint(source);
      const existing = await tx.generatedDocument.findUnique({
        where: {
          seriesKey_sourceFingerprint: {
            seriesKey,
            sourceFingerprint: fingerprint
          }
        }
      });
      if (existing) return existing;

      const [latest, generatedBy] = await Promise.all([
        tx.generatedDocument.findFirst({
          where: { seriesKey },
          orderBy: { version: "desc" }
        }),
        tx.internalUser.findUniqueOrThrow({
          where: { id: input.generatedById },
          select: { id: true, name: true, email: true }
        })
      ]);
      const version = (latest?.version ?? 0) + 1;
      const now = new Date();
      const number = documentNumber("CINT", now, version);
      const snapshot: InternalReceiptDocumentSnapshot = {
        schemaVersion: 1,
        kind: "internal_sale_receipt",
        documentNumber: number,
        version,
        issuedAt: now.toISOString(),
        fiscalStatus: "internal_non_fiscal",
        clinic: clinicSnapshot(),
        patient: source.patient,
        sale: {
          id: sale.id,
          createdAt: sale.createdAt.toISOString(),
          status: sale.status,
          items: source.items,
          payments,
          subtotalCents: sale.subtotalCents,
          discountCents: sale.discountCents,
          totalCents: sale.totalCents,
          paidCents: effectivePaid,
          balanceCents: sale.balanceCents
        },
        generatedBy: {
          id: generatedBy.id,
          name: generatedBy.name ?? generatedBy.email
        }
      };

      return tx.generatedDocument.create({
        data: {
          kind: "internal_sale_receipt",
          documentNumber: number,
          seriesKey,
          version,
          patientId: sale.patientId,
          visitId: sale.visitId,
          saleId: sale.id,
          generatedById: input.generatedById,
          supersedesId: latest?.id,
          sourceFingerprint: fingerprint,
          snapshot,
          generatedAt: now
        }
      });
    });
  });
}

export async function getGeneratedDocument(id: string) {
  return withDatabaseError("getGeneratedDocument", async () => {
    const document = await prisma.generatedDocument.findUnique({
      where: { id },
      include: {
        generatedBy: { select: { id: true, name: true, email: true } }
      }
    });
    if (!document) return null;
    return {
      ...document,
      parsedSnapshot: generatedDocumentSnapshotSchema.parse(document.snapshot)
    };
  });
}

export async function getPrescriptionDocuments(visitId: string) {
  return withDatabaseError("getPrescriptionDocuments", () =>
    prisma.generatedDocument.findMany({
      where: { kind: "prescription", visitId },
      orderBy: { version: "desc" }
    })
  );
}

export async function getSaleReceiptDocuments(saleId: string) {
  return withDatabaseError("getSaleReceiptDocuments", () =>
    prisma.generatedDocument.findMany({
      where: { kind: "internal_sale_receipt", saleId },
      orderBy: { version: "desc" }
    })
  );
}

export async function correctPrescription(input: {
  visitId: string;
  doctorId: string;
  reason: string;
  medication: string;
  dose?: string;
  frequency?: string;
  duration?: string;
  observations?: string;
}) {
  return withDatabaseError("correctPrescription", async () => {
    return serializableDocumentTransaction(async (tx) => {
      const visit = await tx.visit.findUnique({
        where: { id: input.visitId },
        include: {
          clinicalConsultation: { select: { status: true } },
          prescriptions: {
            orderBy: [{ version: "desc" }, { createdAt: "desc" }],
            take: 1,
            include: { items: { orderBy: { createdAt: "asc" }, take: 1 } }
          }
        }
      });
      const latest = visit?.prescriptions[0];
      if (!visit || !latest) {
        throw new GeneratedDocumentError("DOCUMENT_SOURCE_NOT_FOUND");
      }
      if (visit.clinicalConsultation?.status !== "finalized") {
        throw new GeneratedDocumentError("DOCUMENT_SOURCE_NOT_FINALIZED");
      }
      const normalize = (value: string | null | undefined) =>
        value?.trim() || null;
      const latestItem = latest.items[0];
      if (
        normalize(latestItem?.medication) === normalize(input.medication) &&
        normalize(latestItem?.dose) === normalize(input.dose) &&
        normalize(latestItem?.frequency) === normalize(input.frequency) &&
        normalize(latestItem?.duration) === normalize(input.duration) &&
        normalize(latestItem?.observations) === normalize(input.observations)
      ) {
        throw new GeneratedDocumentError("PRESCRIPTION_NO_CHANGES");
      }

      return tx.prescription.create({
        data: {
          visitId: visit.id,
          patientId: visit.patientId,
          doctorId: input.doctorId,
          version: latest.version + 1,
          supersedesId: latest.id,
          correctionReason: input.reason.trim(),
          notes: normalize(input.observations),
          items: {
            create: {
              medication: input.medication.trim(),
              dose: normalize(input.dose),
              frequency: normalize(input.frequency),
              duration: normalize(input.duration),
              observations: normalize(input.observations)
            }
          }
        },
        include: { items: true }
      });
    });
  });
}

export async function getClinicalProfessionalProfiles() {
  return withDatabaseError("getClinicalProfessionalProfiles", async () => {
    return prisma.internalUser.findMany({
      where: { role: "medico", active: true },
      select: {
        id: true,
        name: true,
        email: true,
        professionalProfile: true
      },
      orderBy: [{ name: "asc" }, { email: "asc" }]
    });
  });
}

export async function configureClinicalProfessionalProfile(input: {
  userId: string;
  configuredById: string;
  displayName: string;
  professionalTitle: string;
  specialty: string;
  ministryRegistration: string;
  medicalCollegeRegistration: string;
  active: boolean;
}) {
  return withDatabaseError("configureClinicalProfessionalProfile", async () => {
    const doctor = await prisma.internalUser.findFirst({
      where: { id: input.userId, role: "medico", active: true },
      select: { id: true }
    });
    if (!doctor) {
      throw new GeneratedDocumentError("DOCUMENT_SOURCE_NOT_FOUND");
    }
    return prisma.clinicalProfessionalProfile.upsert({
      where: { userId: input.userId },
      create: {
        userId: input.userId,
        displayName: input.displayName.trim(),
        professionalTitle: input.professionalTitle.trim(),
        specialty: input.specialty.trim(),
        ministryRegistration: input.ministryRegistration.trim(),
        medicalCollegeRegistration:
          input.medicalCollegeRegistration.trim(),
        active: input.active,
        configuredById: input.configuredById
      },
      update: {
        displayName: input.displayName.trim(),
        professionalTitle: input.professionalTitle.trim(),
        specialty: input.specialty.trim(),
        ministryRegistration: input.ministryRegistration.trim(),
        medicalCollegeRegistration:
          input.medicalCollegeRegistration.trim(),
        active: input.active,
        configuredById: input.configuredById,
        configuredAt: new Date()
      }
    });
  });
}

export function assertGeneratedDocumentKind(
  document: GeneratedDocument,
  expected: GeneratedDocument["kind"]
) {
  if (document.kind !== expected) {
    throw new GeneratedDocumentError("DOCUMENT_WRONG_KIND");
  }
}
