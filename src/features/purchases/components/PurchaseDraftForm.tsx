"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Field, internalInputClassName } from "@/components/internal/Field";
import { SubmitButton } from "@/components/internal/SubmitButton";
import { Card, CardHeader } from "@/components/internal/ui/Card";
import { Button } from "@/components/internal/ui/Button";
import { DatePickerField } from "@/components/internal/ui/DatePickerField";
import { purchasePaymentMethodLabels } from "@/features/purchases/labels";
import {
  parseSafePurchaseDraft,
  type SafePurchaseDraft
} from "@/features/mobile-resilience/purchase-draft";
import { PURCHASE_SAFE_DRAFT_KEY } from "@/features/mobile-resilience/storage";

type Option = { id: string; name: string };
type ItemOption = Option & { internalCode: string; unit: string; referenceCostCents: number };
type ExpenseOption = {
  id: string;
  itemDescription: string | null;
  totalCents: number;
  occurredAt: Date;
};

export function PurchaseDraftForm({
  action,
  suppliers,
  items,
  urgentExpenses,
  idempotencyKey,
  defaultDate
}: {
  action: (formData: FormData) => void | Promise<void>;
  suppliers: Option[];
  items: ItemOption[];
  urgentExpenses: ExpenseOption[];
  idempotencyKey: string;
  defaultDate: string;
}) {
  const [draft, setDraft] = useState<SafePurchaseDraft>({
    version: 1,
    idempotencyKey,
    purchaseDate: defaultDate,
    supplierId: "",
    sourceCashExpenseId: "",
    documentNumber: "",
    intendedPaymentMethod: "credit",
    notes: "",
    lines: [{ id: 0, itemId: "", quantity: "", cost: "" }],
    savedAt: 1
  });
  const [draftReady, setDraftReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const restored = parseSafePurchaseDraft(
        window.sessionStorage.getItem(PURCHASE_SAFE_DRAFT_KEY)
      );
      if (restored) setDraft(restored);
      setDraftReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!draftReady) return;
    const timer = window.setTimeout(() => {
      window.sessionStorage.setItem(
        PURCHASE_SAFE_DRAFT_KEY,
        JSON.stringify({ ...draft, savedAt: Date.now() })
      );
    }, 300);
    return () => window.clearTimeout(timer);
  }, [draft, draftReady]);

  const calculatedTotal = draft.lines.reduce((total, line) => {
    const quantity = Number(line.quantity || 0);
    const cost = Number((line.cost || "0").replace(",", "."));
    return total + (Number.isFinite(quantity * cost) ? quantity * cost : 0);
  }, 0);

  function updateLine(
    id: number,
    values: Partial<SafePurchaseDraft["lines"][number]>
  ) {
    setDraft((current) => ({
      ...current,
      lines: current.lines.map((line) =>
        line.id === id ? { ...line, ...values } : line
      )
    }));
  }

  return (
    <form action={action} className="grid gap-4" encType="multipart/form-data">
      <input type="hidden" name="idempotencyKey" value={draft.idempotencyKey} />
      <input type="hidden" name="purchaseDate" value={draft.purchaseDate} />
      <input type="hidden" name="branchCode" value="el-alto" />
      <input type="hidden" name="currency" value="BOB" />

      <Card>
        <CardHeader
          title="1. Compra y proveedor"
          description="Registrar la compra todavía no aumenta el stock."
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Proveedor">
            <select
              className={internalInputClassName}
              name="supplierId"
              value={draft.supplierId}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  supplierId: event.target.value
                }))
              }
              required
            >
              <option value="">Selecciona</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Fecha de compra">
            <DatePickerField
              value={draft.purchaseDate}
              onChange={(purchaseDate) =>
                setDraft((current) => ({ ...current, purchaseDate }))
              }
              fromYear={2020}
            />
          </Field>
          <Field label="Documento o factura">
            <input
              className={internalInputClassName}
              name="documentNumber"
              value={draft.documentNumber}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  documentNumber: event.target.value
                }))
              }
            />
          </Field>
          <Field label="Forma prevista de pago">
            <select
              className={internalInputClassName}
              name="intendedPaymentMethod"
              value={draft.intendedPaymentMethod}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  intendedPaymentMethod: event.target
                    .value as SafePurchaseDraft["intendedPaymentMethod"]
                }))
              }
            >
              {Object.entries(purchasePaymentMethodLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </Field>
          <Field label="Vincular compra urgente ya pagada" className="sm:col-span-2">
            <select
              className={internalInputClassName}
              name="sourceCashExpenseId"
              value={draft.sourceCashExpenseId}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  sourceCashExpenseId: event.target.value
                }))
              }
            >
              <option value="">No vincular</option>
              {urgentExpenses.map((expense) => (
                <option key={expense.id} value={expense.id}>
                  {expense.itemDescription ?? "Compra urgente"} · Bs{" "}
                  {(expense.totalCents / 100).toFixed(2)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Fotografía o PDF del documento" className="sm:col-span-2">
            <input
              className={internalInputClassName}
              type="file"
              name="document"
              accept=".pdf,image/jpeg,image/png,image/webp"
              capture="environment"
            />
            <span className="text-xs font-normal text-muted">
              La fotografía no se guarda en el borrador local. Debe elegirse al
              confirmar.
            </span>
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="2. Productos comprados"
          description="La cantidad y el costo quedan congelados como historia."
          action={
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setDraft((current) => {
                  const nextId = Math.max(...current.lines.map((line) => line.id)) + 1;
                  return {
                    ...current,
                    lines: [
                      ...current.lines,
                      { id: nextId, itemId: "", quantity: "", cost: "" }
                    ]
                  };
                });
              }}
            >
              <Plus size={15} /> Agregar línea
            </Button>
          }
        />
        <div className="grid gap-3">
          {draft.lines.map((line, index) => (
            <div
              key={line.id}
              className="grid gap-3 rounded-[9px] border border-border p-3 sm:grid-cols-[1fr_120px_150px_auto]"
            >
              <Field label={`Producto ${index + 1}`}>
                <select
                  className={internalInputClassName}
                  name="itemId"
                  value={line.itemId}
                  onChange={(event) =>
                    updateLine(line.id, { itemId: event.target.value })
                  }
                  required
                >
                  <option value="">Selecciona</option>
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} · {item.internalCode} · ref. Bs{" "}
                      {(item.referenceCostCents / 100).toFixed(2)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Cantidad">
                <input
                  className={internalInputClassName}
                  name="orderedQuantity"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  value={line.quantity}
                  required
                  onChange={(event) =>
                    updateLine(line.id, { quantity: event.target.value })
                  }
                />
              </Field>
              <Field label="Costo unitario Bs">
                <input
                  className={internalInputClassName}
                  name="unitCost"
                  inputMode="decimal"
                  value={line.cost}
                  required
                  onChange={(event) =>
                    updateLine(line.id, { cost: event.target.value })
                  }
                />
              </Field>
              <Button
                className="self-end px-3"
                type="button"
                variant="ghost"
                aria-label={`Quitar producto ${index + 1}`}
                disabled={draft.lines.length === 1}
                onClick={() => {
                  setDraft((current) => ({
                    ...current,
                    lines: current.lines.filter(
                      (candidate) => candidate.id !== line.id
                    )
                  }));
                }}
              >
                <Trash2 size={16} />
              </Button>
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end border-t border-border pt-3">
          <p className="text-sm text-muted">
            Total calculado{" "}
            <strong className="ml-2 text-lg tabular-nums text-text">
              Bs {calculatedTotal.toFixed(2)}
            </strong>
          </p>
        </div>
      </Card>

      <Card>
        <CardHeader title="3. Confirmación" description="Podrás revisar antes de confirmar o pagar." />
        <Field label="Notas">
          <textarea
            className={`${internalInputClassName} min-h-24 py-3`}
            name="notes"
            value={draft.notes}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                notes: event.target.value
              }))
            }
          />
        </Field>
        <p className="mt-3 rounded-[9px] bg-surface-soft px-3 py-2 text-xs leading-5 text-muted">
          <strong className="text-text">Borrador local:</strong> estos datos de
          compra se conservan solo en esta sesión y todavía no están confirmados
          en SIGECO. No contiene pacientes, historia clínica ni archivos.
        </p>
        <SubmitButton className="mt-3 w-full sm:w-auto">Guardar borrador</SubmitButton>
      </Card>
    </form>
  );
}
