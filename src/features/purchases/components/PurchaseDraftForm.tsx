"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Field, internalInputClassName } from "@/components/internal/Field";
import { SubmitButton } from "@/components/internal/SubmitButton";
import { Card, CardHeader } from "@/components/internal/ui/Card";
import { Button } from "@/components/internal/ui/Button";
import { DatePickerField } from "@/components/internal/ui/DatePickerField";
import { purchasePaymentMethodLabels } from "@/features/purchases/labels";

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
  const [purchaseDate, setPurchaseDate] = useState(defaultDate);
  const [rowIds, setRowIds] = useState([0]);
  const [nextRowId, setNextRowId] = useState(1);
  const [lineValues, setLineValues] = useState<
    Record<number, { quantity: string; cost: string }>
  >({});
  const calculatedTotal = rowIds.reduce((total, rowId) => {
    const values = lineValues[rowId];
    const quantity = Number(values?.quantity ?? 0);
    const cost = Number((values?.cost ?? "0").replace(",", "."));
    return total + (Number.isFinite(quantity * cost) ? quantity * cost : 0);
  }, 0);

  return (
    <form action={action} className="grid gap-4" encType="multipart/form-data">
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <input type="hidden" name="purchaseDate" value={purchaseDate} />
      <input type="hidden" name="branchCode" value="el-alto" />
      <input type="hidden" name="currency" value="BOB" />

      <Card>
        <CardHeader
          title="1. Compra y proveedor"
          description="Registrar la compra todavía no aumenta el stock."
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Proveedor">
            <select className={internalInputClassName} name="supplierId" required>
              <option value="">Selecciona</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Fecha de compra">
            <DatePickerField
              value={purchaseDate}
              onChange={setPurchaseDate}
              fromYear={2020}
            />
          </Field>
          <Field label="Documento o factura">
            <input className={internalInputClassName} name="documentNumber" />
          </Field>
          <Field label="Forma prevista de pago">
            <select
              className={internalInputClassName}
              name="intendedPaymentMethod"
              defaultValue="credit"
            >
              {Object.entries(purchasePaymentMethodLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </Field>
          <Field label="Vincular compra urgente ya pagada" className="sm:col-span-2">
            <select className={internalInputClassName} name="sourceCashExpenseId">
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
                setRowIds((current) => [...current, nextRowId]);
                setNextRowId((current) => current + 1);
              }}
            >
              <Plus size={15} /> Agregar línea
            </Button>
          }
        />
        <div className="grid gap-3">
          {rowIds.map((rowId, index) => (
            <div
              key={rowId}
              className="grid gap-3 rounded-[9px] border border-border p-3 sm:grid-cols-[1fr_120px_150px_auto]"
            >
              <Field label={`Producto ${index + 1}`}>
                <select className={internalInputClassName} name="itemId" required>
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
                  required
                  onChange={(event) =>
                    setLineValues((current) => ({
                      ...current,
                      [rowId]: {
                        quantity: event.target.value,
                        cost: current[rowId]?.cost ?? ""
                      }
                    }))
                  }
                />
              </Field>
              <Field label="Costo unitario Bs">
                <input
                  className={internalInputClassName}
                  name="unitCost"
                  inputMode="decimal"
                  required
                  onChange={(event) =>
                    setLineValues((current) => ({
                      ...current,
                      [rowId]: {
                        quantity: current[rowId]?.quantity ?? "",
                        cost: event.target.value
                      }
                    }))
                  }
                />
              </Field>
              <Button
                className="self-end px-3"
                type="button"
                variant="ghost"
                aria-label={`Quitar producto ${index + 1}`}
                disabled={rowIds.length === 1}
                onClick={() => {
                  setRowIds((current) => current.filter((id) => id !== rowId));
                  setLineValues((current) => {
                    const next = { ...current };
                    delete next[rowId];
                    return next;
                  });
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
          <textarea className={`${internalInputClassName} min-h-24 py-3`} name="notes" />
        </Field>
        <SubmitButton className="mt-3 w-full sm:w-auto">Guardar borrador</SubmitButton>
      </Card>
    </form>
  );
}
