import { NextResponse } from "next/server";
import type { ClinicalAttachmentAccessPurpose } from "@/generated/prisma/client";
import { appendAuditEvent } from "@/modules/audit/service";
import {
  ClinicalAttachmentApiAccessError,
  requireClinicalAttachmentApiAccess
} from "@/modules/clinical-attachments/api-auth";
import {
  ClinicalAttachmentError,
  consumeClinicalAttachmentAccessGrant
} from "@/modules/clinical-attachments/service";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ attachmentId: string }> }
) {
  const { attachmentId } = await params;
  let actor;

  try {
    actor = await requireClinicalAttachmentApiAccess({
      request,
      permission: "attachments_read",
      action: "attachment.read",
      attachmentId
    });
  } catch (error) {
    const status =
      error instanceof ClinicalAttachmentApiAccessError ? error.status : 500;
    return NextResponse.json(
      { error: status === 401 ? "Debes iniciar sesión." : "No tienes permiso." },
      { status }
    );
  }

  try {
    const body = (await request.json().catch(() => null)) as {
      token?: string;
      purpose?: ClinicalAttachmentAccessPurpose;
    } | null;

    if (
      !body?.token ||
      body.token.length > 100 ||
      (body.purpose !== "preview" && body.purpose !== "download")
    ) {
      throw new ClinicalAttachmentError("invalid_grant", 403);
    }

    const result = await consumeClinicalAttachmentAccessGrant({
      attachmentId,
      actor,
      token: body.token,
      purpose: body.purpose
    });

    await appendAuditEvent({
      actor,
      action: "attachment.read",
      entityType: "clinical_attachment",
      entityId: attachmentId,
      result: "success",
      context: {
        purpose: body.purpose,
        sizeBytes: result.attachment.sizeBytes
      }
    });

    const disposition = body.purpose === "preview" ? "inline" : "attachment";
    const safeName = `documento-clinico-${attachmentId.slice(0, 8)}.${result.attachment.fileExtension}`;

    const responseBody = result.bytes.buffer.slice(
      result.bytes.byteOffset,
      result.bytes.byteOffset + result.bytes.byteLength
    ) as ArrayBuffer;

    return new Response(responseBody, {
      headers: {
        "Cache-Control": "private, no-store, max-age=0, must-revalidate",
        "Content-Disposition": `${disposition}; filename="${safeName}"`,
        "Content-Length": String(result.bytes.byteLength),
        "Content-Security-Policy": "sandbox; default-src 'none'",
        "Content-Type": result.attachment.contentType,
        "Pragma": "no-cache",
        "Referrer-Policy": "no-referrer",
        "X-Content-Type-Options": "nosniff",
        "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet"
      }
    });
  } catch (error) {
    const denied =
      error instanceof ClinicalAttachmentError &&
      error.code === "invalid_grant";
    await appendAuditEvent({
      actor,
      action: "attachment.read",
      entityType: "clinical_attachment",
      entityId: attachmentId,
      result: denied ? "denied" : "failure",
      context: {
        reason:
          error instanceof ClinicalAttachmentError
            ? error.code
            : "storage_error"
      }
    });

    return NextResponse.json(
      {
        error: denied
          ? "El permiso temporal venció o ya fue utilizado."
          : "No se pudo abrir el archivo."
      },
      { status: denied ? 403 : 500 }
    );
  }
}
