"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Field, internalInputClassName } from "@/components/internal/Field";
import { SubmitButton } from "@/components/internal/SubmitButton";
import { Button } from "@/components/internal/ui/Button";
import { Card, CardHeader } from "@/components/internal/ui/Card";
import { DatePickerField } from "@/components/internal/ui/DatePickerField";
import { purchasePaymentMethodLabels } from "@/features/purchases/labels";
import {
  createEmptyPurchaseDraftLine,
  parseSafePurchaseDraft,
  type SafePurchaseDraft,
  type SafePurchaseDraftLine
} from "@/features/mobile-resilience/purchase-draft";
import { PURCHASE_SAFE_DRAFT_KEY } from "@/features/mobile-resilience/storage";

type SupplierOption = { id: string; name: string };
type ItemOption = {
  id: string;
  name: string;
  internalCode: string;
  unit: string;
  referenceCostCents: number;
  supplierIds: string[];
  preferredSupplierId?: string;
};
type ExpenseOption = {
  id: string;
  itemDescription: string | null;
  totalCents: number;
  occurredAt: Date;
};

const usageOptions = [
  { value: "sale", label: "Solo venta" },
  { value: "internal_use", label: "Solo uso interno" },
  { value: "both", label: "Venta y uso interno" }
] as const;

export function PurchaseDraftForm({
  action,
  suppliers,
  items,
  urgentExpenses,
  idempotencyKey,
  defaultDate,
  branchCode
}: {
  action: (formData: FormData) => void | Promise<void>;
  suppliers: SupplierOption[];
  items: ItemOption[];
  urgentExpenses: ExpenseOption[];
  idempotencyKey: string;
  defaultDate: string;
  branchCode: string;
}) {
  const [draft, setDraft] = useState<SafePurchaseDraft>({
    version: 2,
    idempotencyKey,
    purchaseDate: defaultDate,
    sourceCashExpenseId: "",
    documentNumber: "",
    intendedPaymentMethod: "credit",
    notes: "",
    lines: [createEmptyPurchaseDraftLine(0)],
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

  const supplierCount = useMemo(
    () => new Set(draft.lines.map((line) => line.supplierId).filter(Boolean)).size,
    [draft.lines]
  );
  const calculatedTotal = draft.lines.reduce((total, line) => {
    const quantity = Number(line.quantity || 0);
    const cost = Number((line.cost || "0").replace(",", "."));
    return total + (Number.isFinite(quantity * cost) ? quantity * cost : 0);
  }, 0);
  const serializedLines = JSON.stringify(
    draft.lines.map((line) => ({
      itemMode: line.itemMode,
      itemId: line.itemMode === "existing" ? line.itemId : undefined,
      supplierId: line.supplierId,
      associatedSupplierIds: [
        ...new Set([line.supplierId, ...line.associatedSupplierIds].filter(Boolean))
      ],
      orderedQuantity: line.quantity,
      unitCost: line.cost,
      newProduct: line.itemMode === "new" ? line.newProduct : undefined
    }))
  );

  function updateLine(id: number, values: Partial<SafePurchaseDraftLine>) {
    setDraft((current) => {
      const lines = current.lines.map((line) => (line.id === id ? { ...line, ...values } : line));
      const distinctSuppliers = new Set(lines.map((line) => line.supplierId).filter(Boolean));
      return {
        ...current,
        lines,
        sourceCashExpenseId:
          distinctSuppliers.size > 1 ? "" : current.sourceCashExpenseId
      };
    });
  }

  function updateNewProduct(
    id: number,
    values: Partial<SafePurchaseDraftLine["newProduct"]>
  ) {
    setDraft((current) => ({
      ...current,
      lines: current.lines.map((line) =>
        line.id === id
          ? { ...line, newProduct: { ...line.newProduct, ...values } }
          : line
      )
    }));
  }

  function toggleAssociatedSupplier(line: SafePurchaseDraftLine, supplierId: string) {
    const selected = new Set(line.associatedSupplierIds);
    if (selected.has(supplierId)) selected.delete(supplierId);
    else selected.add(supplierId);
    updateLine(line.id, { associatedSupplierIds: [...selected] });
  }

  return (
    <form action={action} className="grid gap-4" encType="multipart/form-data">
      <input type="hidden" name="idempotencyKey" value={draft.idempotencyKey} />
      <input type="hidden" name="purchaseDate" value={draft.purchaseDate} />
      <input type="hidden" name="branchCode" value={branchCode} />
      <input type="hidden" name="currency" value="BOB" />
      <input type="hidden" name="linesJson" value={serializedLines} />

      <Card>
        <CardHeader
          title="1. Datos de la compra"
          description="Cada producto puede tener un proveedor diferente; SIGECO los agrupará automáticamente."
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Fecha de compra">
            <DatePickerField
              value={draft.purchaseDate}
              onChange={(purchaseDate) =>
                setDraft((current) => ({ ...current, purchaseDate }))
              }
              fromYear={2020}
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
          {supplierCount <= 1 ? (
            <>
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
              <Field label="Fotografía o PDF del documento">
                <input
                  className={internalInputClassName}
                  type="file"
                  name="document"
                  accept=".pdf,image/jpeg,image/png,image/webp"
                  capture="environment"
                />
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
            </>
          ) : (
            <p className="sm:col-span-2 rounded-[9px] bg-surface-soft px-3 py-2 text-xs text-muted">
              Hay varios proveedores. Adjunta el documento correspondiente al recibir cada compra.
            </p>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader
          title="2. Productos comprados"
          description="Agrega productos existentes o dales de alta sin salir de esta pantalla."
          action={
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={draft.lines.length >= 100}
              onClick={() =>
                setDraft((current) => ({
                  ...current,
                  lines: [
                    ...current.lines,
                    createEmptyPurchaseDraftLine(
                      Math.max(...current.lines.map((line) => line.id)) + 1
                    )
                  ]
                }))
              }
            >
              <Plus size={15} /> Agregar producto
            </Button>
          }
        />
        <div className="grid gap-4">
          {draft.lines.map((line, index) => (
            <section key={line.id} className="grid gap-3 rounded-[9px] border border-border p-3">
              <div className="flex items-center justify-between gap-3">
                <strong className="text-sm text-text">Producto {index + 1}</strong>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`Quitar producto ${index + 1}`}
                  disabled={draft.lines.length === 1}
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      lines: current.lines.filter((candidate) => candidate.id !== line.id)
                    }))
                  }
                >
                  <Trash2 size={16} /> Quitar
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Tipo de registro">
                  <select
                    className={internalInputClassName}
                    value={line.itemMode}
                    onChange={(event) =>
                      updateLine(line.id, {
                        itemMode: event.target.value as SafePurchaseDraftLine["itemMode"]
                      })
                    }
                  >
                    <option value="existing">Producto existente</option>
                    <option value="new">Producto nuevo</option>
                  </select>
                </Field>
                <Field label="Proveedor de esta compra">
                  <select
                    className={internalInputClassName}
                    value={line.supplierId}
                    required
                    onChange={(event) => {
                      const supplierId = event.target.value;
                      updateLine(line.id, {
                        supplierId,
                        associatedSupplierIds: supplierId
                          ? [...new Set([...line.associatedSupplierIds, supplierId])]
                          : line.associatedSupplierIds
                      });
                    }}
                  >
                    <option value="">Selecciona</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Cantidad">
                  <input
                    className={internalInputClassName}
                    type="number"
                    inputMode="numeric"
                    min="1"
                    value={line.quantity}
                    required
                    onChange={(event) => updateLine(line.id, { quantity: event.target.value })}
                  />
                </Field>
                <Field label="Costo unitario Bs">
                  <input
                    className={internalInputClassName}
                    inputMode="decimal"
                    value={line.cost}
                    required
                    onChange={(event) => updateLine(line.id, { cost: event.target.value })}
                  />
                </Field>
              </div>

              {line.itemMode === "existing" ? (
                <Field label="Producto del inventario">
                  <select
                    className={internalInputClassName}
                    value={line.itemId}
                    required
                    onChange={(event) => {
                      const itemId = event.target.value;
                      const item = items.find((candidate) => candidate.id === itemId);
                      updateLine(line.id, {
                        itemId,
                        supplierId: item?.preferredSupplierId ?? line.supplierId,
                        associatedSupplierIds: item?.supplierIds ?? [],
                        cost:
                          !line.cost && item
                            ? (item.referenceCostCents / 100).toFixed(2)
                            : line.cost
                      });
                    }}
                  >
                    <option value="">Selecciona</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} · {item.internalCode} · {item.unit}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : (
                <div className="grid gap-3 rounded-[9px] bg-surface-soft p-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Field label="Código interno">
                    <input
                      className={internalInputClassName}
                      value={line.newProduct.internalCode}
                      required
                      onChange={(event) =>
                        updateNewProduct(line.id, { internalCode: event.target.value })
                      }
                    />
                  </Field>
                  <Field label="SKU o código del fabricante">
                    <input
                      className={internalInputClassName}
                      value={line.newProduct.sku}
                      onChange={(event) => updateNewProduct(line.id, { sku: event.target.value })}
                    />
                  </Field>
                  <Field label="Nombre" className="sm:col-span-2">
                    <input
                      className={internalInputClassName}
                      value={line.newProduct.name}
                      required
                      onChange={(event) => updateNewProduct(line.id, { name: event.target.value })}
                    />
                  </Field>
                  <Field label="Categoría">
                    <input
                      className={internalInputClassName}
                      value={line.newProduct.category}
                      placeholder="Ej. Medicamentos, inyectables, mates"
                      required
                      onChange={(event) =>
                        updateNewProduct(line.id, { category: event.target.value })
                      }
                    />
                  </Field>
                  <Field label="Unidad">
                    <input
                      className={internalInputClassName}
                      value={line.newProduct.unit}
                      placeholder="Ej. caja, frasco, unidad"
                      required
                      onChange={(event) => updateNewProduct(line.id, { unit: event.target.value })}
                    />
                  </Field>
                  <Field label="Uso">
                    <select
                      className={internalInputClassName}
                      value={line.newProduct.usage}
                      onChange={(event) =>
                        updateNewProduct(line.id, {
                          usage: event.target.value as SafePurchaseDraftLine["newProduct"]["usage"]
                        })
                      }
                    >
                      {usageOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Stock mínimo">
                    <input
                      className={internalInputClassName}
                      type="number"
                      inputMode="numeric"
                      min="0"
                      value={line.newProduct.minimumStock}
                      required
                      onChange={(event) =>
                        updateNewProduct(line.id, { minimumStock: event.target.value })
                      }
                    />
                  </Field>
                  <Field label="Precio de venta Bs">
                    <input
                      className={internalInputClassName}
                      inputMode="decimal"
                      value={line.newProduct.salePrice}
                      required
                      onChange={(event) =>
                        updateNewProduct(line.id, { salePrice: event.target.value })
                      }
                    />
                  </Field>
                  <Field label="Costo referencial Bs">
                    <input
                      className={internalInputClassName}
                      inputMode="decimal"
                      value={line.newProduct.referenceCost}
                      required
                      onChange={(event) =>
                        updateNewProduct(line.id, { referenceCost: event.target.value })
                      }
                    />
                  </Field>
                  <Field label="Descripción" className="sm:col-span-2">
                    <textarea
                      className={`${internalInputClassName} min-h-20 py-3`}
                      value={line.newProduct.description}
                      onChange={(event) =>
                        updateNewProduct(line.id, { description: event.target.value })
                      }
                    />
                  </Field>
                </div>
              )}

              <details className="rounded-[9px] border border-border px-3 py-2">
                <summary className="cursor-pointer text-sm font-semibold text-text">
                  Proveedores asociados al producto ({new Set([
                    line.supplierId,
                    ...line.associatedSupplierIds
                  ].filter(Boolean)).size})
                </summary>
                <p className="mt-2 text-xs text-muted">
                  Puedes relacionar el producto con varios proveedores. El proveedor de esta compra
                  siempre quedará asociado.
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {suppliers.map((supplier) => {
                    const isPurchaseSupplier = supplier.id === line.supplierId;
                    const checked =
                      isPurchaseSupplier || line.associatedSupplierIds.includes(supplier.id);
                    return (
                      <label key={supplier.id} className="flex items-center gap-2 text-sm text-text">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={isPurchaseSupplier}
                          onChange={() => toggleAssociatedSupplier(line, supplier.id)}
                        />
                        {supplier.name}
                      </label>
                    );
                  })}
                </div>
              </details>
            </section>
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
        <CardHeader
          title="3. Confirmación"
          description={
            supplierCount > 1
              ? `Se crearán ${supplierCount} compras agrupadas por proveedor.`
              : "Se creará una compra para revisar antes de confirmar y recibir."
          }
        />
        <Field label="Notas">
          <textarea
            className={`${internalInputClassName} min-h-24 py-3`}
            name="notes"
            value={draft.notes}
            onChange={(event) =>
              setDraft((current) => ({ ...current, notes: event.target.value }))
            }
          />
        </Field>
        <p className="mt-3 rounded-[9px] bg-surface-soft px-3 py-2 text-xs leading-5 text-muted">
          Los productos nuevos quedarán creados en Inventario con stock cero. El stock aumentará
          únicamente cuando Administración confirme su recepción.
        </p>
        <SubmitButton className="mt-3 w-full sm:w-auto">
          Guardar compra múltiple
        </SubmitButton>
      </Card>
    </form>
  );
}
