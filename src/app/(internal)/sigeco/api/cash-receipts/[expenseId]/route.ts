import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { roleHasPermission } from "@/features/internal-auth/permissions";
import { appendAuditEvent } from "@/modules/audit/service";
import { readCashReceipt } from "@/modules/cash-receipts/storage";
import { getCashExpenseReceipt } from "@/modules/database/queries/cash";
import { getCurrentInternalUser } from "@/modules/permissions";

export const runtime = "nodejs";

function safeDownloadName(name: string | null) {
  const normalized = name
    ?.normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._ -]/g, "_")
    .slice(0, 120);
  return normalized || "comprobante";
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ expenseId: string }> }
) {
  const { expenseId } = await params;
  const user = await getCurrentInternalUser();

  if (!user) {
    return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  }
  if (!roleHasPermission(user.role, "cash_sessions_read")) {
    await appendAuditEvent({
      actor: { id: user.id, role: user.role },
      action: "cash.receipt.read",
      entityType: "cash_expense",
      entityId: expenseId,
      result: "denied",
      context: { reason: "missing_permission" }
    });
    return NextResponse.json({ error: "No tienes permiso." }, { status: 403 });
  }

  const receipt = await getCashExpenseReceipt(expenseId);
  if (
    !receipt?.receiptStorageKey ||
    !receipt.receiptStorageDriver ||
    !receipt.receiptMimeType ||
    !receipt.receiptChecksumSha256
  ) {
    return NextResponse.json(
      { error: "El comprobante no está disponible." },
      { status: 404 }
    );
  }

  try {
    const bytes = await readCashReceipt({
      storageKey: receipt.receiptStorageKey,
      storageDriver: receipt.receiptStorageDriver
    });
    const checksum = createHash("sha256").update(bytes).digest("hex");
    if (checksum !== receipt.receiptChecksumSha256) {
      throw new Error("CASH_RECEIPT_INTEGRITY_FAILURE");
    }
    await appendAuditEvent({
      actor: { id: user.id, role: user.role },
      action: "cash.receipt.read",
      entityType: "cash_expense",
      entityId: expenseId,
      result: "success",
      context: { sizeBytes: receipt.receiptSizeBytes }
    });

    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": receipt.receiptMimeType,
        "Content-Disposition": `inline; filename="${safeDownloadName(
          receipt.receiptOriginalName
        )}"`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch {
    await appendAuditEvent({
      actor: { id: user.id, role: user.role },
      action: "cash.receipt.read",
      entityType: "cash_expense",
      entityId: expenseId,
      result: "failure"
    });
    return NextResponse.json(
      { error: "No se pudo abrir el comprobante." },
      { status: 500 }
    );
  }
}
