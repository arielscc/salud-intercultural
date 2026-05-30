import Link from "next/link";
import type { InternalLeadSource, InternalLeadStatus } from "@/generated/prisma/client";
import { LeadStatusPill } from "@/components/internal/StatusPill";
import { leadSourceLabels, leadStatusLabels } from "@/features/crm/labels";
import { getInternalLeads } from "@/modules/database/queries/leads-v3";
import { requirePermission } from "@/modules/permissions";

const statusOptions = Object.entries(leadStatusLabels) as Array<[InternalLeadStatus, string]>;
const sourceOptions = Object.entries(leadSourceLabels) as Array<[InternalLeadSource, string]>;

type LeadsPageProps = {
  searchParams: Promise<{
    search?: string;
    status?: InternalLeadStatus;
    source?: InternalLeadSource;
  }>;
};

export default async function InternalLeadsPage({ searchParams }: LeadsPageProps) {
  await requirePermission("leads_read");
  const params = await searchParams;
  const leads = await getInternalLeads({
    search: params.search,
    status: params.status,
    source: params.source,
    pageSize: 30
  });

  return (
    <div className="grid gap-5">
      <section className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-muted">CRM interno</p>
          <h2 className="font-sora text-2xl font-bold">Leads</h2>
        </div>
        <Link
          href="/sigeco/leads/nuevo"
          className="focus-ring min-h-11 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white shadow-sm"
        >
          Nuevo
        </Link>
      </section>

      <form className="grid gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm sm:grid-cols-4">
        <input
          className="min-h-12 rounded-xl border border-border bg-surface px-4 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 sm:col-span-2"
          type="search"
          name="search"
          placeholder="Buscar por nombre, teléfono, email o ciudad"
          defaultValue={params.search}
        />
        <select
          className="min-h-12 rounded-xl border border-border bg-surface px-4 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
          name="status"
          defaultValue={params.status ?? ""}
        >
          <option value="">Todos los estados</option>
          {statusOptions.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          className="min-h-12 rounded-xl border border-border bg-surface px-4 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
          name="source"
          defaultValue={params.source ?? ""}
        >
          <option value="">Todas las fuentes</option>
          {sourceOptions.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button className="focus-ring min-h-12 rounded-xl border border-border bg-surface-soft px-4 text-sm font-bold sm:col-span-4">
          Filtrar
        </button>
      </form>

      <section className="grid gap-3">
        {leads.map((lead) => (
          <Link
            key={lead.id}
            href={`/sigeco/leads/${lead.id}`}
            className="focus-ring rounded-2xl border border-border bg-surface p-4 shadow-sm transition hover:border-primary/30"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-bold">{lead.name || "Sin nombre"}</p>
                <p className="text-sm text-muted">{lead.phone}</p>
                <p className="mt-1 text-xs font-semibold text-muted">
                  {lead.city ? `${lead.city} · ` : ""}
                  {leadSourceLabels[lead.source]}
                </p>
              </div>
              <LeadStatusPill status={lead.status} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-muted">
              <span className="rounded-full bg-surface-soft px-3 py-1">
                Contactos: {lead._count.contactAttempts}
              </span>
              <span className="rounded-full bg-surface-soft px-3 py-1">
                Recordatorios: {lead._count.reminders}
              </span>
              {lead.reminders[0] ? (
                <span className="rounded-full bg-accent/10 px-3 py-1 text-accent">
                  Próximo: {lead.reminders[0].dueAt.toLocaleDateString("es-BO")}
                </span>
              ) : null}
            </div>
          </Link>
        ))}
        {leads.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface p-6 text-center">
            <p className="font-bold">No hay leads con esos filtros.</p>
            <p className="mt-1 text-sm text-muted">Crea un lead nuevo o ajusta la búsqueda.</p>
          </div>
        ) : null}
      </section>
    </div>
  );
}
