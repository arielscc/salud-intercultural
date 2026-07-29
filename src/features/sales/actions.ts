"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auditedResult, runAuditedAction } from "@/modules/audit/service";
import { createPaymentRecord, createSaleRecord } from "@/modules/database/queries/sales";
import { findInsufficientStockError } from "@/modules/database/queries/inventory";
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
  const workItemId = String(formData.get("workItemId") ?? "");
  const patientId = String(formData.get("patientId") ?? "");
  const sale = await runAuditedAction(
    {
      permission: "sales_write",
      action: "sale.create",
      entityType: "sale",
      context: {
        patientId: patientId || undefined,
        workItemId: workItemId || undefined
      }
    },
    async (user) => {
      const rawInput = parseFormData(formData);
      const parsed = createSaleSchema.safeParse(rawInput);

      if (!parsed.success) {
        const invalidWorkItemId =
          typeof rawInput.workItemId === "string" ? rawInput.workItemId : "";
        redirect(
          invalidWorkItemId
            ? `/sigeco/administracion/${invalidWorkItemId}?error=invalid-sale`
            : "/sigeco/administracion?error=invalid-sale"
        );
      }

      let created;
      try {
        created = await createSaleRecord({
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

      return auditedResult(created, {
        entityId: created.id,
        context: {
          patientId: parsed.data.patientId,
          visitId: parsed.data.visitId,
          workItemId: parsed.data.workItemId,
          itemType: parsed.data.itemType,
          quantity: parsed.data.quantity,
          totalCents: created.totalCents
        }
      });
    }
  );

  revalidatePath("/sigeco/administracion");
  if (workItemId) revalidatePath(`/sigeco/administracion/${workItemId}`);
  revalidatePath(`/sigeco/recepcion/pacientes/${patientId}`);
  redirect(`/sigeco/administracion/ventas/${sale.id}?aviso=venta-creada`);
}

export async function createPaymentAction(formData: FormData) {
  const workItemId = String(formData.get("workItemId") ?? "");
  const saleId = String(formData.get("saleId") ?? "");
  await runAuditedAction(
    {
      permission: "payments_write",
      action: "payment.create",
      entityType: "sale",
      entityId: saleId || undefined,
      context: { workItemId: workItemId || undefined }
    },
    async (user) => {
      const parsed = createPaymentSchema.safeParse(parseFormData(formData));

      if (!parsed.success) {
        redirect("/sigeco/administracion?error=invalid-payment");
      }

      const amountCents = moneyToCents(parsed.data.amount);
      const payment = await createPaymentRecord({
        saleId: parsed.data.saleId,
        receivedById: user.id,
        amountCents,
        paymentMethodCode: parsed.data.paymentMethodCode,
        reference: parsed.data.reference,
        notes: parsed.data.notes,
        paidAt: parsed.data.paidAt
      });
      return auditedResult(payment, {
        entityId: parsed.data.saleId,
        context: { paymentId: payment.id, amountCents, workItemId: workItemId || undefined }
      });
    }
  );

  revalidatePath("/sigeco/administracion");
  if (workItemId) revalidatePath(`/sigeco/administracion/${workItemId}`);
  revalidatePath(`/sigeco/administracion/ventas/${saleId}`);
}

export async function sendPaidStudiesToNursingAction(formData: FormData) {
  const workItemId = String(formData.get("workItemId") ?? "");
  await runAuditedAction(
    {
      permission: "visits_update",
      action: "sale.paid_studies.release",
      entityType: "work_item",
      entityId: workItemId || undefined
    },
    async (user) => {
      if (!workItemId) redirect("/sigeco/administracion?error=invalid-study-order");
      try {
        await releasePaidStudiesToNursing({ workItemId, userId: user.id });
      } catch (error) {
        if (hasPaidStudyFlowError(error, "STUDY_PAYMENT_REQUIRED")) {
          redirect(`/sigeco/administracion/${workItemId}?error=pago-pendiente`);
        }
        throw error;
      }
      return auditedResult(undefined, { entityId: workItemId });
    }
  );
  revalidatePath("/sigeco/administracion");
  revalidatePath("/sigeco/enfermeria");
  revalidatePath("/sigeco/consultas");
  redirect("/sigeco/administracion?aviso=paciente-enviado-enfermeria");
}
