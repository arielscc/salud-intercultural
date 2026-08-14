"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auditedResult, runAuditedAction } from "@/modules/audit/service";
import {
  approveCashSessionClose,
  createOtherCashExpense,
  createStaffCashExpense,
  createUrgentPurchaseExpense,
  findCashWorkflowError,
  getCashExpenseByIdempotencyKey,
  openCashSession,
  requestCashSessionClose,
  reverseCashMovement
} from "@/modules/database/queries/cash";
import {
  approveCashCloseSchema,
  cashMoneyToCents,
  closeCashSessionSchema,
  moneyString,
  openCashSessionSchema,
  otherCashExpenseSchema,
  reverseCashMovementSchema,
  staffCashExpenseSchema,
  urgentPurchaseSchema
} from "@/features/cash/schemas/cash.schema";
import {
  createCashReceiptStorageKey,
  deleteCashReceipt,
  storeCashReceipt
} from "@/modules/cash-receipts/storage";
import { validateClinicalFile } from "@/modules/clinical-attachments/validation";
import { getBranchContext } from "@/features/branches/context";

function fields(formData: FormData) {
  return Object.fromEntries(
    Array.from(formData.entries()).filter(([, value]) => typeof value === "string")
  );
}

function cashErrorTarget(error: unknown, fallback: string): string | null {
  const workflowError = findCashWorkflowError(error);
  if (!workflowError) return null;

  const code =
    workflowError.code === "session_not_open"
      ? "cash-session-required"
      : workflowError.code === "session_stale_open"
        ? "cash-session-stale-open"
        : workflowError.code === "session_already_open"
          ? "cash-session-already-open"
          : workflowError.code === "session_business_date_required"
            ? "cash-session-exceptional-required"
            : workflowError.code === "exceptional_reason_required"
              ? "cash-exceptional-reason-required"
              : workflowError.code === "exceptional_requires_prior_close"
                ? "cash-exceptional-prior-close-required"
                : workflowError.code === "correction_exceeds_original"
                  ? "cash-correction-exceeds"
                  : workflowError.code === "session_not_pending_approval"
                    ? "cash-close-not-pending"
                    : "cash-invalid-operation";
  return `${fallback}?error=${code}`;
}

export async function openCashSessionAction(formData: FormData) {
  const parsed = openCashSessionSchema.safeParse(fields(formData));
  if (!parsed.success) redirect("/sigeco/administracion/caja?error=cash-invalid-session");

  try {
    await runAuditedAction(
      {
        permission: "cash_sessions_open",
        action: "cash.session.open",
        entityType: "cash_session",
        context: {
          branchCode: parsed.data.branchCode,
          registerName: parsed.data.registerName,
          responsibleId: parsed.data.responsibleId,
          exceptional: parsed.data.exceptional
        }
      },
      async (user) => {
        const { activeBranch } = await getBranchContext(user);
        if (parsed.data.branchCode !== activeBranch.code) {
          redirect("/sigeco/administracion/caja?error=cash-invalid-session");
        }
        const session = await openCashSession({
          branchCode: parsed.data.branchCode,
          registerName: parsed.data.registerName,
          businessDate: new Date(`${parsed.data.businessDate}T00:00:00.000Z`),
          shift: parsed.data.shift,
          responsibleId: parsed.data.responsibleId,
          openedById: user.id,
          openingCashCents: cashMoneyToCents(parsed.data.openingCash),
          idempotencyKey: parsed.data.idempotencyKey,
          exceptional: parsed.data.exceptional,
          exceptionalReason: parsed.data.exceptionalReason
        });
        return auditedResult(session, {
          entityId: session.id,
          context: {
            openingCashCents: session.openingCashCents,
            exceptional: session.exceptional,
            exceptionalReason: session.exceptionalReason
          }
        });
      }
    );
  } catch (error) {
    const target = cashErrorTarget(error, "/sigeco/administracion/caja");
    if (target) redirect(target);
    throw error;
  }

  revalidatePath("/sigeco/administracion/caja");
  redirect("/sigeco/administracion/caja?aviso=cash-session-opened");
}

