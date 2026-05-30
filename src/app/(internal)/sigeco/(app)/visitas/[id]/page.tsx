import { notFound } from "next/navigation";
import type { PatientRouteArea, VisitStatus } from "@/generated/prisma/client";
import { Field, internalInputClassName } from "@/components/internal/Field";
import { VisitStatusPill } from "@/components/internal/StatusPill";
import {
  routeAreaLabels,
  visitStatusLabels,
  workItemStatusLabels
} from "@/features/patients/labels";
import { updateVisitStatusAction } from "@/features/visits/actions";
import { getVisitById } from "@/modules/database/queries/visits";
import { requirePermission } from "@/modules/permissions";

const statusOptions = Object.entries(visitStatusLabels) as Array<[VisitStatus, string]>;
const areaOptions = Object.entries(routeAreaLabels) as Array<[PatientRouteArea, string]>;

type VisitDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function VisitDetailPage({ params }: VisitDetailPageProps) {
  await requirePermission("visits_read");
  const { id } = await params;
  const visit = await getVisitById(id);

  if (!visit) notFound();

  return (
    <div className="grid gap-5">
      <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-muted">{visit.patient.internalCode}</p>
            <h2 className="font-sora text-2xl font-bold">{visit.patient.fullName}</h2>
            <p className="mt-1 text-sm text-muted">{visit.patient.phone}</p>
          </div>
          <VisitStatusPill status={visit.status} />
        </div>
        <p className="text-sm text-muted">
          Área actual: {visit.route ? routeAreaLabels[visit.route.currentArea] : "Sin ruta"}
        </p>
        {visit.reason ? <p className="mt-2 text-sm text-muted">Motivo: {visit.reason}</p> : null}
      </section>

      <section className="grid gap-4 rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <h3 className="font-sora text-lg font-bold">Derivar paciente</h3>
        <form action={updateVisitStatusAction} className="grid gap-3">
          <input type="hidden" name="visitId" value={visit.id} />
          <Field label="Estado">
            <select className={internalInputClassName} name="status" defaultValue={visit.status}>
              {statusOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Área destino">
            <select className={internalInputClassName} name="area" defaultValue={visit.route?.currentArea ?? "recepcion"}>
              {areaOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Nota">
            <input className={internalInputClassName} name="note" />
          </Field>
          <button className="focus-ring min-h-12 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white">
            Actualizar ruta
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <h3 className="mb-4 font-sora text-lg font-bold">Tareas de visita</h3>
        <div className="grid gap-3">
          {visit.workItems.map((item) => (
            <article key={item.id} className="rounded-xl border border-border bg-surface-soft/60 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold">{item.title}</p>
                  <p className="text-xs font-semibold text-muted">
                    {routeAreaLabels[item.area]} · {item.createdAt.toLocaleString("es-BO")}
                  </p>
                </div>
                <span className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-bold text-muted">
                  {workItemStatusLabels[item.status]}
                </span>
              </div>
              {item.description ? <p className="mt-2 text-sm text-muted">{item.description}</p> : null}
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <h3 className="mb-4 font-sora text-lg font-bold">Ruta del paciente</h3>
        <div className="grid gap-3">
          {visit.route?.steps.map((step) => (
            <article key={step.id} className="rounded-xl border border-border bg-surface-soft/60 p-3">
              <p className="font-bold">{routeAreaLabels[step.area]}</p>
              <p className="text-xs font-semibold text-muted">
                {visitStatusLabels[step.status]} · {step.startedAt.toLocaleString("es-BO")}
              </p>
              {step.note ? <p className="mt-2 text-sm text-muted">{step.note}</p> : null}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
