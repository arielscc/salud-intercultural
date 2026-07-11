import { notFound } from "next/navigation";
import type { PatientRouteArea, VisitStatus } from "@/generated/prisma/client";
import { Field, internalInputClassName } from "@/components/internal/Field";
import { VisitStatusPill } from "@/components/internal/StatusPill";
import { Button } from "@/components/internal/ui/Button";
import { Card, CardHeader } from "@/components/internal/ui/Card";
import { InfoRow } from "@/components/internal/ui/InfoRow";
import { TimelineItem } from "@/components/internal/ui/TimelineItem";
import {
  routeAreaLabels,
  visitStatusLabels,
  workItemStatusLabels
} from "@/features/patients/labels";
import { applyVisitFlowAction, updateVisitStatusAction } from "@/features/visits/actions";
import { isActiveVisitStatus } from "@/features/visits/schemas/visit.schema";
import { getVisitById } from "@/modules/database/queries/visits";
import { requirePermission } from "@/modules/permissions";

const statusOptions = Object.entries(visitStatusLabels) as Array<[VisitStatus, string]>;
const areaOptions = Object.entries(routeAreaLabels) as Array<[PatientRouteArea, string]>;

type VisitDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function VisitDetailPage({ params, searchParams }: VisitDetailPageProps) {
  await requirePermission("visits_read");
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const visit = await getVisitById(id);

  if (!visit) notFound();

  const isActive = isActiveVisitStatus(visit.status);

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[1.4fr_1fr]">
      <div className="grid gap-4">
        {error === "cerrada" ? (
          <div className="rounded-[9px] bg-warning/10 px-4 py-3 text-sm">
            <p className="flex items-center gap-1.5 font-semibold text-warning">
              <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
              Esta visita ya está cerrada; no se aplicó la acción.
            </p>
          </div>
        ) : null}
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium tabular-nums text-muted">
                {visit.patient.internalCode}
              </p>
              <h2 className="font-sora text-xl font-bold tracking-tight text-text">
                <a
                  href={`/sigeco/recepcion/pacientes/${visit.patientId}`}
                  className="focus-ring rounded-[7px] hover:text-primary-dark hover:underline"
                >
                  {visit.patient.fullName}
                </a>
              </h2>
              <p className="mt-0.5 text-sm tabular-nums text-muted">{visit.patient.phone}</p>
            </div>
            <VisitStatusPill status={visit.status} />
          </div>
          <dl className="mt-4 grid gap-x-6 gap-y-2 border-t border-border pt-4 text-sm sm:grid-cols-2">
            <InfoRow
              label="Área actual"
              value={visit.route ? routeAreaLabels[visit.route.currentArea] : "Sin ruta"}
            />
            <InfoRow label="Llegada" value={visit.checkedInAt.toLocaleString("es-BO")} />
            {visit.reason ? <InfoRow label="Motivo" value={visit.reason} wide /> : null}
          </dl>
        </Card>

        <Card>
          <CardHeader title="Tareas de visita" />
          <div className="grid gap-0">
            {visit.workItems.map((item) => (
              <TimelineItem
                key={item.id}
                title={item.title}
                meta={`${routeAreaLabels[item.area]} · ${item.createdAt.toLocaleString("es-BO")}`}
                aside={
                  <span className="text-[11px] font-semibold text-muted">
                    {workItemStatusLabels[item.status]}
                  </span>
                }
                body={item.description ?? undefined}
              />
            ))}
            {visit.workItems.length === 0 ? (
              <p className="py-2 text-sm text-muted">Sin tareas registradas para esta visita.</p>
            ) : null}
          </div>
        </Card>

        <Card>
          <CardHeader title="Ruta del paciente" />
          <div className="grid gap-0">
            {visit.route?.steps.map((step) => (
              <TimelineItem
                key={step.id}
                title={routeAreaLabels[step.area]}
                meta={step.startedAt.toLocaleString("es-BO")}
                aside={
                  <span className="text-[11px] font-semibold text-muted">
                    {visitStatusLabels[step.status]}
                  </span>
                }
                body={step.note ?? undefined}
              />
            ))}
            {!visit.route || visit.route.steps.length === 0 ? (
              <p className="py-2 text-sm text-muted">Sin pasos de ruta registrados.</p>
            ) : null}
          </div>
        </Card>
      </div>

      <div className="grid gap-4">
        {isActive ? (
          <Card>
            <CardHeader title="Acciones rápidas" />
            <div className="grid gap-2">
              <form action={applyVisitFlowAction}>
                <input type="hidden" name="visitId" value={visit.id} />
                <input type="hidden" name="flow" value="complete" />
                <Button type="submit" variant="outline" className="w-full">
                  Cerrar visita
                </Button>
              </form>
              <form action={applyVisitFlowAction}>
                <input type="hidden" name="visitId" value={visit.id} />
                <input type="hidden" name="flow" value="left" />
                <Button
                  type="submit"
                  variant="outline"
                  className="w-full border-error/30 text-error hover:border-error/50 hover:text-error"
                >
                  Se retiró sin completar
                </Button>
              </form>
            </div>
            <p className="mt-3 text-[13px] text-muted">
              “Se retiró” guarda en qué punto abandonó; el historial queda en la ruta.
            </p>
          </Card>
        ) : null}

        <Card>
          <CardHeader title="Derivar paciente" />
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
              <select
                className={internalInputClassName}
                name="area"
                defaultValue={visit.route?.currentArea ?? "recepcion"}
              >
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
            <Button type="submit">Actualizar ruta</Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