export async function createStaffCashExpenseAction(formData: FormData) {
  const parsed = staffCashExpenseSchema.safeParse(fields(formData));
  if (!parsed.success) redirect("/sigeco/administracion/caja?error=cash-invalid-expense");

  const beneficiaries: Array<{ employeeId: string; amountCents: number }> = [];
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("beneficiary:") || typeof value !== "string") continue;
    const normalized = value.trim();
    if (!normalized || Number(normalized) === 0) continue;
    const amount = moneyString.safeParse(normalized);
    if (!amount.success) {
      redirect("/sigeco/administracion/caja?error=cash-invalid-expense");
    }
    beneficiaries.push({
      employeeId: key.slice("beneficiary:".length),
      amountCents: cashMoneyToCents(amount.data)
    });
  }
  if (beneficiaries.length === 0) {
    redirect("/sigeco/administracion/caja?error=cash-no-beneficiaries");
  }

  try {
    await runAuditedAction(
      {
        permission: "cash_movements_create",
        action: "cash.expense.staff.create",
        entityType: "cash_expense",
        context: {
          cashSessionId: parsed.data.cashSessionId,
          category: parsed.data.category,
          beneficiaryCount: beneficiaries.length
        }
      },
      async (user) => {
        const expense = await createStaffCashExpense({
          ...parsed.data,
          beneficiaries,
          registeredById: user.id
        });
        return auditedResult(expense, {
          entityId: expense.id,
          context: {
            cashSessionId: parsed.data.cashSessionId,
            amountCents: expense.totalCents,
            beneficiaryCount: expense.beneficiaries.length
          }
        });
      }
    );
  } catch (error) {
    const target = cashErrorTarget(error, "/sigeco/administracion/caja");
    if (target) redirect(target);
    throw error;
  }

  revalidatePath("/sigeco/administracion/caja");
  redirect("/sigeco/administracion/caja?aviso=cash-staff-expense-created");
}

export async function createUrgentPurchaseExpenseAction(formData: FormData) {
  const parsed = urgentPurchaseSchema.safeParse(fields(formData));
  if (!parsed.success) redirect("/sigeco/administracion/caja?error=cash-invalid-purchase");

  let storedReceipt:
    | {
        storageKey: string;
        storageDriver: "local" | "vercel_blob";
        originalName: string;
        contentType: string;
        sizeBytes: number;
        checksumSha256: string;
        uploadedAt: Date;
      }
    | undefined;

  const existing = await getCashExpenseByIdempotencyKey(
    parsed.data.idempotencyKey
  );
  const file = formData.get("receipt");

  if (!existing && file instanceof File && file.size > 0) {
    try {
      const validated = await validateClinicalFile(
        file,
        "Comprobante de compra"
      );
      const storageKey = createCashReceiptStorageKey(
        parsed.data.idempotencyKey,
        validated.extension
      );
      const storageDriver = await storeCashReceipt({
        storageKey,
        bytes: validated.bytes,
        contentType: validated.contentType
      });
      storedReceipt = {
        storageKey,
        storageDriver,
        originalName: file.name,
        contentType: validated.contentType,
        sizeBytes: validated.sizeBytes,
        checksumSha256: validated.checksumSha256,
        uploadedAt: new Date()
      };
    } catch {
      redirect("/sigeco/administracion/caja?error=cash-invalid-receipt");
    }
  }

  try {
    await runAuditedAction(
      {
        permission: "cash_movements_create",
        action: "cash.expense.purchase.create",
        entityType: "cash_expense",
        context: {
          cashSessionId: parsed.data.cashSessionId,
          category: parsed.data.category,
          quantity: parsed.data.quantity,
          hasReceipt: Boolean(storedReceipt)
        }
      },
      async (user) => {
        const expense = await createUrgentPurchaseExpense({
          ...parsed.data,
          unitPriceCents: cashMoneyToCents(parsed.data.unitPrice),
          registeredById: user.id,
          receipt: storedReceipt
        });
        return auditedResult(expense, {
          entityId: expense.id,
          context: {
            cashSessionId: parsed.data.cashSessionId,
            amountCents: expense.totalCents,
            requiresInventoryEntry: expense.requiresInventoryEntry,
            hasReceipt: Boolean(expense.receiptStorageKey)
          }
        });
      }
    );
  } catch (error) {
    if (storedReceipt) {
      let persistedExpense = true;
      try {
        persistedExpense = Boolean(
          await getCashExpenseByIdempotencyKey(parsed.data.idempotencyKey)
        );
      } catch {
        // Si no se puede comprobar la BD, se conserva el archivo privado para
        // no dejar un registro financiero apuntando a un comprobante borrado.
      }
      if (!persistedExpense) {
        await deleteCashReceipt(storedReceipt).catch(() => undefined);
      }
    }
    const target = cashErrorTarget(error, "/sigeco/administracion/caja");
    if (target) redirect(target);
    throw error;
  }

  revalidatePath("/sigeco/administracion/caja");
  redirect("/sigeco/administracion/caja?aviso=cash-purchase-created");
}

