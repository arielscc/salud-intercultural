import Link from "next/link";
import { Field, internalInputClassName } from "@/components/internal/Field";
import { createInventoryItemAction } from "@/features/inventory/actions";
import { getInventoryItems, getInventorySummary } from "@/modules/database/queries/inventory";
import { requirePermission } from "@/modules/permissions";

export default async function InventoryPage() {
  await requirePermission("inventory_read");
  const [items, summary] = await Promise.all([
    getInventoryItems({ pageSize: 80 }),
    getInventorySummary()
  ]);

  return (
    <div className="grid gap-5">
      <section>
        <p className="text-sm font-semibold text-muted">Stock operativo</p>
        <h2 className="font-sora text-2xl font-bold text-text">Inventario</h2>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <Metric label="Productos activos" value={summary.totalItems} />
        <Metric label="Stock bajo" value={summary.lowStock} />
        <Metric label="Alertas abiertas" value={summary.openAlerts} />
      </section>

      <form action={createInventoryItemAction} className="grid gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <h3 className="font-sora text-lg font-bold">Nuevo producto</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Código interno">
            <input className={internalInputClassName} name="internalCode" required />
          </Field>
          <Field label="SKU">
            <input className={internalInputClassName} name="sku" />
          </Field>
        </div>
        <Field label="Nombre">
          <input className={internalInputClassName} name="name" required />
        </Field>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Unidad">
            <input className={internalInputClassName} name="unit" defaultValue="unidad" required />
          </Field>
          <Field label="Stock mínimo">
            <input className={internalInputClassName} name="minimumStock" inputMode="numeric" defaultValue="0" />
          </Field>
          <Field label="Stock inicial">
            <input className={internalInputClassName} name="initialStock" inputMode="numeric" defaultValue="0" />
          </Field>
        </div>
        <Field label="Descripción">
          <textarea className={`${internalInputClassName} min-h-20 py-3`} name="description" />
        </Field>
        <button className="focus-ring min-h-12 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white">
          Crear producto
        </button>
      </form>

      <section className="grid gap-3">
        <h3 className="font-sora text-lg font-bold">Productos</h3>
        {items.map((item) => {
          const lowStock = item.currentStock <= item.minimumStock;
          return (
            <Link
              key={item.id}
              href={`/sigeco/inventario/${item.id}`}
              className={`focus-ring rounded-2xl border bg-surface p-4 shadow-sm ${
                lowStock ? "border-danger/40" : "border-border"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-normal text-muted">{item.internalCode}</p>
                  <h4 className="font-sora text-lg font-bold">{item.name}</h4>
                  <p className="mt-1 text-sm text-muted">{item.sku ?? "Sin SKU"}</p>
                </div>
                <span className="rounded-full border border-border bg-surface-soft px-3 py-1 text-xs font-bold text-muted">
                  {item.currentStock} {item.unit}
                </span>
              </div>
              {item.alerts[0] ? <p className="mt-3 text-sm font-semibold text-danger">{item.alerts[0].message}</p> : null}
            </Link>
          );
        })}
        {items.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-surface p-4 text-sm text-muted">
            Sin productos registrados.
          </p>
        ) : null}
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <p className="text-sm font-semibold text-muted">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
}
