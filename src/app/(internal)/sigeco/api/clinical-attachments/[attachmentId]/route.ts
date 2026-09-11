import { NextResponse } from "next/server";
import { appendAuditEvent } from "@/modules/audit/service";
import {
  ClinicalAttachmentApiAccessError,
  requireClinicalAttachmentApiAccess
} from "@/modules/clinical-attachments/api-auth";
import {
  ClinicalAttachmentError,
  softDeleteClinicalAttachment
} from "@/modules/clinical-attachments/service";

export const runtime = "nodejs";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ attachmentId: string }> }
) {
  const { attachmentId } = await params;
  let actor;

  try {
    actor = await requireClinicalAttachmentApiAccess({
      request,
      permission: "attachments_delete",
      action: "attachment.delete",
      attachmentId
    });
  } catch (error) {
    const status =
      error instanceof ClinicalAttachmentApiAccessError ? error.status : 500;
    return NextResponse.json(
      {
        error:
          status === 401
            ? "Debes iniciar sesión."
            : status === 409
              ? "Selecciona una sucursal activa."
              : "No tienes permiso."
      },
      { status }
    );
  }

  try {
    const result = await softDeleteClinicalAttachment({ attachmentId, actor });

    await appendAuditEvent({
      scope: "branch",
      branchCode: actor.branchCode,
      actor,
      action: "attachment.delete",
      entityType: "clinical_attachment",
      entityId: attachmentId,
      result: "success",
      context: { alreadyDeleted: result.alreadyDeleted }
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    await appendAuditEvent({
      scope: "branch",
      branchCode: actor.branchCode,
      actor,
      action: "attachment.delete",
      entityType: "clinical_attachment",
      entityId: attachmentId,
      result: "failure",
      context: {
        reason:
          error instanceof ClinicalAttachmentError
            ? error.code
            : "storage_error"
      }
    });
    return NextResponse.json(
      { error: "No se pudo eliminar el archivo de forma segura." },
      {
        status:
          error instanceof ClinicalAttachmentError ? error.status : 500
      }
    );
  }
}
