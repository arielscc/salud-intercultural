"use client";

import { useState } from "react";
import { Plus, Send, Save, Trash2, TriangleAlert } from "lucide-react";
import { Field, internalInputClassName } from "@/components/internal/Field";
import { SubmitButton } from "@/components/internal/SubmitButton";
import type { DoctorOrderLineSource } from "@/generated/prisma/client";
import {
  doctorOrderLineSourceLabels,
  formatDoctorOrderMoney
} from "@/features/doctor-orders/labels";
import { cn } from "@/lib/cn";

type CatalogOption = {
  source: DoctorOrderLineSource;
  catalogItemId: string;
  label: string;
  unitPriceCents: number;
  perUnitCapCents: number;
  supportsSessions: boolean;
  sessionCount: number | null;
};

type ProductOption = {
  inventoryItemId: string;
  label: string;
  unitPriceCents: number;
  perUnitCapCents: number;
};

type ExistingLine = {
  source: DoctorOrderLineSource;
  catalogItemId: string | null;
  inventoryItemId: string | null;
  description: string;
  unitPriceCents: number;
  discountCents: number;
  quantity: number;
  sessionCount: number | null;
  maxDiscountCents: number;
  notes: string | null;
};

type Row = {
  key: string;
  source: DoctorOrderLineSource;
  catalogItemId: string;
  inventoryItemId: string;
  description: string;
  unitPrice: string;
  discount: string;
  quantity: number;
  sessionCount: string;
  notes: string;
  perUnitCapCents: number;
  supportsSessions: boolean;
};

type DoctorOrderBuilderProps = {
  action: (formData: FormData) => void | Promise<void>;
  visitId: string;
  catalogOptions: CatalogOption[];
  productOptions: ProductOption[];
  existingLines: ExistingLine[];
  indications: string;
  canSubmit: boolean;
};

let rowCounter = 0;
function nextKey() {
  rowCounter += 1;
  return `line-${rowCounter}`;
}

function centsToInput(cents: number) {
  return (cents / 100).toFixed(2);
}

