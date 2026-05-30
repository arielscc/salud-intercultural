import Link from "next/link";
import { clinicalOrderTypeLabels } from "@/features/clinical-care/labels";
import { routeAreaLabels } from "@/features/patients/labels";
import { formatMoney, saleStatusLabels } from "@/features/sales/labels";
import {
  getAdministrationWorkItems,
  getSalesSummary
} from "@/modules/database/queries/sales";
import { requirePermission } from "@/modules/permissions";

export default async function AdministrationPage() {
  await requirePermission("sales_read");
  const [workItems, summary] = await Promise.all([
    getAdministrationWorkItems({ pageSize: 40 }),
    getSalesSummary()
  ]);

  return (
    <div className="grid gap-5">
      <section>
        <p className="text-sm font-semibold text-muted">Administración</p>
        <h2 className="font-sora text-2xl font-bold text-text">Ventas y cobros</h2>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <Metric label="Cobrado hoy" value={formatMoney(summary.todaySales._sum.paidCents ?? 0)} />
        <Metric label="Ventas del mes" value={formatMoney(summary.monthSales._sum.totalCents ?? 0)} />
        <Metric label="Saldo pendiente" value={formatMoney(summary.pendingSales._sum.balanceCents ?? 0)} />
      </section>

      <section className="grid gap-3">
        <h3 className="font-sora text-lg font-bold">Pendientes derivados</h3>
        {workItems.map((item) => {
          const order = item.clinicalOrders[0];
          const sale = item.sales[0];

          return (
            <Link
              key={item.id}
              href={`/sigeco/administracion/${item.id}`}
              className="focus-ring rounded-2xl border border-border bg-surface p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-normal text-muted">
                    {item.visit.patient.internalCode}
                  </p>
                  <h4 className="font-sora text-lg font-bold">{item.visit.patient.fullName}</h4>
                  <p className="mt-1 text-sm text-muted">{item.title}</p>
                </div>
                <span className="rounded-full border border-border bg-surface-soft px-3 py-1 text-xs font-bold text-muted">
                  {sale ? saleStatusLabels[sale.status] : routeAreaLabels[item.area]}
                </span>
              </div>
              <div className="mt-3 grid gap-1 text-sm text-muted">
                {order ? <p>{clinicalOrderTypeLabels[order.type]} · {order.doctor?.name ?? order.doctor?.email ?? "Médico"}</p> : null}
                {item.description ? <p>{item.description}</p> : null}
                {sale ? <p>Venta: {formatMoney(sale.totalCents)} · Saldo {formatMoney(sale.balanceCents)}</p> : null}
              </div>
            </Link>
          );
        })}
        {workItems.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-surface p-4 text-sm text-muted">
            No hay cobros ni entregas pendientes.
          </p>
        ) : null}
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <p className="text-sm font-semibold text-muted">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}
