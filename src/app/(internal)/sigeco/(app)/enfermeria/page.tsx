import Link from "next/link";
import { clinicalOrderTypeLabels } from "@/features/clinical-care/labels";
import { nursingWorkItemStatusLabels } from "@/features/nursing/labels";
import { getNursingWorkItems } from "@/modules/database/queries/nursing";
import { requirePermission } from "@/modules/permissions";

export default async function NursingWorkQueuePage() {
  await requirePermission("nursing_read");
  const workItems = await getNursingWorkItems({ pageSize: 40 });

  return (
    <div className="grid gap-5">
      <section>
        <p className="text-sm font-semibold text-muted">Bandeja operativa</p>
        <h2 className="font-sora text-2xl font-bold text-text">Enfermería</h2>
      </section>

      <section className="grid gap-3">
        {workItems.map((item) => {
          const order = item.clinicalOrders[0];

          return (
            <Link
              key={item.id}
              href={`/sigeco/enfermeria/${item.id}`}
              className="focus-ring rounded-2xl border border-border bg-surface p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-normal text-muted">
                    {item.visit.patient.internalCode}
                  </p>
                  <h3 className="font-sora text-lg font-bold">{item.visit.patient.fullName}</h3>
                  <p className="mt-1 text-sm text-muted">{item.title}</p>
                </div>
                <span className="rounded-full border border-border bg-surface-soft px-3 py-1 text-xs font-bold text-muted">
                  {nursingWorkItemStatusLabels[item.status]}
                </span>
              </div>
              <div className="mt-3 grid gap-1 text-sm text-muted">
                {order ? <p>{clinicalOrderTypeLabels[order.type]} · {order.doctor?.name ?? order.doctor?.email ?? "Médico"}</p> : null}
                {item.description ? <p>{item.description}</p> : null}
              </div>
            </Link>
          );
        })}
        {workItems.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-surface p-4 text-sm text-muted">
            No hay indicaciones activas para enfermería.
          </p>
        ) : null}
      </section>
    </div>
  );
}
