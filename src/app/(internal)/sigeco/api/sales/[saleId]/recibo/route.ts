import { NextResponse } from "next/server";
import { roleHasPermission } from "@/features/internal-auth/permissions";
import { appendAuditEvent } from "@/modules/audit/service";
import { getSaleById } from "@/modules/database/queries/sales";
import { createThermalReceiptPdf } from "@/modules/sales/thermal-receipt";
import { getCurrentInternalUser } from "@/modules/permissions";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ saleId: string }> }
) {
  const { saleId } = await params;
  const user = await getCurrentInternalUser();
  if (!user) {
    return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  }
  if (!roleHasPermission(user.role, "sales_read")) {
    await appendAuditEvent({
      actor: { id: user.id, role: user.role },
      action: "sale.receipt.thermal",
      entityType: "sale",
      entityId: saleId,
      result: "denied",
      context: { reason: "missing_permission" }
    });
    return NextResponse.json({ error: "No tienes permiso." }, { status: 403 });
  }

  const sale = await getSaleById(saleId);
  if (!sale) {
    return NextResponse.json({ error: "Venta no encontrada." }, { status: 404 });
  }

  const purpose = new URL(request.url).searchParams.get("purpose");
  const disposition = purpose === "download" ? "attachment" : "inline";

  try {
    const bytes = await createThermalReceiptPdf({
      saleId: sale.id,
      issuedAt: sale.createdAt,
      patient: {
        fullName: sale.patient.fullName,
        internalCode: sale.patient.internalCode
      },
      items: sale.items.map((item) => ({
        description: item.description,
        quantity: item.quantity
      })),
      totalCents: sale.totalCents,
      paidCents: sale.paidCents,
      balanceCents: sale.balanceCents
    });
    await appendAuditEvent({
      actor: { id: user.id, role: user.role },
      action: "sale.receipt.thermal",
      entityType: "sale",
      entityId: sale.id,
      result: "success",
      context: { purpose: disposition === "attachment" ? "download" : "print" }
    });
    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${disposition}; filename="recibo-${sale.id.slice(-8)}.pdf"`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox"
      }
    });
  } catch {
    await appendAuditEvent({
      actor: { id: user.id, role: user.role },
      action: "sale.receipt.thermal",
      entityType: "sale",
      entityId: sale.id,
      result: "failure"
    });
    return NextResponse.json({ error: "No se pudo generar el recibo." }, { status: 500 });
  }
}
