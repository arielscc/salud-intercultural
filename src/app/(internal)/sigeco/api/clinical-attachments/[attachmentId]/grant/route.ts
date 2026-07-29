import { NextResponse } from "next/server";
import type { ClinicalAttachmentAccessPurpose } from "@/generated/prisma/client";
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
    } | null;

    if (body?.purpose !== "preview" && body?.purpose !== "download") {
      return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 });
    }

    const grant = await createClinicalAttachmentAccessGrant({
      attachmentId,
      actor,
      purpose: body.purpose
    });

    return NextResponse.json({
      token: grant.token,
      expiresAt: grant.expiresAt.toISOString()
    });
  } catch (error) {
    if (error instanceof ClinicalAttachmentApiAccessError) {
      return NextResponse.json(
        { error: error.status === 401 ? "Debes iniciar sesión." : "No tienes permiso." },
        { status: error.status }
      );
    }
    if (error instanceof ClinicalAttachmentError) {
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
