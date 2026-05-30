import { notFound } from "next/navigation";
import { Field, internalInputClassName } from "@/components/internal/Field";
import { createPaymentAction } from "@/features/sales/actions";
import {
  formatMoney,
  paymentMethodLabels,
  saleItemTypeLabels,
  saleStatusLabels
} from "@/features/sales/labels";
import { getSaleById } from "@/modules/database/queries/sales";
import { requirePermission } from "@/modules/permissions";

const paymentMethodOptions = Object.entries(paymentMethodLabels);

type SaleDetailPageProps = {
  params: Promise<{ saleId: string }>;
};

export default async function SaleDetailPage({ params }: SaleDetailPageProps) {
  await requirePermission("sales_read");
  const { saleId } = await params;
  const sale = await getSaleById(saleId);

  if (!sale) notFound();

  return (
    <div className="grid gap-5">
      <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <p className="text-sm font-semibold text-muted">Comprobante interno</p>
        <div className="mt-1 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-sora text-2xl font-bold">{sale.patient.fullName}</h2>
            <p className="mt-1 text-sm text-muted">{sale.patient.internalCode} · Venta {sale.id}</p>
          </div>
          <span className="rounded-full border border-border bg-surface-soft px-3 py-1 text-xs font-bold text-muted">
            {saleStatusLabels[sale.status]}
          </span>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <h3 className="mb-4 font-sora text-lg font-bold">Detalle</h3>
        <div className="grid gap-3">
          {sale.items.map((item) => (
            <article key={item.id} className="rounded-xl border border-border bg-surface-soft/60 p-3">
              <p className="font-bold">{item.description}</p>
              <p className="text-sm text-muted">
                {saleItemTypeLabels[item.type]} · {item.quantity} x {formatMoney(item.unitPriceCents)} ={" "}
                {formatMoney(item.totalCents)}
              </p>
            </article>
          ))}
        </div>
        <div className="mt-4 grid gap-2 rounded-xl border border-border bg-surface-soft/60 p-3 text-sm">
          <Row label="Subtotal" value={formatMoney(sale.subtotalCents)} />
          <Row label="Descuento" value={formatMoney(sale.discountCents)} />
          <Row label="Total" value={formatMoney(sale.totalCents)} />
          <Row label="Pagado" value={formatMoney(sale.paidCents)} />
          <Row label="Saldo" value={formatMoney(sale.balanceCents)} />
        </div>
      </section>

      {sale.balanceCents > 0 ? (
        <form action={createPaymentAction} className="grid gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <input type="hidden" name="saleId" value={sale.id} />
          <h3 className="font-sora text-lg font-bold">Registrar cobro</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Monto Bs">
              <input className={internalInputClassName} name="amount" inputMode="decimal" placeholder={(sale.balanceCents / 100).toFixed(2)} required />
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
            <input className={internalInputClassName} name="reference" />
          </Field>
          <Field label="Notas">
            <textarea className={`${internalInputClassName} min-h-20 py-3`} name="notes" />
          </Field>
          <button className="focus-ring min-h-12 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white">
            Registrar pago
          </button>
        </form>
      ) : null}

      <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <h3 className="mb-4 font-sora text-lg font-bold">Pagos</h3>
        <div className="grid gap-3">
          {sale.payments.map((payment) => (
            <article key={payment.id} className="rounded-xl border border-border bg-surface-soft/60 p-3">
              <p className="font-bold">{formatMoney(payment.amountCents)}</p>
              <p className="text-sm text-muted">
                {payment.method.name} · {payment.paidAt.toLocaleString("es-BO")}
              </p>
              {payment.reference ? <p className="mt-1 text-sm text-muted">Ref: {payment.reference}</p> : null}
            </article>
          ))}
          {sale.payments.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted">
              Sin pagos registrados.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="font-semibold text-muted">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}
