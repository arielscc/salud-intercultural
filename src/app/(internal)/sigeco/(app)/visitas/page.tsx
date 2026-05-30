import Link from "next/link";
import type { VisitStatus } from "@/generated/prisma/client";
import { VisitStatusPill } from "@/components/internal/StatusPill";
import { routeAreaLabels, visitStatusLabels } from "@/features/patients/labels";
import { getVisits } from "@/modules/database/queries/visits";
import { requirePermission } from "@/modules/permissions";

const statusOptions = Object.entries(visitStatusLabels) as Array<[VisitStatus, string]>;

type VisitsPageProps = {
  searchParams: Promise<{ status?: VisitStatus }>;
};

export default async function VisitsPage({ searchParams }: VisitsPageProps) {
  await requirePermission("visits_read");
  const params = await searchParams;
  const visits = await getVisits({
    status: params.status,
    activeOnly: !params.status,
    pageSize: 30
  });

  return (
    <div className="grid gap-5">
      <section className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-muted">Recepción</p>
          <h2 className="font-sora text-2xl font-bold">Visitas activas</h2>
        </div>
        <Link
          href="/sigeco/pacientes"
          className="focus-ring min-h-11 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white shadow-sm"
        >
          Buscar paciente
        </Link>
      </section>

      <form className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <select
          className="min-h-12 w-full rounded-xl border border-border bg-surface px-4 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
          name="status"
          defaultValue={params.status ?? ""}
        >
          <option value="">Solo activas</option>
          {statusOptions.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button className="focus-ring mt-3 min-h-12 w-full rounded-xl border border-border bg-surface-soft px-4 text-sm font-bold">
          Filtrar
        </button>
      </form>

      <section className="grid gap-3">
        {visits.map((visit) => (
          <Link
            key={visit.id}
            href={`/sigeco/visitas/${visit.id}`}
            className="focus-ring rounded-2xl border border-border bg-surface p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-bold">{visit.patient.fullName}</p>
                <p className="text-sm text-muted">{visit.patient.phone}</p>
                <p className="mt-1 text-xs font-semibold text-muted">
                  {visit.route ? routeAreaLabels[visit.route.currentArea] : "Sin ruta"} ·{" "}
                  {visit.checkedInAt.toLocaleString("es-BO")}
                </p>
              </div>
              <VisitStatusPill status={visit.status} />
            </div>
            {visit.workItems.length > 0 ? (
              <div className="mt-3 rounded-xl bg-surface-soft px-3 py-2 text-xs font-semibold text-muted">
                {visit.workItems.length} tareas pendientes
              </div>
            ) : null}
          </Link>
        ))}
        {visits.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface p-6 text-center">
            <p className="font-bold">No hay visitas con ese filtro.</p>
            <p className="mt-1 text-sm text-muted">Busca un paciente y registra su llegada.</p>
          </div>
        ) : null}
      </section>
    </div>
  );
}
