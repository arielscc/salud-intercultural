import Link from "next/link";
import { AlertCircle, BellRing, UserRoundSearch } from "lucide-react";
import { getFollowUpWorkSummary } from "@/modules/database/queries/follow-ups";
import { getInventorySummary } from "@/modules/database/queries/inventory";
import { getInternalLeadWorkSummary, getInternalLeads } from "@/modules/database/queries/leads-v3";
import { requireInternalUser } from "@/modules/permissions";
import { LeadStatusPill } from "@/components/internal/StatusPill";

export default async function SigecoDashboardPage() {
  const user = await requireInternalUser();
  const summary = await getInternalLeadWorkSummary(
    user.role === "captacion" ? user.id : undefined
  );
  const followUpSummary = await getFollowUpWorkSummary(user.role === "captacion" ? user.id : undefined);
  const inventorySummary = await getInventorySummary();
  const recentLeads = await getInternalLeads({ pageSize: 5 });

  return (
    <div className="grid gap-5">
      <section>
        <p className="text-sm font-semibold text-muted">Panel operativo</p>
        <h2 className="font-sora text-2xl font-bold text-text">Trabajo de hoy</h2>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <MetricCard icon={UserRoundSearch} label="Leads nuevos" value={summary.newLeads} />
        <MetricCard icon={BellRing} label="Recordatorios vencidos" value={summary.pendingReminders} />
        <MetricCard icon={AlertCircle} label="No responden" value={summary.noAnswer} />
        <MetricCard icon={BellRing} label="Seguimientos hoy" value={followUpSummary.today} />
        <MetricCard icon={AlertCircle} label="Stock bajo" value={inventorySummary.lowStock} />
      </section>

      <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="font-sora text-lg font-bold">Leads recientes</h3>
            <p className="text-sm text-muted">Últimos movimientos del pipeline comercial.</p>
          </div>
          <Link
            href="/sigeco/leads"
            className="focus-ring rounded-xl border border-border px-3 py-2 text-sm font-bold text-text"
          >
            Ver
          </Link>
        </div>
        <div className="grid gap-3">
          {recentLeads.map((lead) => (
            <Link
              key={lead.id}
              href={`/sigeco/leads/${lead.id}`}
              className="focus-ring rounded-xl border border-border bg-surface-soft/60 p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold">{lead.name || "Sin nombre"}</p>
                  <p className="text-sm text-muted">{lead.phone}</p>
                </div>
                <LeadStatusPill status={lead.status} />
              </div>
            </Link>
          ))}
          {recentLeads.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted">
              Aún no hay leads internos.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary-dark">
        <Icon className="h-5 w-5" aria-hidden={true} />
      </div>
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-sm font-semibold text-muted">{label}</p>
    </div>
  );
}
