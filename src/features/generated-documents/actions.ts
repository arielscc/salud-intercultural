"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auditedResult, runAuditedAction } from "@/modules/audit/service";
import {
  configureClinicalProfessionalProfile,
  correctPrescription,
  findGeneratedDocumentError,
  generateInternalReceiptDocument,
  generatePrescriptionDocument
} from "@/modules/generated-documents/service";
import {
  correctPrescriptionSchema,
  generateInternalReceiptDocumentSchema,
  generatePrescriptionDocumentSchema,
  professionalProfileSchema
} from "@/features/generated-documents/schemas";

function formValues(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export async function generatePrescriptionDocumentAction(formData: FormData) {
  const visitId = String(formData.get("visitId") ?? "");
  const parsed = generatePrescriptionDocumentSchema.safeParse(
    formValues(formData)
  );
  if (!parsed.success) {
    redirect(`/sigeco/consultas/${encodeURIComponent(visitId)}?error=receta-invalida`);
  }
  let documentId = "";
  try {
    const document = await runAuditedAction(
      {
        permission: "clinical_write",
        action: "document.prescription.generate",
        entityType: "generated_document",
        context: { visitId }
      },
      async (user) => {
        const generated = await generatePrescriptionDocument({
          visitId: parsed.data.visitId,
          generatedById: user.id
        });
        return auditedResult(generated, {
          entityId: generated.id,
          context: {
            visitId,
            documentNumber: generated.documentNumber,
            version: generated.version,
            prescriptionId: generated.prescriptionId
          }
        });
      }
    );
    documentId = document.id;
  } catch (error) {
    const code = findGeneratedDocumentError(error)?.code;
    const query =
      code === "DOCUMENT_PROFESSIONAL_PROFILE_REQUIRED"
        ? "perfil-profesional-requerido"
        : code === "DOCUMENT_SOURCE_NOT_FINALIZED"
          ? "consulta-sin-finalizar"
          : "receta-invalida";
    redirect(
      `/sigeco/consultas/${encodeURIComponent(visitId)}?error=${query}#documentos-receta`
    );
  }
  revalidatePath(`/sigeco/consultas/${visitId}`);
  redirect(
    `/sigeco/consultas/${encodeURIComponent(visitId)}/recetas/${encodeURIComponent(documentId)}`
  );
}

export async function correctPrescriptionAction(formData: FormData) {
  const visitId = String(formData.get("visitId") ?? "");
  const parsed = correctPrescriptionSchema.safeParse(formValues(formData));
  if (!parsed.success) {
    redirect(
      `/sigeco/consultas/${encodeURIComponent(visitId)}?error=correccion-receta-invalida#corregir-receta`
    );
  }
  let documentId = "";
  try {
    const document = await runAuditedAction(
      {
        permission: "clinical_correct",
        action: "clinical.prescription.correct",
        entityType: "prescription",
        context: { visitId }
      },
      async (user) => {
        // Valida consulta, fuente e identidad antes de insertar la corrección.
        // Así un perfil desactivado no deja una receta nueva sin documento.
        await generatePrescriptionDocument({
          visitId,
          generatedById: user.id
        });
        const prescription = await correctPrescription({
          ...parsed.data,
          doctorId: user.id
        });
        const generated = await generatePrescriptionDocument({
          visitId,
          generatedById: user.id
        });
        return auditedResult(generated, {
          entityId: prescription.id,
          context: {
            visitId,
            prescriptionVersion: prescription.version,
            generatedDocumentId: generated.id,
            documentVersion: generated.version,
            reason: parsed.data.reason
          }
        });
      }
    );
    documentId = document.id;
  } catch (error) {
    const code = findGeneratedDocumentError(error)?.code;
    const query =
      code === "PRESCRIPTION_NO_CHANGES"
        ? "correccion-receta-sin-cambios"
        : code === "DOCUMENT_PROFESSIONAL_PROFILE_REQUIRED"
          ? "perfil-profesional-requerido"
          : "correccion-receta-invalida";
    redirect(
      `/sigeco/consultas/${encodeURIComponent(visitId)}?error=${query}#corregir-receta`
    );
  }
  revalidatePath(`/sigeco/consultas/${visitId}`);
  redirect(
    `/sigeco/consultas/${encodeURIComponent(visitId)}/recetas/${encodeURIComponent(documentId)}`
  );
}

export async function generateInternalReceiptDocumentAction(
  formData: FormData
) {
  const saleId = String(formData.get("saleId") ?? "");
  const parsed = generateInternalReceiptDocumentSchema.safeParse(
    formValues(formData)
  );
  if (!parsed.success) {
    redirect(
      `/sigeco/administracion/ventas/${encodeURIComponent(saleId)}?error=comprobante-invalido`
    );
  }
  let documentId = "";
  try {
    const document = await runAuditedAction(
      {
        permission: "sales_write",
        action: "document.internal_receipt.generate",
        entityType: "generated_document",
        context: { saleId }
      },
      async (user) => {
        const generated = await generateInternalReceiptDocument({
          saleId,
          generatedById: user.id
        });
        return auditedResult(generated, {
          entityId: generated.id,
          context: {
            saleId,
            documentNumber: generated.documentNumber,
            version: generated.version
          }
        });
      }
    );
    documentId = document.id;
  } catch {
    redirect(
      `/sigeco/administracion/ventas/${encodeURIComponent(saleId)}?error=comprobante-inconsistente`
    );
  }
  revalidatePath(`/sigeco/administracion/ventas/${saleId}`);
  redirect(
    `/sigeco/administracion/ventas/${encodeURIComponent(saleId)}/comprobantes/${encodeURIComponent(documentId)}`
  );
}

export async function configureProfessionalProfileAction(
  formData: FormData
) {
  const parsed = professionalProfileSchema.safeParse(formValues(formData));
  if (!parsed.success) {
    redirect("/sigeco/documentos/configuracion?error=perfil-invalido");
  }
  await runAuditedAction(
    {
      permission: "documents_configure",
      action: "document.professional_profile.configure",
      entityType: "clinical_professional_profile",
      entityId: parsed.data.userId
    },
    async (user) => {
      const profile = await configureClinicalProfessionalProfile({
        ...parsed.data,
        configuredById: user.id
      });
      return auditedResult(profile, {
        entityId: profile.id,
        context: {
          professionalUserId: parsed.data.userId,
          active: parsed.data.active
        }
      });
    }
  );
  revalidatePath("/sigeco/documentos/configuracion");
  redirect("/sigeco/documentos/configuracion?aviso=perfil-guardado");
}
