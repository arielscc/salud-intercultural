import { notFound } from "next/navigation";
import type { SaleItemType } from "@/generated/prisma/client";
import { Field, internalInputClassName } from "@/components/internal/Field";
import { VisitStatusPill } from "@/components/internal/StatusPill";
import { createSaleAction } from "@/features/sales/actions";
import {
  formatMoney,
  paymentMethodLabels,
  saleItemTypeLabels,
  saleStatusLabels
} from "@/features/sales/labels";
import { getAdministrationWorkItemById } from "@/modules/database/queries/sales";
import { requirePermission } from "@/modules/permissions";

const saleItemTypeOptions = Object.entries(saleItemTypeLabels) as Array<[SaleItemType, string]>;
const paymentMethodOptions = Object.entries(paymentMethodLabels);

type AdministrationWorkItemPageProps = {
  params: Promise<{ workItemId: string }>;
};

export default async function AdministrationWorkItemPage({ params }: AdministrationWorkItemPageProps) {
  await requirePermission("sales_read");
  const { workItemId } = await params;
  const item = await getAdministrationWorkItemById(workItemId);

  if (!item) notFound();

  const patient = item.visit.patient;
  const order = item.clinicalOrders[0];

  return (
    <div className="grid gap-5">
      <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-muted">{patient.internalCode}</p>
            <h2 className="font-sora text-2xl font-bold">{patient.fullName}</h2>
            <p className="mt-1 text-sm text-muted">{patient.phone}</p>
          </div>
          <VisitStatusPill status={item.visit.status} />
        </div>
        <div className="mt-4 rounded-xl border border-border bg-surface-soft/60 p-3">
          <p className="text-xs font-bold uppercase tracking-normal text-muted">Pendiente administrativo</p>
          <p className="font-bold">{order?.title ?? item.title}</p>
          <p className="mt-1 text-sm text-muted">{order?.details ?? item.description}</p>
        </div>
      </section>

      <form action={createSaleAction} className="grid gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <input type="hidden" name="patientId" value={patient.id} />
        <input type="hidden" name="visitId" value={item.visit.id} />
        <input type="hidden" name="workItemId" value={item.id} />
        <h3 className="font-sora text-lg font-bold">Registrar venta</h3>
        <Field label="Tipo">
          <select className={internalInputClassName} name="itemType" defaultValue={order?.type === "study" ? "study" : "service"}>
            {saleItemTypeOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Descripción">
          <input className={internalInputClassName} name="description" defaultValue={order?.title ?? item.title} required />
        </Field>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Cantidad">
            <input className={internalInputClassName} name="quantity" inputMode="numeric" defaultValue="1" required />
          </Field>
          <Field label="Precio unitario Bs">
            <input className={internalInputClassName} name="unitPrice" inputMode="decimal" placeholder="0.00" required />
          </Field>
          <Field label="Descuento Bs">
            <input className={internalInputClassName} name="discount" inputMode="decimal" placeholder="0.00" />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Cobro inicial Bs">
            <input className={internalInputClassName} name="initialPayment" inputMode="decimal" placeholder="0.00" />
          </Field>
          <Field label="Forma de pago">
            <select className={internalInputClassName} name="paymentMethodCode" defaultValue="cash">
              {paymentMethodOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Referencia">
          <input className={internalInputClassName} name="paymentReference" />
        </Field>
        <Field label="Notas">
          <textarea className={`${internalInputClassName} min-h-20 py-3`} name="notes" />
        </Field>
        <button className="focus-ring min-h-12 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white">
          Crear venta
        </button>
      </form>

      <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <h3 className="mb-4 font-sora text-lg font-bold">Ventas de esta tarea</h3>
        <div className="grid gap-3">
          {item.sales.map((sale) => (
            <a key={sale.id} href={`/sigeco/administracion/ventas/${sale.id}`} className="focus-ring rounded-xl border border-border bg-surface-soft/60 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold">{formatMoney(sale.totalCents)}</p>
                  <p className="text-sm text-muted">Saldo: {formatMoney(sale.balanceCents)}</p>
                </div>
                <span className="text-sm font-bold text-muted">{saleStatusLabels[sale.status]}</span>
              </div>
            </a>
          ))}
          {item.sales.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted">
              Sin ventas registradas para esta tarea.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
