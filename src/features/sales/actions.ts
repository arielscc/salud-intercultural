"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auditedResult, runAuditedAction } from "@/modules/audit/service";
import {
  applyAdminDiscountToSale,
  confirmDoctorOrderSale,
  createPaymentRecord,
  createSaleRecord,
  findDoctorOrderSaleError
} from "@/modules/database/queries/sales";
import {
  findInsufficientStockError,
  findInventoryCatalogError
} from "@/modules/database/queries/inventory";
import { findCashWorkflowError } from "@/modules/database/queries/cash";
import {
  hasPaidStudyFlowError,
  releasePaidStudiesToNursing
} from "@/modules/database/queries/paid-studies";
import {
  applySaleDiscountSchema,
  confirmDoctorOrderSchema,
  createPaymentSchema,
  createSaleSchema,
  moneyToCents
} from "@/features/sales/schemas/sale.schema";
import { getBranchContext } from "@/features/branches/context";

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
      const { activeBranch } = await getBranchContext(user);
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
          idempotencyKey: parsed.data.idempotencyKey,
          patientId: parsed.data.patientId,
          visitId: parsed.data.visitId,
          workItemId: parsed.data.workItemId,
          createdById: user.id,
          branchCode: activeBranch.code,
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
        const cashError = findCashWorkflowError(error);
        if (cashError?.code === "session_not_open") {
          const target = parsed.data.workItemId
            ? `/sigeco/administracion/${parsed.data.workItemId}`
            : "/sigeco/administracion";
          redirect(`${target}?error=cash-session-required`);
        }
        const stockError = findInsufficientStockError(error);
        const target = parsed.data.workItemId
          ? `/sigeco/administracion/${parsed.data.workItemId}`
          : "/sigeco/administracion";
        const catalogError = findInventoryCatalogError(error);
        if (catalogError?.code === "inactive-item" || catalogError?.code === "not-for-sale") {
          redirect(`${target}?error=unavailable-product`);
        }
        if (!stockError) throw error;
        redirect(`${target}?error=insufficient-stock`);
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

export async function confirmDoctorOrderSaleAction(formData: FormData) {
  const workItemId = String(formData.get("workItemId") ?? "");
  const target = workItemId ? `/sigeco/administracion/${workItemId}` : "/sigeco/administracion";
  const result = await runAuditedAction(
    {
      permission: "sales_write",
      action: "sale.doctor_order.confirm",
      entityType: "sale",
      context: { workItemId: workItemId || undefined }
    },
    async (user) => {
      const { activeBranch } = await getBranchContext(user);
      const parsed = confirmDoctorOrderSchema.safeParse(parseFormData(formData));
      if (!parsed.success) redirect(`${target}?error=invalid-sale`);

      let created;
      try {
        created = await confirmDoctorOrderSale({
          doctorOrderId: parsed.data.doctorOrderId,
          workItemId: parsed.data.workItemId,
          createdById: user.id,
          branchCode: activeBranch.code,
          adminDiscountCents: moneyToCents(parsed.data.discount),
          initialPaymentCents: moneyToCents(parsed.data.initialPayment),
          paymentMethodCode: parsed.data.paymentMethodCode,
          paymentReference: parsed.data.paymentReference,
          notes: parsed.data.notes
        });
      } catch (error) {
        const cashError = findCashWorkflowError(error);
        if (cashError?.code === "session_not_open") {
          redirect(`${target}?error=cash-session-required`);
        }
        const stockError = findInsufficientStockError(error);
        if (stockError) redirect(`${target}?error=insufficient-stock`);
        const orderError = findDoctorOrderSaleError(error);
        if (orderError) redirect(`${target}?error=${orderError.code}`);
        throw error;
      }

      return auditedResult(created, {
        entityId: created.sale.id,
        context: {
          doctorOrderId: parsed.data.doctorOrderId,
          discountCents: created.sale.discountCents,
          totalCents: created.sale.totalCents,
          requiresNursing: created.requiresNursing,
          workItemId: parsed.data.workItemId
        }
      });
    }
  );

  revalidatePath("/sigeco/administracion");
  if (workItemId) revalidatePath(`/sigeco/administracion/${workItemId}`);
  revalidatePath("/sigeco/consultas");
  // El suero/servicio se deriva a Enfermería desde la tarea; el resto va a la
  // venta para cobrar el saldo.
  if (result.requiresNursing && workItemId) {
    redirect(`/sigeco/administracion/${workItemId}?aviso=venta-creada`);
  }
  redirect(`/sigeco/administracion/ventas/${result.sale.id}?aviso=venta-creada`);
}

export async function applySaleDiscountAction(formData: FormData) {
  const workItemId = String(formData.get("workItemId") ?? "");
  const saleId = String(formData.get("saleId") ?? "");
  const target = workItemId
    ? `/sigeco/administracion/${workItemId}`
    : `/sigeco/administracion/ventas/${saleId}`;
  await runAuditedAction(
    {
      permission: "sales_write",
      action: "sale.discount.apply",
      entityType: "sale",
      entityId: saleId || undefined,
      context: { workItemId: workItemId || undefined }
    },
    async (user) => {
      const parsed = applySaleDiscountSchema.safeParse(parseFormData(formData));
      if (!parsed.success) redirect(`${target}?error=invalid-sale`);

      const updated = await applyAdminDiscountToSale({
        saleId: parsed.data.saleId,
        discountCents: moneyToCents(parsed.data.discount),
        userId: user.id
      });
      return auditedResult(updated, {
        entityId: parsed.data.saleId,
        context: {
          workItemId: parsed.data.workItemId,
          discountCents: updated.discountCents,
          totalCents: updated.totalCents
        }
      });
    }
  );

  revalidatePath("/sigeco/administracion");
  if (workItemId) revalidatePath(`/sigeco/administracion/${workItemId}`);
  revalidatePath(`/sigeco/administracion/ventas/${saleId}`);
  redirect(`${target}?aviso=descuento-aplicado`);
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
      const { activeBranch } = await getBranchContext(user);
      const parsed = createPaymentSchema.safeParse(parseFormData(formData));

      if (!parsed.success) {
        redirect("/sigeco/administracion?error=invalid-payment");
      }

      const amountCents = moneyToCents(parsed.data.amount);
      let payment;
      try {
        payment = await createPaymentRecord({
          idempotencyKey: parsed.data.idempotencyKey,
          saleId: parsed.data.saleId,
          receivedById: user.id,
          amountCents,
          paymentMethodCode: parsed.data.paymentMethodCode,
          reference: parsed.data.reference,
          notes: parsed.data.notes,
          paidAt: parsed.data.paidAt,
          branchCode: activeBranch.code
        });
      } catch (error) {
        const cashError = findCashWorkflowError(error);
        if (cashError?.code === "session_not_open") {
          const target = workItemId
            ? `/sigeco/administracion/${workItemId}`
            : `/sigeco/administracion/ventas/${parsed.data.saleId}`;
          redirect(`${target}?error=cash-session-required`);
        }
        throw error;
      }
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
