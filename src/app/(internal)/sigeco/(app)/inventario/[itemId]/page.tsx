import { notFound } from "next/navigation";
import { Field, internalInputClassName } from "@/components/internal/Field";
import {
  addInventoryEntryAction,
  createInventoryAdjustmentAction
} from "@/features/inventory/actions";
import { inventoryMovementTypeLabels } from "@/features/inventory/labels";
import { getInventoryItemById } from "@/modules/database/queries/inventory";
import { requirePermission } from "@/modules/permissions";

type InventoryItemPageProps = {
  params: Promise<{ itemId: string }>;
};

export default async function InventoryItemPage({ params }: InventoryItemPageProps) {
  await requirePermission("inventory_read");
  const { itemId } = await params;
  const item = await getInventoryItemById(itemId);

  if (!item) notFound();

  return (
    <div className="grid gap-5">
      <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <p className="text-sm font-semibold text-muted">{item.internalCode}</p>
        <h2 className="font-sora text-2xl font-bold">{item.name}</h2>
        <p className="mt-1 text-sm text-muted">{item.sku ?? "Sin SKU"}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Info label="Stock actual" value={`${item.currentStock} ${item.unit}`} />
          <Info label="Stock mínimo" value={`${item.minimumStock} ${item.unit}`} />
          <Info label="Estado" value={item.active ? "Activo" : "Inactivo"} />
        </div>
      </section>

      <form action={addInventoryEntryAction} className="grid gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <input type="hidden" name="itemId" value={item.id} />
        <h3 className="font-sora text-lg font-bold">Entrada de stock</h3>
        <Field label="Cantidad">
          <input className={internalInputClassName} name="quantity" inputMode="numeric" required />
        </Field>
        <Field label="Motivo">
          <input className={internalInputClassName} name="reason" defaultValue="Ingreso de stock" required />
        </Field>
        <button className="focus-ring min-h-12 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white">
          Registrar entrada
        </button>
      </form>

      <form action={createInventoryAdjustmentAction} className="grid gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <input type="hidden" name="itemId" value={item.id} />
        <h3 className="font-sora text-lg font-bold">Ajuste autorizado</h3>
        <Field label="Diferencia">
          <input className={internalInputClassName} name="quantityDelta" inputMode="numeric" placeholder="-1 o 3" required />
        </Field>
        <Field label="Motivo">
          <input className={internalInputClassName} name="reason" required />
        </Field>
        <button className="focus-ring min-h-12 rounded-xl border border-border bg-surface-soft px-4 py-3 text-sm font-bold">
          Registrar ajuste
        </button>
      </form>

      <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <h3 className="mb-4 font-sora text-lg font-bold">Movimientos</h3>
        <div className="grid gap-3">
          {item.movements.map((movement) => (
            <article key={movement.id} className="rounded-xl border border-border bg-surface-soft/60 p-3">
              <p className="font-bold">{inventoryMovementTypeLabels[movement.type]}</p>
              <p className="text-sm text-muted">
                {movement.quantityDelta > 0 ? "+" : ""}{movement.quantityDelta} · Stock {movement.stockAfter} ·{" "}
                {movement.createdAt.toLocaleString("es-BO")}
              </p>
              <p className="mt-1 text-sm text-muted">{movement.reason}</p>
            </article>
          ))}
          {item.movements.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted">
              Sin movimientos registrados.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface-soft/60 p-3">
      <p className="text-xs font-bold uppercase tracking-normal text-muted">{label}</p>
      <p className="mt-1 font-bold">{value}</p>
    </div>
  );
}
