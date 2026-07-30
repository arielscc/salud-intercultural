import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { roleHasPermission } from "@/features/internal-auth/permissions";
import { appendAuditEvent } from "@/modules/audit/service";
import { getPurchaseDocumentById } from "@/modules/database/queries/purchases";
import { getCurrentInternalUser } from "@/modules/permissions";
import { readPurchaseDocument } from "@/modules/purchase-documents/storage";

export const runtime = "nodejs";

function safeDownloadName(name: string) {
  return (
    name
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._ -]/g, "_")
      .slice(0, 120) || "documento-compra"
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const { documentId } = await params;
  const user = await getCurrentInternalUser();
  if (!user) {
    return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  }
  if (!roleHasPermission(user.role, "purchases_read")) {
    await appendAuditEvent({
      actor: { id: user.id, role: user.role },
      action: "purchase.document.read",
      entityType: "purchase_document",
      entityId: documentId,
      result: "denied",
      context: { reason: "missing_permission" }
    });
    return NextResponse.json({ error: "No tienes permiso." }, { status: 403 });
  }
  const document = await getPurchaseDocumentById(documentId);
  if (!document) {
    return NextResponse.json({ error: "Documento no encontrado." }, { status: 404 });
  }
  try {
    const bytes = await readPurchaseDocument(document);
    const checksum = createHash("sha256").update(bytes).digest("hex");
    if (checksum !== document.checksumSha256) {
      throw new Error("PURCHASE_DOCUMENT_INTEGRITY_FAILURE");
    }
    await appendAuditEvent({
      actor: { id: user.id, role: user.role },
      action: "purchase.document.read",
      entityType: "purchase_document",
      entityId: document.id,
      result: "success",
      context: { purchaseId: document.purchaseId, sizeBytes: document.sizeBytes }
    });
    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": document.mimeType,
        "Content-Disposition": `inline; filename="${safeDownloadName(document.originalName)}"`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch {
    await appendAuditEvent({
      actor: { id: user.id, role: user.role },
      action: "purchase.document.read",
      entityType: "purchase_document",
      entityId: document.id,
      result: "failure"
    });
    return NextResponse.json(
      { error: "No se pudo abrir el documento." },
      { status: 500 }
    );
  }
}
