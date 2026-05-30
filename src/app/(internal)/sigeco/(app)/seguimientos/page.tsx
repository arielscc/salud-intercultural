import Link from "next/link";
import { followUpStatusLabels } from "@/features/follow-ups/labels";
import {
  getFollowUpTasks,
  getFollowUpWorkSummary
} from "@/modules/database/queries/follow-ups";
import { requirePermission } from "@/modules/permissions";

type FollowUpsPageProps = {
  searchParams: Promise<{ filtro?: string }>;
};

export default async function FollowUpsPage({ searchParams }: FollowUpsPageProps) {
  await requirePermission("followups_read");
  const { filtro } = await searchParams;
  const filter = filtro === "vencidos" ? "overdue" : filtro === "proximos" ? "upcoming" : "today";
  const [tasks, summary] = await Promise.all([
    getFollowUpTasks({ filter, pageSize: 60 }),
    getFollowUpWorkSummary()
  ]);

  return (
    <div className="grid gap-5">
      <section>
        <p className="text-sm font-semibold text-muted">Bandeja diaria</p>
        <h2 className="font-sora text-2xl font-bold text-text">Seguimientos</h2>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <Metric label="Vencidos" value={summary.overdue} />
        <Metric label="Hoy" value={summary.today} />
        <Metric label="Próximos" value={summary.upcoming} />
      </section>

      <nav className="flex gap-2 overflow-x-auto">
        <FilterLink href="/sigeco/seguimientos?filtro=vencidos" label="Vencidos" />
        <FilterLink href="/sigeco/seguimientos" label="Hoy" />
        <FilterLink href="/sigeco/seguimientos?filtro=proximos" label="Próximos" />
      </nav>

      <section className="grid gap-3">
        {tasks.map((task) => {
          const phone = task.patient?.phone ?? task.lead?.phone;
          const name = task.patient?.fullName ?? task.lead?.name ?? "Sin paciente";
          const isOverdue = task.dueAt < new Date() && task.status === "pending";

          return (
            <Link
              key={task.id}
              href={`/sigeco/seguimientos/${task.id}`}
              className={`focus-ring rounded-2xl border bg-surface p-4 shadow-sm ${
                isOverdue ? "border-danger/40" : "border-border"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-normal text-muted">
                    {task.patient?.internalCode ?? "Lead"}
                  </p>
                  <h3 className="font-sora text-lg font-bold">{name}</h3>
                  <p className="mt-1 text-sm text-muted">{task.title}</p>
                </div>
                <span className="rounded-full border border-border bg-surface-soft px-3 py-1 text-xs font-bold text-muted">
                  {followUpStatusLabels[task.status]}
                </span>
              </div>
              <p className="mt-3 text-sm text-muted">
                {task.dueAt.toLocaleString("es-BO")} {phone ? `· ${phone}` : ""}
              </p>
            </Link>
          );
        })}
        {tasks.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-surface p-4 text-sm text-muted">
            No hay seguimientos para este filtro.
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

function FilterLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="focus-ring shrink-0 rounded-xl border border-border bg-surface px-4 py-2 text-sm font-bold">
      {label}
    </Link>
  );
}
