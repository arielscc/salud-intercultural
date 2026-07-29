import { NextResponse } from "next/server";
import { appendAuditEvent } from "@/modules/audit/service";
import {
  ClinicalAttachmentApiAccessError,
  requireClinicalAttachmentApiAccess
} from "@/modules/clinical-attachments/api-auth";
import {
  ClinicalAttachmentError,
  createClinicalAttachment
} from "@/modules/clinical-attachments/service";
import {
  ClinicalFileValidationError,
  maximumClinicalUploadRequestBytes
} from "@/modules/clinical-attachments/validation";

export const runtime = "nodejs";

function optionalText(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function errorResponse(error: unknown) {
  if (error instanceof ClinicalAttachmentApiAccessError) {
    return NextResponse.json(
      { error: error.status === 401 ? "Debes iniciar sesión." : "No tienes permiso." },
      { status: error.status }
    );
  }
  if (error instanceof ClinicalFileValidationError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (error instanceof ClinicalAttachmentError) {
    const message =
      error.code === "idempotency_conflict"
        ? "El reintento no coincide con la carga original."
        : error.code === "upload_in_progress"
          ? "La carga todavía está en proceso."
          : "No se pudo relacionar el archivo con el paciente.";
    return NextResponse.json({ error: message }, { status: error.status });
  }
  return NextResponse.json(
    { error: "No se pudo guardar el archivo. Intenta nuevamente." },
    { status: 500 }
  );
}

export async function POST(request: Request) {
  let actor;

  try {
    actor = await requireClinicalAttachmentApiAccess({
      request,
      permission: "attachments_write",
      action: "attachment.upload"
    });
  } catch (error) {
    return errorResponse(error);
  }

  try {
    const contentLength = Number(request.headers.get("content-length"));

    if (
      !Number.isSafeInteger(contentLength) ||
      contentLength <= 0 ||
      contentLength > maximumClinicalUploadRequestBytes
    ) {
      throw new ClinicalFileValidationError(
        "too_large",
        "La carga supera el límite permitido o no informa un tamaño válido."
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const patientId = optionalText(formData, "patientId");
    const uploadRequestId = optionalText(formData, "uploadRequestId");

    if (
      !(file instanceof File) ||
      !patientId ||
      !uploadRequestId ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        uploadRequestId
      )
    ) {
      throw new ClinicalFileValidationError(
        "invalid_name",
        "La solicitud de carga no es válida."
      );
    }

    const result = await createClinicalAttachment({
      actor,
      patientId,
      visitId: optionalText(formData, "visitId"),
      studyId: optionalText(formData, "studyId"),
      uploadRequestId,
      label: optionalText(formData, "label"),
      file
    });

    await appendAuditEvent({
      actor,
      action: "attachment.upload",
      entityType: "clinical_attachment",
      entityId: result.attachment.id,
      result: "success",
      context: {
        reused: result.reused,
        sizeBytes: result.attachment.sizeBytes
      }
    });

    return NextResponse.json(result, { status: result.reused ? 200 : 201 });
  } catch (error) {
    await appendAuditEvent({
      actor,
      action: "attachment.upload",
      entityType: "clinical_attachment",
      result: "failure",
      context: {
        reason:
          error instanceof ClinicalFileValidationError ||
          error instanceof ClinicalAttachmentError
            ? error.code
            : "storage_error"
      }
    });
    return errorResponse(error);
  }
}
