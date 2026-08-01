"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auditedResult, runAuditedAction } from "@/modules/audit/service";
import { validateClinicalFile } from "@/modules/clinical-attachments/validation";
import {
  cancelPurchaseRecord,
  confirmPurchaseRecord,
  createInventoryLotAdjustmentRecord,
  createPurchaseDraftRecord,
  createPurchaseReceiptRecord,
  findPurchaseWorkflowError,
  getPurchaseDocumentByStorageKey,
  recordPurchasePayment,
  type PurchaseDocumentMetadata
} from "@/modules/database/queries/purchases";
import {
  createPurchaseDocumentStorageKey,
  deletePurchaseDocument,
  storePurchaseDocument
} from "@/modules/purchase-documents/storage";
import {
  cancelPurchaseSchema,
  confirmPurchaseSchema,
  inventoryLotAdjustmentSchema,
  purchaseDraftSchema,
  purchaseLineSchema,
  purchaseMoneyToCents,
  purchasePaymentSchema,
  purchaseReceiptLineSchema,
  purchaseReceiptSchema
} from "@/features/purchases/schemas/purchase.schema";
import { getBranchContext } from "@/features/branches/context";

function parseFormData(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

function purchaseErrorRedirect(error: unknown, pathname: string): never {
  const workflowError = findPurchaseWorkflowError(error);
  if (workflowError) redirect(`${pathname}?error=${workflowError.code}`);
  throw error;
}

async function storeOptionalDocument(
  formData: FormData,
  requestId: string,
  label: string
): Promise<PurchaseDocumentMetadata | undefined> {
  const file = formData.get("document");
  if (!(file instanceof File) || file.size === 0) return undefined;
  const validated = await validateClinicalFile(file, label);
  const storageKey = createPurchaseDocumentStorageKey(requestId, validated.extension);
  const storageDriver = await storePurchaseDocument({
    storageKey,
    bytes: validated.bytes,
    contentType: validated.contentType
  });
  return {
    storageKey,
    storageDriver,
    originalName: file.name,
    contentType: validated.contentType,
    sizeBytes: validated.sizeBytes,
    checksumSha256: validated.checksumSha256
  };
}

async function cleanupUnpersistedDocument(document?: PurchaseDocumentMetadata) {
  if (!document) return;
  let persisted = true;
  try {
    persisted = Boolean(await getPurchaseDocumentByStorageKey(document.storageKey));
  } catch {
    return;
  }
  if (!persisted) await deletePurchaseDocument(document).catch(() => undefined);
}

export async function createPurchaseAction(formData: FormData) {
  const parsed = purchaseDraftSchema.safeParse(parseFormData(formData));
  if (!parsed.success) redirect("/sigeco/compras/nueva?error=invalid-lines");
  const itemIds = formData.getAll("itemId").map(String);
  const quantities = formData.getAll("orderedQuantity").map(String);
  const costs = formData.getAll("unitCost").map(String);
  const lines = itemIds.flatMap((itemId, index) => {
    if (!itemId && !quantities[index] && !costs[index]) return [];
    const line = purchaseLineSchema.safeParse({
      itemId,
      orderedQuantity: quantities[index],
      unitCost: costs[index]
    });
    return line.success
      ? [{ ...line.data, unitCostCents: purchaseMoneyToCents(line.data.unitCost) }]
      : [{ itemId: "", orderedQuantity: 0, unitCostCents: 0 }];
  });
  let document: PurchaseDocumentMetadata | undefined;
  try {
    document = await storeOptionalDocument(
      formData,
      parsed.data.idempotencyKey,
      "Documento de compra"
    );
  } catch {
    redirect("/sigeco/compras/nueva?error=invalid-document");
  }

  let purchase;
  try {
    purchase = await runAuditedAction(
      {
        permission: "purchases_write",
        action: "purchase.create",
        entityType: "purchase",
        context: { lineCount: lines.length, hasDocument: Boolean(document) }
      },
      async (user) => {
        const { activeBranch } = await getBranchContext(user);
        if (parsed.data.branchCode !== activeBranch.code) {
          redirect("/sigeco/compras/nueva?error=invalid-lines");
        }
        const created = await createPurchaseDraftRecord({
          ...parsed.data,
          purchaseDate: new Date(`${parsed.data.purchaseDate}T12:00:00-04:00`),
          createdById: user.id,
          document,
          lines
        });
        return auditedResult(created, {
          entityId: created.id,
          context: { totalCents: created.totalCents }
        });
      }
    );
  } catch (error) {
    await cleanupUnpersistedDocument(document);
    purchaseErrorRedirect(error, "/sigeco/compras/nueva");
  }
  revalidatePath("/sigeco/compras");
  redirect(`/sigeco/compras/${purchase.id}?aviso=compra-creada`);
}

export async function confirmPurchaseAction(formData: FormData) {
  const purchaseId = String(formData.get("purchaseId") ?? "");
  const parsed = confirmPurchaseSchema.safeParse(parseFormData(formData));
  if (!parsed.success) redirect(`/sigeco/compras/${purchaseId}?error=invalid-status`);
  try {
    await runAuditedAction(
      {
        permission: "purchases_write",
        action: "purchase.confirm",
        entityType: "purchase",
        entityId: purchaseId
      },
      async (user) => {
        const confirmed = await confirmPurchaseRecord({
          ...parsed.data,
          confirmedById: user.id
        });
        return auditedResult(confirmed, {
          entityId: confirmed.id,
          context: { status: confirmed.status, totalCents: confirmed.totalCents }
        });
      }
    );
  } catch (error) {
    purchaseErrorRedirect(error, `/sigeco/compras/${purchaseId}`);
  }
  revalidatePath("/sigeco/compras");
  revalidatePath(`/sigeco/compras/${purchaseId}`);
  redirect(`/sigeco/compras/${purchaseId}?aviso=compra-confirmada`);
}

export async function recordPurchasePaymentAction(formData: FormData) {
  const purchaseId = String(formData.get("purchaseId") ?? "");
  const parsed = purchasePaymentSchema.safeParse(parseFormData(formData));
  if (!parsed.success) redirect(`/sigeco/compras/${purchaseId}?error=invalid-payment`);
  try {
    await runAuditedAction(
      {
        permission: "purchases_write",
        action: "purchase.payment.create",
        entityType: "purchase",
        entityId: purchaseId
      },
      async (user) => {
        const payment = await recordPurchasePayment({
          ...parsed.data,
          amountCents: purchaseMoneyToCents(parsed.data.amount),
          paidAt: parsed.data.paidAt
            ? new Date(`${parsed.data.paidAt}:00-04:00`)
            : undefined,
          recordedById: user.id
        });
        return auditedResult(payment, {
          entityId: purchaseId,
          context: { paymentId: payment.id, amountCents: payment.amountCents }
        });
      }
    );
  } catch (error) {
    purchaseErrorRedirect(error, `/sigeco/compras/${purchaseId}`);
  }
  revalidatePath("/sigeco/compras");
  revalidatePath(`/sigeco/compras/${purchaseId}`);
  redirect(`/sigeco/compras/${purchaseId}?aviso=pago-compra-registrado`);
}

export async function cancelPurchaseAction(formData: FormData) {
  const purchaseId = String(formData.get("purchaseId") ?? "");
  const parsed = cancelPurchaseSchema.safeParse(parseFormData(formData));
  if (!parsed.success) redirect(`/sigeco/compras/${purchaseId}?error=invalid-status`);
  try {
    await runAuditedAction(
      {
        permission: "purchases_write",
        action: "purchase.cancel",
        entityType: "purchase",
        entityId: purchaseId
      },
      async (user) => {
        const cancelled = await cancelPurchaseRecord({
          ...parsed.data,
          cancelledById: user.id
        });
        return auditedResult(cancelled, {
          entityId: cancelled.id,
          context: { status: cancelled.status }
        });
      }
    );
  } catch (error) {
    purchaseErrorRedirect(error, `/sigeco/compras/${purchaseId}`);
  }
  revalidatePath("/sigeco/compras");
  revalidatePath(`/sigeco/compras/${purchaseId}`);
  redirect(`/sigeco/compras/${purchaseId}?aviso=compra-anulada`);
}

export async function createPurchaseReceiptAction(formData: FormData) {
  const purchaseId = String(formData.get("purchaseId") ?? "");
  const parsed = purchaseReceiptSchema.safeParse(parseFormData(formData));
  if (!parsed.success) {
    redirect(`/sigeco/compras/${purchaseId}/recibir?error=receipt-empty`);
  }
  const lineIds = formData.getAll("purchaseLineId").map(String);
  const quantities = formData.getAll("quantity").map(String);
  const costs = formData.getAll("unitCost").map(String);
  const batchNumbers = formData.getAll("batchNumber").map(String);
  const expirationDates = formData.getAll("expirationDate").map(String);
  const lines = lineIds.map((purchaseLineId, index) => {
    const line = purchaseReceiptLineSchema.safeParse({
      purchaseLineId,
      quantity: quantities[index],
      unitCost: costs[index],
      batchNumber: batchNumbers[index],
      expirationDate: expirationDates[index]
    });
    if (!line.success) return { purchaseLineId: "", quantity: -1, unitCostCents: 0 };
    return {
      purchaseLineId: line.data.purchaseLineId,
      quantity: line.data.quantity,
      unitCostCents: purchaseMoneyToCents(line.data.unitCost),
      batchNumber: line.data.batchNumber,
      expirationDate: line.data.expirationDate
        ? new Date(`${line.data.expirationDate}T12:00:00-04:00`)
        : undefined
    };
  });
  let document: PurchaseDocumentMetadata | undefined;
  try {
    document = await storeOptionalDocument(
      formData,
      parsed.data.idempotencyKey,
      "Documento de recepción"
    );
  } catch {
    redirect(`/sigeco/compras/${purchaseId}/recibir?error=invalid-document`);
  }
  try {
    await runAuditedAction(
      {
        permission: "purchase_receipts_write",
        action: "purchase.receipt.create",
        entityType: "purchase",
        entityId: purchaseId,
        context: { hasDocument: Boolean(document) }
      },
      async (user) => {
        const { activeBranch } = await getBranchContext(user);
        if (parsed.data.branchCode !== activeBranch.code) {
          redirect(`/sigeco/compras/${purchaseId}/recibir?error=branch-mismatch`);
        }
        const receipt = await createPurchaseReceiptRecord({
          ...parsed.data,
          receivedAt: new Date(`${parsed.data.receivedAt}:00-04:00`),
          recordedById: user.id,
          document,
          lines
        });
        return auditedResult(receipt, {
          entityId: purchaseId,
          context: { receiptId: receipt.id }
        });
      }
    );
  } catch (error) {
    await cleanupUnpersistedDocument(document);
    purchaseErrorRedirect(error, `/sigeco/compras/${purchaseId}/recibir`);
  }
  revalidatePath("/sigeco/compras");
  revalidatePath("/sigeco/inventario");
  revalidatePath("/sigeco/inventario/lotes");
  revalidatePath(`/sigeco/compras/${purchaseId}`);
  redirect(`/sigeco/compras/${purchaseId}?aviso=recepcion-registrada`);
}

export async function createInventoryLotAdjustmentAction(formData: FormData) {
  const parsed = inventoryLotAdjustmentSchema.safeParse(parseFormData(formData));
  if (!parsed.success) redirect("/sigeco/inventario/lotes?error=invalid-adjustment");
  try {
    await runAuditedAction(
      {
        permission: "inventory_lot_adjust",
        action: "inventory.lot.adjust",
        entityType: "inventory_lot",
        entityId: parsed.data.lotId
      },
      async (user) => {
        const adjustment = await createInventoryLotAdjustmentRecord({
          ...parsed.data,
          recordedById: user.id
        });
        return auditedResult(adjustment, {
          entityId: adjustment.lotId,
          context: {
            kind: adjustment.kind,
            quantity: adjustment.quantity,
            stockDelta: adjustment.stockDelta
          }
        });
      }
    );
  } catch (error) {
    purchaseErrorRedirect(error, "/sigeco/inventario/lotes");
  }
  revalidatePath("/sigeco/inventario");
  revalidatePath("/sigeco/inventario/lotes");
  redirect("/sigeco/inventario/lotes?aviso=lote-ajustado");
}