function inputToCents(value: string) {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

export function DoctorOrderBuilder({
  action,
  visitId,
  catalogOptions,
  productOptions,
  existingLines,
  indications,
  canSubmit
}: DoctorOrderBuilderProps) {
  const [rows, setRows] = useState<Row[]>(() =>
    existingLines.map((line) => ({
      key: nextKey(),
      source: line.source,
      catalogItemId: line.catalogItemId ?? "",
      inventoryItemId: line.inventoryItemId ?? "",
      description: line.description,
      unitPrice: centsToInput(line.unitPriceCents),
      discount: centsToInput(line.discountCents),
      quantity: line.quantity,
      sessionCount: line.sessionCount != null ? String(line.sessionCount) : "",
      notes: line.notes ?? "",
      perUnitCapCents: line.quantity > 0 ? Math.round(line.maxDiscountCents / line.quantity) : 0,
      supportsSessions: line.sessionCount != null
    }))
  );
  const [picker, setPicker] = useState("");

  function updateRow(key: string, patch: Partial<Row>) {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function removeRow(key: string) {
    setRows((current) => current.filter((row) => row.key !== key));
  }

  function addFromPicker(value: string) {
    if (!value) return;
    if (value === "free_text") {
      setRows((current) => [
        ...current,
        {
          key: nextKey(),
          source: "free_text",
          catalogItemId: "",
          inventoryItemId: "",
          description: "",
          unitPrice: "0.00",
          discount: "0.00",
          quantity: 1,
          sessionCount: "",
          notes: "",
          perUnitCapCents: 0,
          supportsSessions: false
        }
      ]);
      setPicker("");
      return;
    }
    const [kind, id] = value.split(":");
    if (kind === "catalog") {
      const option = catalogOptions.find((item) => item.catalogItemId === id);
      if (!option) return;
      setRows((current) => [
        ...current,
        {
          key: nextKey(),
          source: option.source,
          catalogItemId: option.catalogItemId,
          inventoryItemId: "",
          description: option.label,
          unitPrice: centsToInput(option.unitPriceCents),
          discount: "0.00",
          quantity: 1,
          sessionCount: option.supportsSessions && option.sessionCount ? String(option.sessionCount) : "",
          notes: "",
          perUnitCapCents: option.perUnitCapCents,
          supportsSessions: option.supportsSessions
        }
      ]);
    } else if (kind === "product") {
      const option = productOptions.find((item) => item.inventoryItemId === id);
      if (!option) return;
      setRows((current) => [
        ...current,
        {
          key: nextKey(),
          source: "product",
          catalogItemId: "",
          inventoryItemId: option.inventoryItemId,
          description: option.label,
          unitPrice: centsToInput(option.unitPriceCents),
          discount: "0.00",
          quantity: 1,
          sessionCount: "",
          notes: "",
          perUnitCapCents: option.perUnitCapCents,
          supportsSessions: false
        }
      ]);
    }
    setPicker("");
  }

  const services = catalogOptions.filter((option) => option.source === "service");
  const treatments = catalogOptions.filter((option) => option.source === "treatment");

  const subtotalCents = rows.reduce(
    (total, row) => total + Math.max(0, inputToCents(row.unitPrice) * row.quantity - inputToCents(row.discount)),
    0
  );
  const totalDiscountCents = rows.reduce((total, row) => total + inputToCents(row.discount), 0);
  const totalCapCents = rows.reduce((total, row) => total + row.perUnitCapCents * row.quantity, 0);
  const overCap = totalDiscountCents > totalCapCents;
  const disabled = rows.length === 0 || overCap;

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="visitId" value={visitId} />

      <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
        <Field label="Agregar al pedido">
          <select
            className={internalInputClassName}
            value={picker}
            onChange={(event) => addFromPicker(event.target.value)}
            aria-label="Agregar servicio, tratamiento o producto"
          >
            <option value="">Elegir del catálogo o texto libre…</option>
            {services.length > 0 ? (
              <optgroup label="Servicios">
                {services.map((option) => (
                  <option key={option.catalogItemId} value={`catalog:${option.catalogItemId}`}>
                    {option.label}
                  </option>
                ))}
              </optgroup>
            ) : null}
            {treatments.length > 0 ? (
              <optgroup label="Tratamientos">
                {treatments.map((option) => (
                  <option key={option.catalogItemId} value={`catalog:${option.catalogItemId}`}>
                    {option.label}
                  </option>
                ))}
              </optgroup>
            ) : null}
            {productOptions.length > 0 ? (
              <optgroup label="Productos">
                {productOptions.map((option) => (
                  <option key={option.inventoryItemId} value={`product:${option.inventoryItemId}`}>
                    {option.label}
                  </option>
                ))}
              </optgroup>
            ) : null}
            <optgroup label="Otro">
              <option value="free_text">Escribir ítem de texto libre</option>
            </optgroup>
          </select>
        </Field>
        <span className="text-xs text-muted sm:pb-3">
          <Plus className="mr-1 inline" size={13} aria-hidden="true" />
          Elige una opción para agregar una línea
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-[9px] border border-dashed border-border px-3 py-6 text-center text-sm text-muted">
          El pedido está vacío. Agrega servicios, tratamientos o productos.
        </p>
      ) : null}

      <div className="grid gap-3">
        {rows.map((row) => {
          const lineTotal = Math.max(
            0,
            inputToCents(row.unitPrice) * row.quantity - inputToCents(row.discount)
          );
          const lineCap = row.perUnitCapCents * row.quantity;
          const lineOver = inputToCents(row.discount) > lineCap;
          return (
            <div key={row.key} className="rounded-[9px] border border-border p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                    {doctorOrderLineSourceLabels[row.source]}
                  </span>
                  <input
                    className={cn(internalInputClassName, "mt-1")}
                    name="lineDescription"
                    value={row.description}
                    onChange={(event) => updateRow(row.key, { description: event.target.value })}
                    placeholder="Descripción de la línea"
                    required
                  />
                </div>
                <button
                  type="button"
                  className="focus-ring mt-5 inline-flex min-h-10 items-center justify-center rounded-[9px] border border-border px-3 text-sm text-muted transition hover:border-error/40 hover:text-error"
                  onClick={() => removeRow(row.key)}
                  aria-label="Quitar línea"
                >
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </div>

              <input type="hidden" name="lineSource" value={row.source} />
              <input type="hidden" name="lineCatalogItemId" value={row.catalogItemId} />
              <input type="hidden" name="lineInventoryItemId" value={row.inventoryItemId} />

              <div className="mt-3 grid gap-2 sm:grid-cols-4">
                <Field label="Precio unit. (Bs)">
                  <input
                    className={internalInputClassName}
                    name="lineUnitPrice"
                    inputMode="decimal"
                    value={row.unitPrice}
                    onChange={(event) => updateRow(row.key, { unitPrice: event.target.value })}
                    required
                  />
                </Field>
                <Field label="Cantidad">
                  <input
                    className={internalInputClassName}
                    name="lineQuantity"
                    type="number"
                    min="1"
                    step="1"
                    value={row.quantity}
                    onChange={(event) =>
                      updateRow(row.key, { quantity: Number(event.target.value) || 1 })
                    }
                    required
                  />
                </Field>
                <Field label="Descuento (Bs)">
                  <input
                    className={cn(internalInputClassName, lineOver && "border-error text-error")}
                    name="lineDiscount"
                    inputMode="decimal"
                    value={row.discount}
                    onChange={(event) => updateRow(row.key, { discount: event.target.value })}
                    required
                  />
                </Field>
                {row.supportsSessions ? (
                  <Field label="Sesiones">
                    <input
                      className={internalInputClassName}
                      name="lineSessionCount"
                      type="number"
                      min="1"
                      step="1"
                      value={row.sessionCount}
                      onChange={(event) => updateRow(row.key, { sessionCount: event.target.value })}
                    />
                  </Field>
                ) : (
                  <input type="hidden" name="lineSessionCount" value={row.sessionCount} />
                )}
                <div className={cn("sm:self-end sm:pb-2", row.supportsSessions && "sm:col-span-4")}>
                  <p className="text-xs text-muted">
                    Total línea{" "}
                    <strong className="tabular-nums text-text">
                      {formatDoctorOrderMoney(lineTotal)}
                    </strong>{" "}
                    · Tope descuento{" "}
                    <span className={cn("tabular-nums", lineOver && "font-semibold text-error")}>
                      {formatDoctorOrderMoney(lineCap)}
                    </span>
                  </p>
                </div>
              </div>

              <input
                className={cn(internalInputClassName, "mt-2")}
                name="lineNotes"
                value={row.notes}
                onChange={(event) => updateRow(row.key, { notes: event.target.value })}
                placeholder="Indicaciones de la línea (opcional)"
              />
            </div>
          );
        })}
      </div>

      <Field label="Indicaciones generales para Administración / Enfermería">
        <textarea
          className={`${internalInputClassName} min-h-20 py-3`}
          name="indications"
          defaultValue={indications}
          maxLength={700}
          placeholder="Ej. Coordinar forma de pago; el suero se aplica tras el cobro."
        />
      </Field>

      <div className="rounded-[9px] border border-border bg-background p-3 text-sm">
        <div className="flex flex-wrap justify-between gap-2">
          <span className="text-muted">Subtotal del pedido</span>
          <strong className="tabular-nums text-text">{formatDoctorOrderMoney(subtotalCents)}</strong>
        </div>
        <div className="mt-1 flex flex-wrap justify-between gap-2">
          <span className="text-muted">Descuento aplicado</span>
          <span className={cn("tabular-nums", overCap ? "font-semibold text-error" : "text-text")}>
            {formatDoctorOrderMoney(totalDiscountCents)} / tope {formatDoctorOrderMoney(totalCapCents)}
          </span>
        </div>
        {overCap ? (
          <p className="mt-2 flex items-center gap-2 rounded-[7px] border border-error/30 bg-error/10 px-3 py-2 text-error">
            <TriangleAlert size={16} aria-hidden="true" />
            El descuento supera el tope permitido. No podrás guardar hasta ajustarlo.
          </p>
        ) : null}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <SubmitButton name="intent" value="save" variant="outline" disabled={disabled}>
          <Save size={16} aria-hidden="true" />
          Guardar borrador
        </SubmitButton>
        <SubmitButton name="intent" value="submit" disabled={disabled || !canSubmit}>
          <Send size={16} aria-hidden="true" />
          Enviar a Administración
        </SubmitButton>
      </div>
      {!canSubmit ? (
        <p className="text-xs text-muted">
          Para enviar a Administración, finaliza y firma la consulta.
        </p>
      ) : null}
    </form>
  );
}
