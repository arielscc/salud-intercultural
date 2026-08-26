import { describe, expect, it } from "vitest";
import { createGeneratedDocumentPdf } from "@/modules/generated-documents/pdf";
import type {
  InternalReceiptDocumentSnapshot,
  PrescriptionDocumentSnapshot
} from "@/modules/generated-documents/types";

const common = {
  schemaVersion: 1 as const,
  documentNumber: "DOC-20260730-TEST-V1",
  version: 1,
  issuedAt: "2026-07-30T15:00:00.000Z",
  clinic: {
    name: "Salud Intercultural",
    city: "El Alto",
    address: "Av. A",
    phone: "+59164175822"
  },
  patient: {
    id: "patient-1",
    internalCode: "P-001",
    fullName: "Paciente de prueba",
    identityDocument: null,
    birthDate: null
  }
};

describe("generated document PDFs", () => {
  it("creates a prescription PDF from the immutable snapshot", async () => {
    const snapshot: PrescriptionDocumentSnapshot = {
      ...common,
      kind: "prescription",
      visit: { id: "visit-1", checkedInAt: common.issuedAt },
      prescription: {
        id: "prescription-1",
        clinicalVersion: 1,
        createdAt: common.issuedAt,
        correctionReason: null,
        items: [
          {
            medication: "Tratamiento de prueba",
            dose: "Una medida",
            frequency: "Cada 12 horas",
            duration: "7 días",
            observations: null
          }
        ]
      },
      professional: {
        displayName: "Profesional de prueba",
        professionalTitle: "Dra.",
        specialty: "Medicina natural",
        ministryRegistration: "MS-1",
        medicalCollegeRegistration: "CM-1"
      },
      signatureStatus: "prepared_for_handwritten_signature_and_seal"
    };
    const bytes = await createGeneratedDocumentPdf(snapshot);
    expect(new TextDecoder().decode(bytes.slice(0, 4))).toBe("%PDF");
    expect(bytes.byteLength).toBeGreaterThan(800);
  });

  it("creates a non-fiscal internal receipt PDF", async () => {
    const snapshot: InternalReceiptDocumentSnapshot = {
      ...common,
      kind: "internal_sale_receipt",
      fiscalStatus: "internal_non_fiscal",
      sale: {
        id: "sale-1",
        createdAt: common.issuedAt,
        status: "paid",
        items: [
          {
            id: "item-1",
            type: "product",
            description: "Producto de prueba",
            quantity: 1,
            unitPriceCents: 1000,
            totalCents: 1000
          }
        ],
        payments: [],
        subtotalCents: 1000,
        discountCents: 0,
        totalCents: 1000,
        paidCents: 0,
        balanceCents: 1000
      },
      generatedBy: { id: "admin-1", name: "Administración" }
    };
    const bytes = await createGeneratedDocumentPdf(snapshot);
    expect(new TextDecoder().decode(bytes.slice(0, 4))).toBe("%PDF");
    expect(bytes.byteLength).toBeGreaterThan(800);
  });
});

