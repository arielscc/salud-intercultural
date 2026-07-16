"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createPaymentRecord, createSaleRecord } from "@/modules/database/queries/sales";
import { findInsufficientStockError } from "@/modules/database/queries/inventory";
import { requirePermission } from "@/modules/permissions";
import {
  hasPaidStudyFlowError,
  releasePaidStudiesToNursing
} from "@/modules/database/queries/paid-studies";
import {
  createPaymentSchema,
  createSaleSchema,
  moneyToCents
} from "@/features/sales/schemas/sale.schema";

function parseFormData(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export async function createSaleAction(formData: FormData) {
  const user = await requirePermission("sales_write");
  const rawInput = parseFormData(formData);
  const parsed = createSaleSchema.safeParse(rawInput);

  if (!parsed.success) {
    const workItemId = typeof rawInput.workItemId === "string" ? rawInput.workItemId : "";
    redirect(
      workItemId
        ? `/sigeco/administracion/${workItemId}?error=invalid-sale`
        : "/sigeco/administracion?error=invalid-sale"
    );
  }

  let sale;
  try {
    sale = await createSaleRecord({
      patientId: parsed.data.patientId,
      visitId: parsed.data.visitId,
      workItemId: parsed.data.workItemId,
      createdById: user.id,
      itemType: parsed.data.itemType,
      inventoryItemId: parsed.data.inventoryItemId,
      description: parsed.data.description,
      quantity: parsed.data.quantity,
      unitPriceCents: moneyToCents(parsed.data.unitPrice),
      discountCents: moneyToCents(parsed.data.discount),
      initialPaymentCents: moneyToCents(parsed.data.initialPayment),
      paymentMethodCode: parsed.data.paymentMethodCode,
      paymentReference: parsed.data.paymentReference,
      notes: parsed.data.notes
    });
  } catch (error) {
    const stockError = findInsufficientStockError(error);
    if (!stockError) throw error;

    const query = new URLSearchParams({
      error: "insufficient-stock",
      product: stockError.itemName,
      available: String(stockError.available),
      requested: String(stockError.requested)
    });
    const target = parsed.data.workItemId
      ? `/sigeco/administracion/${parsed.data.workItemId}`
      : "/sigeco/administracion";
    redirect(`${target}?${query.toString()}`);
  }

  revalidatePath("/sigeco/administracion");
  if (parsed.data.workItemId) revalidatePath(`/sigeco/administracion/${parsed.data.workItemId}`);
  revalidatePath(`/sigeco/recepcion/pacientes/${parsed.data.patientId}`);
  redirect(`/sigeco/administracion/ventas/${sale.id}?aviso=venta-creada`);
}

export async function createPaymentAction(formData: FormData) {
  const user = await requirePermission("payments_write");
  const workItemId = String(formData.get("workItemId") ?? "");
  const parsed = createPaymentSchema.safeParse(parseFormData(formData));

  if (!parsed.success) {
    redirect("/sigeco/administracion?error=invalid-payment");
  }

  await createPaymentRecord({
    saleId: parsed.data.saleId,
    receivedById: user.id,
    amountCents: moneyToCents(parsed.data.amount),
    paymentMethodCode: parsed.data.paymentMethodCode,
    reference: parsed.data.reference,
    notes: parsed.data.notes,
    paidAt: parsed.data.paidAt
  });

  revalidatePath("/sigeco/administracion");
  if (workItemId) revalidatePath(`/sigeco/administracion/${workItemId}`);
  revalidatePath(`/sigeco/administracion/ventas/${parsed.data.saleId}`);
}

export async function sendPaidStudiesToNursingAction(formData: FormData) {
  const user = await requirePermission("visits_update");
  const workItemId = String(formData.get("workItemId") ?? "");
  if (!workItemId) redirect("/sigeco/administracion?error=invalid-study-order");
  try {
    await releasePaidStudiesToNursing({ workItemId, userId: user.id });
    revalidatePath("/sigeco/administracion");
    revalidatePath("/sigeco/enfermeria");
    revalidatePath("/sigeco/consultas");
    redirect("/sigeco/administracion?aviso=paciente-enviado-enfermeria");
  } catch (error) {
    if (hasPaidStudyFlowError(error, "STUDY_PAYMENT_REQUIRED")) {
      redirect(`/sigeco/administracion/${workItemId}?error=pago-pendiente`);
    }
    throw error;
  }
}
