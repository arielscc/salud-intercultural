import { NextResponse } from "next/server";
import type { ClinicalAttachmentAccessPurpose } from "@/generated/prisma/client";
import { appendAuditEvent } from "@/modules/audit/service";
import { getBranchApiContext } from "@/features/branches/boundaries";
import {
  ClinicalAttachmentApiAccessError,
  requireClinicalAttachmentApiAccess
} from "@/modules/clinical-attachments/api-auth";
import {
  ClinicalAttachmentError,
  createClinicalAttachmentAccessGrant
} from "@/modules/clinical-attachments/service";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ attachmentId: string }> }
) {
  const { attachmentId } = await params;

  try {
    const actor = await requireClinicalAttachmentApiAccess({
      request,
      permission: "attachments_read",
      action: "attachment.read",
      attachmentId
    });
    const body = (await request.json().catch(() => null)) as {
      purpose?: ClinicalAttachmentAccessPurpose;
      continuityAccessId?: string;
    } | null;

    if (body?.purpose !== "preview" && body?.purpose !== "download") {
      return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 });
    }

    const grant = await createClinicalAttachmentAccessGrant({
      attachmentId,
      actor,
      purpose: body.purpose,
      continuityAccessId:
        typeof body.continuityAccessId === "string" && body.continuityAccessId.length <= 80
          ? body.continuityAccessId
          : undefined
    });

    await appendAuditEvent({
      actor,
      action: "attachment.grant.create",
      entityType: "clinical_attachment",
      entityId: attachmentId,
      result: "success",
      context: { purpose: body.purpose, expiresAt: grant.expiresAt.toISOString() }
    });

    return NextResponse.json({
      token: grant.token,
      expiresAt: grant.expiresAt.toISOString()
    });
  } catch (error) {
    if (error instanceof ClinicalAttachmentApiAccessError) {
      return NextResponse.json(
        {
          error:
            error.status === 401
              ? "Debes iniciar sesión."
              : error.status === 409
                ? "Selecciona una sucursal activa."
                : "No tienes permiso."
        },
        { status: error.status }
      );
    }
    if (error instanceof ClinicalAttachmentError) {
      const branchAccess = await getBranchApiContext();
      await appendAuditEvent({
        actor: branchAccess.ok ? {
          id: branchAccess.context.user.id,
          role: branchAccess.context.operationalRole
        } : undefined,
        action: "attachment.grant.create",
        entityType: "clinical_attachment",
        entityId: attachmentId,
        result: "denied",
        context: { reason: error.code }
      });
      return NextResponse.json(
        { error: "El archivo ya no está disponible." },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { error: "No se pudo autorizar el acceso." },
      { status: 500 }
    );
  }
}
