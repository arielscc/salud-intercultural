"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Field, internalInputClassName } from "@/components/internal/Field";
import { SubmitButton } from "@/components/internal/SubmitButton";
import { Card, CardHeader } from "@/components/internal/ui/Card";
import type { ServiceCatalogKind } from "@/generated/prisma/client";
import { formatServiceCatalogMoney } from "@/features/service-catalog/labels";

type ProductOption = {
  id: string;
  name: string;
  maxDiscountCents: number;
};

type ComponentRow = {
  key: string;
  inventoryItemId: string;
  quantity: number;
};

type ServiceCatalogFormItem = {
  id: string;
  revision: number;
  code: string;
  name: string;
  description: string | null;
  category: string;
  kind: ServiceCatalogKind;
  basePriceCents: number;
  requiresNursing: boolean;
  supportsSessions: boolean;
  sessionCount: number | null;
  packagePriceCents: number | null;
  sessionPriceCents: number | null;
  components: Array<{ inventoryItemId: string; quantity: number }>;
};

type ServiceCatalogFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  products: ProductOption[];
  item?: ServiceCatalogFormItem;
};

let rowCounter = 0;
function nextRowKey() {
  rowCounter += 1;
  return `row-${rowCounter}`;
}

export function ServiceCatalogForm({ action, products, item }: ServiceCatalogFormProps) {
  const editing = Boolean(item);
  const [kind, setKind] = useState<ServiceCatalogKind>(item?.kind ?? "service");
  const [requiresNursing, setRequiresNursing] = useState(item?.requiresNursing ?? false);
  const [supportsSessions, setSupportsSessions] = useState(item?.supportsSessions ?? false);
  const [rows, setRows] = useState<ComponentRow[]>(
    item?.components.map((component) => ({
      key: nextRowKey(),
      inventoryItemId: component.inventoryItemId,
      quantity: component.quantity
    })) ?? []
  );

  const productsById = new Map(products.map((product) => [product.id, product]));
  const componentsCap = rows.reduce((total, row) => {
    const product = productsById.get(row.inventoryItemId);
    return total + (product ? product.maxDiscountCents * row.quantity : 0);
  }, 0);

  function addRow() {
    setRows((current) => [...current, { key: nextRowKey(), inventoryItemId: "", quantity: 1 }]);
  }

  function removeRow(key: string) {
    setRows((current) => current.filter((row) => row.key !== key));
  }

  function updateRow(key: string, patch: Partial<ComponentRow>) {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function selectKind(nextKind: ServiceCatalogKind) {
    setKind(nextKind);
    if (nextKind === "study") setRequiresNursing(true);
    if (nextKind !== "service") setSupportsSessions(false);
  }

  return (
    <form action={action} className="grid gap-4">
      {item ? (
        <>
          <input type="hidden" name="catalogItemId" value={item.id} />
          <input type="hidden" name="expectedRevision" value={item.revision} />
        </>
      ) : null}
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="requiresNursing" value={String(requiresNursing)} />
      <input type="hidden" name="supportsSessions" value={String(supportsSessions)} />

      <Card>
        <CardHeader
          title="1. Identificación"
          description="Cómo se llama la oferta y de qué tipo es."
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Tipo de oferta">
            <select
              className={internalInputClassName}
              value={kind}
              onChange={(event) => selectKind(event.target.value as ServiceCatalogKind)}
              disabled={editing}
              aria-label="Tipo de oferta"
            >
              <option value="service">Servicio (sueroterapia, ozonoterapia, etc.)</option>
              <option value="treatment">Tratamiento (conjunto de productos)</option>
              <option value="study">Estudio (hemograma, resonancia, orina, etc.)</option>
            </select>
          </Field>
          <Field label="Código">
            <input
              className={internalInputClassName}
              name={editing ? undefined : "code"}
              defaultValue={item?.code}
              disabled={editing}
              required={!editing}
              placeholder={kind === "study" ? "Ej. EST-GLUCOSA" : "Ej. SRV-SUERO"}
            />
          </Field>
          <Field label="Nombre" className="sm:col-span-2">
            <input
              className={internalInputClassName}
              name="name"
              defaultValue={item?.name}
              required
            />
          </Field>
          <Field label="Categoría">
            <input
              className={internalInputClassName}
              name="category"
              defaultValue={item?.category ?? "Sin categoría"}
              placeholder="Ej. Sueroterapia, Ozonoterapia"
              required
            />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="2. Precio"
          description="Precio base de referencia. El descuento se controla aparte con umbrales."
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Precio base (Bs)">
            <input
              className={internalInputClassName}
              name="basePrice"
              inputMode="decimal"
              defaultValue={((item?.basePriceCents ?? 0) / 100).toFixed(2)}
              required
            />
          </Field>
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm text-text">
          <input
            type="checkbox"
            className="size-4"
            checked={requiresNursing}
            disabled={kind === "study"}
            onChange={(event) => setRequiresNursing(event.target.checked)}
          />
          Se ejecuta en Enfermería y requiere pago previo (sueroterapia, ozonoterapia o estudio)
        </label>
        {kind === "service" ? (
          <label className="mt-3 flex items-center gap-2 text-sm text-text">
            <input
              type="checkbox"
              className="size-4"
              checked={supportsSessions}
              onChange={(event) => setSupportsSessions(event.target.checked)}
            />
            Este servicio se vende por sesiones (sueroterapia, ozonoterapia)
          </label>
        ) : null}
        {kind === "service" && supportsSessions ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <Field label="Nº de sesiones (paquete)">
              <input
                className={internalInputClassName}
                name="sessionCount"
                type="number"
                inputMode="numeric"
                min="1"
                step="1"
                defaultValue={item?.sessionCount ?? ""}
              />
            </Field>
            <Field label="Precio por paquete (Bs)">
              <input
                className={internalInputClassName}
                name="packagePrice"
                inputMode="decimal"
                defaultValue={
                  item?.packagePriceCents != null ? (item.packagePriceCents / 100).toFixed(2) : ""
                }
                placeholder="Mayor descuento"
              />
            </Field>
            <Field label="Precio por sesión (Bs)">
              <input
                className={internalInputClassName}
                name="sessionPrice"
                inputMode="decimal"
                defaultValue={
                  item?.sessionPriceCents != null ? (item.sessionPriceCents / 100).toFixed(2) : ""
                }
                placeholder="Descuento similar o menor"
              />
            </Field>
            <p className="text-xs text-muted sm:col-span-3">
              El consumo de sesiones a lo largo de las visitas se maneja en la Tarea 5.
            </p>
          </div>
        ) : null}
      </Card>

      {kind === "treatment" ? (
        <Card>
          <CardHeader
            title="3. Productos del tratamiento"
            description="Un tratamiento agrupa productos del catálogo. La suma de sus umbrales de descuento fija el tope que el médico podrá aplicar."
          />
          <div className="grid gap-3">
            {rows.map((row) => (
              <div key={row.key} className="grid gap-2 sm:grid-cols-[1fr_120px_auto]">
                <select
                  className={internalInputClassName}
                  name="componentInventoryItemId"
                  value={row.inventoryItemId}
                  onChange={(event) => updateRow(row.key, { inventoryItemId: event.target.value })}
                  aria-label="Producto componente"
                >
                  <option value="">Selecciona un producto…</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
                <input
                  className={internalInputClassName}
                  name="componentQuantity"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  step="1"
                  value={row.quantity}
                  onChange={(event) =>
                    updateRow(row.key, { quantity: Number(event.target.value) || 1 })
                  }
                  aria-label="Cantidad"
                />
                <button
                  type="button"
                  className="focus-ring inline-flex min-h-10 items-center justify-center rounded-[9px] border border-border px-3 text-sm text-muted transition hover:border-error/40 hover:text-error"
                  onClick={() => removeRow(row.key)}
                  aria-label="Quitar producto"
                >
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </div>
            ))}
            <button
              type="button"
              className="focus-ring inline-flex min-h-10 w-fit items-center gap-2 rounded-[9px] border border-border bg-surface px-3 text-sm font-semibold text-text transition hover:border-primary/40 hover:text-primary-dark"
              onClick={addRow}
            >
              <Plus size={16} aria-hidden="true" />
              Agregar producto
            </button>
            <p className="text-sm text-muted">
              Tope de descuento del tratamiento (suma de umbrales):{" "}
              <strong className="tabular-nums text-text">
                {formatServiceCatalogMoney(componentsCap)}
              </strong>
              . Los umbrales por producto solo los editan Dirección y Super administrador.
            </p>
          </div>
        </Card>
      ) : null}

      <Card>
        <CardHeader
          title={kind === "treatment" ? "4. Detalle y confirmación" : "3. Detalle y confirmación"}
          description="Agrega información útil y deja trazable el motivo del cambio."
        />
        <div className="grid gap-3">
          <Field label="Descripción">
            <textarea
              className={`${internalInputClassName} min-h-24 py-3`}
              name="description"
              defaultValue={item?.description ?? ""}
            />
          </Field>
          {editing ? (
            <Field label="Motivo del cambio">
              <input
                className={internalInputClassName}
                name="changeReason"
                placeholder="Ej. Nuevo precio de la oferta"
                required
              />
            </Field>
          ) : null}
          <SubmitButton>{editing ? "Guardar nueva versión" : "Crear oferta"}</SubmitButton>
        </div>
      </Card>
    </form>
  );
}
