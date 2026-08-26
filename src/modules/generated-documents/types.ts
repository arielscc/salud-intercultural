import { z } from "zod";

const clinicSnapshotSchema = z.object({
  name: z.string(),
  city: z.string(),
  address: z.string(),
  phone: z.string()
});

const patientSnapshotSchema = z.object({
  id: z.string(),
  internalCode: z.string(),
  fullName: z.string(),
  identityDocument: z.string().nullable(),
  birthDate: z.string().nullable()
});

export const prescriptionDocumentSnapshotSchema = z.object({
  schemaVersion: z.literal(1),
  kind: z.literal("prescription"),
  documentNumber: z.string(),
  version: z.number().int().positive(),
  issuedAt: z.string(),
  clinic: clinicSnapshotSchema,
  patient: patientSnapshotSchema,
  visit: z.object({
    id: z.string(),
    checkedInAt: z.string()
  }),
  prescription: z.object({
    id: z.string(),
    clinicalVersion: z.number().int().positive(),
    createdAt: z.string(),
    correctionReason: z.string().nullable(),
    items: z.array(
      z.object({
        medication: z.string(),
        dose: z.string().nullable(),
        frequency: z.string().nullable(),
        duration: z.string().nullable(),
        observations: z.string().nullable()
      })
    ).min(1)
  }),
  professional: z.object({
    displayName: z.string(),
    professionalTitle: z.string(),
    specialty: z.string(),
    ministryRegistration: z.string(),
    medicalCollegeRegistration: z.string()
  }),
  signatureStatus: z.literal("prepared_for_handwritten_signature_and_seal")
});

export const internalReceiptDocumentSnapshotSchema = z.object({
  schemaVersion: z.literal(1),
  kind: z.literal("internal_sale_receipt"),
  documentNumber: z.string(),
  version: z.number().int().positive(),
  issuedAt: z.string(),
  fiscalStatus: z.literal("internal_non_fiscal"),
  clinic: clinicSnapshotSchema,
  patient: patientSnapshotSchema,
  sale: z.object({
    id: z.string(),
    createdAt: z.string(),
    status: z.string(),
    items: z.array(
      z.object({
        id: z.string(),
        type: z.string(),
        description: z.string(),
        quantity: z.number().int().positive(),
        unitPriceCents: z.number().int().nonnegative(),
        totalCents: z.number().int().nonnegative()
      })
    ).min(1),
    payments: z.array(
      z.object({
        id: z.string(),
        method: z.string(),
        amountCents: z.number().int().positive(),
        refundedCents: z.number().int().nonnegative(),
        effectiveCents: z.number().int().nonnegative(),
        reference: z.string().nullable(),
        paidAt: z.string(),
        receivedBy: z.string().nullable()
      })
    ),
    subtotalCents: z.number().int().nonnegative(),
    discountCents: z.number().int().nonnegative(),
    totalCents: z.number().int().nonnegative(),
    paidCents: z.number().int().nonnegative(),
    balanceCents: z.number().int().nonnegative()
  }),
  generatedBy: z.object({
    id: z.string(),
    name: z.string()
  })
});

export const generatedDocumentSnapshotSchema = z.discriminatedUnion("kind", [
  prescriptionDocumentSnapshotSchema,
  internalReceiptDocumentSnapshotSchema
]);

export type PrescriptionDocumentSnapshot = z.infer<
  typeof prescriptionDocumentSnapshotSchema
>;
export type InternalReceiptDocumentSnapshot = z.infer<
  typeof internalReceiptDocumentSnapshotSchema
>;
export type GeneratedDocumentSnapshot = z.infer<
  typeof generatedDocumentSnapshotSchema
>;

