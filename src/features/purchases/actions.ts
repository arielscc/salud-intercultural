"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auditedResult, runAuditedAction } from "@/modules/audit/service";
import { validateClinicalFile } from "@/modules/clinical-attachments/validation";
import {
  cancelPurchaseRecord,
  confirmPurchaseRecord,
  createInventoryLotAdjustmentRecord,
  createPurchaseBatchRecord,
  createPurchaseReceiptRecord,
  findPurchaseWorkflowError,
  getPurchaseDocumentByStorageKey,
  recordPurchasePayment,
  type PurchaseDocumentMetadata
} from "@/modules/database/queries/purchases";
import { findInventoryCatalogError } from "@/modules/database/queries/inventory";
import {
  createPurchaseDocumentStorageKey,
  deletePurchaseDocument,
  storePurchaseDocument
} from "@/modules/purchase-documents/storage";
import {
  cancelPurchaseSchema,
  confirmPurchaseSchema,
  inventoryLotAdjustmentSchema,
  purchaseBatchDraftSchema,
  purchaseBatchLinesSchema,
  purchaseMoneyToCents,
  purchasePaymentSchema,
  purchaseReceiptLineSchema,
  purchaseReceiptSchema
} from "@/features/purchases/schemas/purchase.schema";
import { assertBranchMatchesContext } from "@/features/branches/context";

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
  const parsed = purchaseBatchDraftSchema.safeParse(parseFormData(formData));
  if (!parsed.success) redirect("/sigeco/compras/nueva?error=invalid-lines");
  let rawLines: unknown;
  try {
    rawLines = JSON.parse(String(formData.get("linesJson") ?? ""));
  } catch {
    redirect("/sigeco/compras/nueva?error=invalid-lines");
  }
  const parsedLines = purchaseBatchLinesSchema.safeParse(rawLines);
  if (!parsedLines.success) redirect("/sigeco/compras/nueva?error=invalid-lines");
  const lines = parsedLines.data.map((line) => ({
    supplierId: line.supplierId,
    associatedSupplierIds: line.associatedSupplierIds,
    orderedQuantity: line.orderedQuantity,
    unitCostCents: purchaseMoneyToCents(line.unitCost),
    existingItemId: line.itemMode === "existing" ? line.itemId : undefined,
    newProduct:
      line.itemMode === "new" && line.newProduct
        ? {
            ...line.newProduct,
            salePriceCents: purchaseMoneyToCents(line.newProduct.salePrice),
            referenceCostCents: purchaseMoneyToCents(line.newProduct.referenceCost)
          }
        : undefined
  }));
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

  let batch;
  try {
    batch = await runAuditedAction(
      {
        permission: "purchases_write",
        action: "purchase.batch.create",
        entityType: "purchase_batch",
        context: { lineCount: lines.length, hasDocument: Boolean(document) }
      },
      async (user, branchContext) => {
        assertBranchMatchesContext(branchContext, parsed.data.branchCode);
        const created = await createPurchaseBatchRecord({
          ...parsed.data,
          branchCode: branchContext.activeBranch.code,
          purchaseDate: new Date(`${parsed.data.purchaseDate}T12:00:00-04:00`),
          createdById: user.id,
          document,
          lines
        });
        return auditedResult(created, {
          entityId: parsed.data.idempotencyKey,
          context: {
            purchaseCount: created.purchases.length,
            createdItemCount: created.createdItemIds.length
          }
        });
      }
    );
  } catch (error) {
    await cleanupUnpersistedDocument(document);
    const catalogError = findInventoryCatalogError(error);
    if (catalogError) {
      redirect(`/sigeco/compras/nueva?error=${catalogError.code}`);
    }
    purchaseErrorRedirect(error, "/sigeco/compras/nueva");
  }
  revalidatePath("/sigeco/compras");
  revalidatePath("/sigeco/inventario");
  if (batch.purchases.length === 1) {
    redirect(`/sigeco/compras/${batch.purchases[0].id}?aviso=compra-creada`);
  }
  redirect(`/sigeco/compras?aviso=compras-creadas&cantidad=${batch.purchases.length}`);
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
      async (user, branchContext) => {
        assertBranchMatchesContext(branchContext, parsed.data.branchCode);
        const receipt = await createPurchaseReceiptRecord({
          ...parsed.data,
          branchCode: branchContext.activeBranch.code,
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
        module: "inventario",
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