export async function createOtherCashExpenseAction(formData: FormData) {
  const parsed = otherCashExpenseSchema.safeParse(fields(formData));
  if (!parsed.success) redirect("/sigeco/administracion/caja?error=cash-invalid-expense");

  try {
    await runAuditedAction(
      {
        permission: "cash_movements_create",
        action: "cash.expense.other.create",
        entityType: "cash_expense",
        context: { cashSessionId: parsed.data.cashSessionId }
      },
      async (user) => {
        const expense = await createOtherCashExpense({
          ...parsed.data,
          amountCents: cashMoneyToCents(parsed.data.amount),
          registeredById: user.id
        });
        return auditedResult(expense, {
          entityId: expense.id,
          context: {
            cashSessionId: parsed.data.cashSessionId,
            amountCents: expense.totalCents
          }
        });
      }
    );
  } catch (error) {
    const target = cashErrorTarget(error, "/sigeco/administracion/caja");
    if (target) redirect(target);
    throw error;
  }

  revalidatePath("/sigeco/administracion/caja");
  redirect("/sigeco/administracion/caja?aviso=cash-expense-created");
}

export async function requestCashSessionCloseAction(formData: FormData) {
  const parsed = closeCashSessionSchema.safeParse(fields(formData));
  if (!parsed.success) redirect("/sigeco/administracion/caja?error=cash-invalid-close");

  let requiresApproval = false;
  try {
    const result = await runAuditedAction(
      {
        permission: "cash_sessions_close",
        action: "cash.session.close.request",
        entityType: "cash_session",
        entityId: parsed.data.cashSessionId
      },
      async (user) => {
        const closed = await requestCashSessionClose({
          cashSessionId: parsed.data.cashSessionId,
          requestedById: user.id,
          reportedByChannel: {
            cash: cashMoneyToCents(parsed.data.cash),
            qr: cashMoneyToCents(parsed.data.qr)
          },
          observation: parsed.data.observation
        });
        return auditedResult(closed, {
          entityId: parsed.data.cashSessionId,
          context: {
            requiresApproval: closed.requiresApproval,
            differenceCents: closed.session.differenceCents
          }
        });
      }
    );
    requiresApproval = result.requiresApproval;
  } catch (error) {
    const target = cashErrorTarget(error, "/sigeco/administracion/caja");
    if (target) redirect(target);
    throw error;
  }

  revalidatePath("/sigeco/administracion/caja");
  redirect(
    `/sigeco/administracion/caja?aviso=${
      requiresApproval ? "cash-close-pending" : "cash-session-closed"
    }`
  );
}

export async function approveCashSessionCloseAction(formData: FormData) {
  const parsed = approveCashCloseSchema.safeParse(fields(formData));
  if (!parsed.success) redirect("/sigeco/administracion/caja?error=cash-invalid-approval");

  try {
    await runAuditedAction(
      {
        permission: "cash_sessions_approve",
        action: "cash.session.close.approve",
        entityType: "cash_session",
        entityId: parsed.data.cashSessionId
      },
      async (user) => {
        const session = await approveCashSessionClose({
          cashSessionId: parsed.data.cashSessionId,
          approvedById: user.id,
          observation: parsed.data.observation
        });
        return auditedResult(session, { entityId: session.id });
      }
    );
  } catch (error) {
    const target = cashErrorTarget(error, "/sigeco/administracion/caja");
    if (target) redirect(target);
    throw error;
  }

  revalidatePath("/sigeco/administracion/caja");
  redirect("/sigeco/administracion/caja?aviso=cash-close-approved");
}

export async function reverseCashMovementAction(formData: FormData) {
  const parsed = reverseCashMovementSchema.safeParse(fields(formData));
  if (!parsed.success) redirect("/sigeco/administracion/caja?error=cash-invalid-correction");

  try {
    await runAuditedAction(
      {
        permission: "cash_movements_reverse",
        action: "cash.movement.reverse",
        entityType: "cash_movement",
        entityId: parsed.data.originalMovementId
      },
      async (user) => {
        const correction = await reverseCashMovement({
          originalMovementId: parsed.data.originalMovementId,
          amountCents: cashMoneyToCents(parsed.data.amount),
          actorId: user.id,
          reason: parsed.data.reason,
          note: parsed.data.note,
          idempotencyKey: parsed.data.idempotencyKey
        });
        return auditedResult(correction, {
          entityId: correction.id,
          context: {
            originalMovementId: parsed.data.originalMovementId,
            amountCents: correction.amountCents,
            type: correction.type
          }
        });
      }
    );
  } catch (error) {
    const target = cashErrorTarget(error, "/sigeco/administracion/caja");
    if (target) redirect(target);
    throw error;
  }

  revalidatePath("/sigeco/administracion/caja");
  redirect("/sigeco/administracion/caja?aviso=cash-correction-created");
}
