import { NextResponse } from "next/server";
import { roleHasPermission } from "@/features/internal-auth/permissions";
import { appendAuditEvent } from "@/modules/audit/service";
import {
  getGeneratedDocument
} from "@/modules/generated-documents/service";
import { createGeneratedDocumentPdf } from "@/modules/generated-documents/pdf";
import { getCurrentInternalUser } from "@/modules/permissions";

export const runtime = "nodejs";

function downloadName(documentNumber: string) {
  return `${documentNumber.replace(/[^a-zA-Z0-9._-]/g, "_")}.pdf`;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const { documentId } = await params;
  const user = await getCurrentInternalUser();
  if (!user) {
    return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  }
  const document = await getGeneratedDocument(documentId);
  if (!document) {
    return NextResponse.json({ error: "Documento no encontrado." }, { status: 404 });
  }
  if (document.annulledAt) {
    return NextResponse.json(
      { error: "Este documento fue anulado y ya no puede emitirse." },
      { status: 410 }
    );
  }
  const canReadDocument =
    document.kind === "prescription"
      ? roleHasPermission(user.role, "clinical_read")
      : roleHasPermission(user.role, "sales_read");
  if (!canReadDocument) {
    await appendAuditEvent({
      actor: { id: user.id, role: user.role },
      action: "document.pdf.access",
      entityType: "generated_document",
      entityId: document.id,
      result: "denied",
      context: { reason: "missing_permission", kind: document.kind }
    });
    return NextResponse.json({ error: "No tienes permiso." }, { status: 403 });
  }

  const purpose = new URL(request.url).searchParams.get("purpose");
  const controlledPurpose =
    purpose === "download" || purpose === "print" ? purpose : "preview";
  try {
    const bytes = await createGeneratedDocumentPdf(document.parsedSnapshot);
    if (controlledPurpose !== "preview") {
      await appendAuditEvent({
        actor: { id: user.id, role: user.role },
        action:
          controlledPurpose === "download"
            ? "document.pdf.download"
            : "document.pdf.reprint",
        entityType: "generated_document",
        entityId: document.id,
        result: "success",
        context: {
          documentNumber: document.documentNumber,
          kind: document.kind,
          version: document.version
        }
      });
    }
    const disposition =
      controlledPurpose === "download" ? "attachment" : "inline";
    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${disposition}; filename="${downloadName(document.documentNumber)}"`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
        // Sin el token `sandbox`: con él, el visor de PDF del navegador (PDFium)
        // queda bloqueado y el iframe se ve en blanco. Se mantiene el bloqueo de
        // subrecursos y se limita el embebido a nuestro propio origen.
        "Content-Security-Policy": "default-src 'none'; frame-ancestors 'self'"
      }
    });
  } catch {
    if (controlledPurpose !== "preview") {
      await appendAuditEvent({
        actor: { id: user.id, role: user.role },
        action:
          controlledPurpose === "download"
            ? "document.pdf.download"
            : "document.pdf.reprint",
        entityType: "generated_document",
        entityId: document.id,
        result: "failure",
        context: { kind: document.kind }
      });
    }
    return NextResponse.json(
      { error: "No se pudo generar el PDF." },
      { status: 500 }
    );
  }
}
