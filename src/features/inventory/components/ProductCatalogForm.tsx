import { Field, internalInputClassName } from "@/components/internal/Field";
import { SubmitButton } from "@/components/internal/SubmitButton";
import { Card, CardHeader } from "@/components/internal/ui/Card";
import type { InventoryItem, InventoryItemUsage } from "@/generated/prisma/client";

type ProductCatalogFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  item?: Pick<
    InventoryItem,
    | "id"
    | "revision"
    | "internalCode"
    | "sku"
    | "name"
    | "description"
    | "category"
    | "unit"
    | "usage"
    | "salePriceCents"
    | "referenceCostCents"
    | "minimumStock"
  >;
};

const usageOptions: Array<{ value: InventoryItemUsage; label: string }> = [
  { value: "sale", label: "Solo venta" },
  { value: "internal_use", label: "Solo uso interno" },
  { value: "both", label: "Venta y uso interno" }
];

export function ProductCatalogForm({ action, item }: ProductCatalogFormProps) {
  const editing = Boolean(item);

  return (
    <form action={action} className="grid gap-4">
      {item ? (
        <>
          <input type="hidden" name="itemId" value={item.id} />
          <input type="hidden" name="expectedRevision" value={item.revision} />
        </>
      ) : null}

      <Card>
        <CardHeader
          title="1. Identificación"
          description="Datos para encontrar el producto sin confundirlo con otro."
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Código interno">
            <input
              className={internalInputClassName}
              name={editing ? undefined : "internalCode"}
              defaultValue={item?.internalCode}
              disabled={editing}
              required={!editing}
            />
          </Field>
          <Field label="SKU o código del fabricante">
            <input className={internalInputClassName} name="sku" defaultValue={item?.sku ?? ""} />
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
              placeholder="Ej. Sueros, inyectables, oficina"
              required
            />
          </Field>
          <Field label="Unidad">
            <input
              className={internalInputClassName}
              name="unit"
              defaultValue={item?.unit ?? "unidad"}
              placeholder="Ej. frasco, caja, unidad"
              required
            />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="2. Uso, precio y reposición"
          description="Define dónde se usa y cuándo debe reponerse."
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Uso">
            <select
              className={internalInputClassName}
              name="usage"
              defaultValue={item?.usage ?? "both"}
            >
              {usageOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Stock mínimo">
            <input
              className={internalInputClassName}
              name="minimumStock"
              type="number"
              inputMode="numeric"
              min="0"
              step="1"
              defaultValue={item?.minimumStock ?? 0}
              required
            />
          </Field>
          <Field label="Precio de venta (Bs)">
            <input
              className={internalInputClassName}
              name="salePrice"
              inputMode="decimal"
              defaultValue={((item?.salePriceCents ?? 0) / 100).toFixed(2)}
              required
            />
          </Field>
          <Field label="Costo referencial (Bs)">
            <input
              className={internalInputClassName}
              name="referenceCost"
              inputMode="decimal"
              defaultValue={((item?.referenceCostCents ?? 0) / 100).toFixed(2)}
              required
            />
          </Field>
          {!editing ? (
            <Field label="Stock inicial">
              <input
                className={internalInputClassName}
                name="initialStock"
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                defaultValue="0"
              />
            </Field>
          ) : null}
        </div>
        <p className="mt-3 text-xs text-muted">
          El costo referencial ayuda a decidir; cada compra conservará el costo real de ese momento.
        </p>
      </Card>

      <Card>
        <CardHeader
          title="3. Detalle y confirmación"
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
                placeholder="Ej. Nuevo precio informado por proveedor"
                required
              />
            </Field>
          ) : null}
          <SubmitButton>{editing ? "Guardar nueva versión" : "Crear producto"}</SubmitButton>
        </div>
      </Card>
    </form>
  );
}
