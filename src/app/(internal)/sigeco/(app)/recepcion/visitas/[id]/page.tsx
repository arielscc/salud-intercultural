import { ConfirmForm } from "@/components/internal/ConfirmForm";
import { Field, internalInputClassName } from "@/components/internal/Field";
import { MobileBackLink } from "@/components/internal/MobileBackLink";
import { NoticeForm } from "@/components/internal/NoticeForm";
import { PaidStudyOrderDialog } from "@/components/internal/PaidStudyOrderDialog";
import { VisitStatusPill } from "@/components/internal/StatusPill";
import { SubmitButton } from "@/components/internal/SubmitButton";
import { Card, CardHeader } from "@/components/internal/ui/Card";
import { TimelineItem } from "@/components/internal/ui/TimelineItem";
import { createReceptionPaidStudyOrderAction } from "@/features/clinical-care/actions";
import {
  routeAreaLabels,
  visitStatusLabels,
  workItemStatusLabels
} from "@/features/patients/labels";
import { applyVisitFlowAction, updateVisitStatusAction } from "@/features/visits/actions";
import { isActiveVisitStatus } from "@/features/visits/schemas/visit.schema";
import type { PatientRouteArea, VisitStatus } from "@/generated/prisma/client";
import { formatDateTime } from "@/lib/dates";
import { getVisitById } from "@/modules/database/queries/visits";
import { requirePermission } from "@/modules/permissions";
import { Clock3, MapPin, Phone } from "lucide-react";
import { notFound } from "next/navigation";

const statusOptions = Object.entries(visitStatusLabels) as Array<[VisitStatus, string]>;
const areaOptions = Object.entries(routeAreaLabels) as Array<[PatientRouteArea, string]>;

type VisitDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function VisitDetailPage({ params, searchParams }: VisitDetailPageProps) {
  const user = await requirePermission("visits_read");
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const visit = await getVisitById(id);

  if (!visit) notFound();

  const isActive = isActiveVisitStatus(visit.status);

  return (
    <div className="grid gap-4">
      <MobileBackLink href="/sigeco/recepcion" label="Volver a Recepción" />
      {error === "cerrada" ? (
        <div className="rounded-[9px] bg-warning/10 px-4 py-3 text-sm">
          <p className="flex items-center gap-1.5 font-semibold text-warning">
            <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
            Esta visita ya está cerrada; no se aplicó la acción.
          </p>
        </div>
      ) : null}

      <Card className="overflow-hidden border-primary/25 p-0">
        <div className="h-1 bg-primary" aria-hidden="true" />
        <div className="p-[18px]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase text-primary-dark">
                Ficha de atención · {visit.patient.internalCode}
              </p>
              <h2 className="mt-0.5 font-sora text-xl font-bold text-text sm:text-2xl">
                <a
                  href={`/sigeco/recepcion/pacientes/${visit.patientId}`}
                  className="focus-ring rounded-[7px] hover:text-primary-dark hover:underline"
                >
                  {visit.patient.fullName}
                </a>
              </h2>
              <p className="mt-1 inline-flex items-center gap-1.5 text-sm tabular-nums text-muted">
                <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                {visit.patient.phone}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary-dark">
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                {visit.route ? routeAreaLabels[visit.route.currentArea] : "Sin ruta"}
              </span>
              <VisitStatusPill status={visit.status} />
            </div>
          </div>

          <dl className="mt-4 grid overflow-hidden rounded-[7px] border border-border bg-border sm:grid-cols-[minmax(12rem,0.8fr)_minmax(0,1.5fr)]">
            <div className="bg-surface px-3 py-2.5">
              <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase text-muted">
                <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                Llegada
              </dt>
              <dd className="mt-0.5 text-sm font-medium tabular-nums text-text">
                {formatDateTime(visit.checkedInAt)}
              </dd>
            </div>
            <div className="mt-px bg-surface px-3 py-2.5 sm:ml-px sm:mt-0">
              <dt className="text-[11px] font-semibold uppercase text-muted">Motivo de atención</dt>
              <dd className="mt-0.5 text-sm font-medium text-text">
                {visit.reason || "Sin motivo registrado"}
              </dd>
            </div>
          </dl>

          {isActive ? (
            <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
              {["recepcion", "super_admin"].includes(user.role) ? (
                <PaidStudyOrderDialog
                  visitId={visit.id}
                  action={createReceptionPaidStudyOrderAction}
                  compactTrigger
                  triggerLabel="Enviar a analisis"
                />
              ) : null}
              {visit.status !== "in_consultation" ? (
                <NoticeForm action={applyVisitFlowAction} notice="Paciente enviado a consulta">
                  <input type="hidden" name="visitId" value={visit.id} />
                  <input type="hidden" name="flow" value="to_consultation" />
                  <SubmitButton size="sm">Enviar a consulta</SubmitButton>
                </NoticeForm>
              ) : null}
              {visit.status !== "in_administration" ? (
                <NoticeForm
                  action={applyVisitFlowAction}
                  notice="Paciente enviado a administración"
                >
                  <input type="hidden" name="visitId" value={visit.id} />
                  <input type="hidden" name="flow" value="to_administration" />
                  <input
                    type="hidden"
                    name="note"
                    value="Pasa a administración para realizar una compra"
                  />
                  <SubmitButton size="sm">Enviar a administración</SubmitButton>
                </NoticeForm>
              ) : null}
              <ConfirmForm
                action={applyVisitFlowAction}
                notice="Visita cerrada"
                confirmTitle="Cerrar visita"
                confirmDescription={`La visita de ${visit.patient.fullName} quedará completada y saldrá de las bandejas activas. Esta acción no se puede deshacer.`}
                confirmLabel="Cerrar visita"
              >
                <input type="hidden" name="visitId" value={visit.id} />
                <input type="hidden" name="flow" value="complete" />
                <SubmitButton size="sm" variant="outline">
                  Cerrar atención completada
                </SubmitButton>
              </ConfirmForm>
              <ConfirmForm
                action={applyVisitFlowAction}
                notice="Retiro registrado"
                confirmTitle="Marcar retiro"
                confirmDescription={`La visita de ${visit.patient.fullName} se cerrará como retiro sin atención completa. Esta acción no se puede deshacer.`}
                confirmLabel="Marcar retiro"
              >
                <input type="hidden" name="visitId" value={visit.id} />
                <input type="hidden" name="flow" value="left" />
                <SubmitButton
                  size="sm"
                  variant="outline"
                  className="border-error/30 text-error hover:border-error/50 hover:text-error"
                >
                  Registrar abandono
                </SubmitButton>
              </ConfirmForm>
            </div>
          ) : null}
        </div>
      </Card>

      <div className="grid items-start gap-4 xl:grid-cols-[1.4fr_1fr]">
        <div className="grid gap-4">
          <Card className="max-sm:order-4">
            <CardHeader
              title="Tareas de esta visita"
              description="Acciones creadas para las áreas que intervienen en la atención."
            />
            <div className="grid gap-0">
              {visit.workItems.map((item) => (
                <TimelineItem
                  key={item.id}
                  title={item.title}
                  meta={`${routeAreaLabels[item.area]} · ${formatDateTime(item.createdAt)}`}
                  aside={workItemStatusLabels[item.status]}
                  body={item.description ?? undefined}
                />
              ))}
              {visit.workItems.length === 0 ? (
                <p className="py-2 text-sm text-muted">Sin tareas registradas para esta visita.</p>
              ) : null}
            </div>
          </Card>

          <Card className="max-sm:order-5">
            <CardHeader
              title="Ruta del paciente"
              description="Recorrido cronológico de la visita entre las áreas de atención."
            />
            <div className="grid gap-0">
              {visit.route?.steps.map((step) => (
                <TimelineItem
                  key={step.id}
                  title={routeAreaLabels[step.area]}
                  meta={formatDateTime(step.startedAt)}
                  aside={visitStatusLabels[step.status]}
                  body={step.note ?? undefined}
                />
              ))}
              {!visit.route || visit.route.steps.length === 0 ? (
                <p className="py-2 text-sm text-muted">Sin pasos de ruta registrados.</p>
              ) : null}
            </div>
          </Card>
        </div>

        <div className="grid gap-4 xl:sticky xl:top-0 xl:max-h-[calc(100dvh-6.5rem)] xl:overflow-y-auto xl:overscroll-contain xl:pr-1">
          {isActive ? (
            <Card>
              <CardHeader
                title="Derivar paciente"
                description="Actualiza el estado y el área responsable de la atención."
              />
              <NoticeForm
                action={updateVisitStatusAction}
                notice="Ruta actualizada"
                className="grid gap-3"
              >
                <input type="hidden" name="visitId" value={visit.id} />
                <Field label="Estado">
                  <select
                    className={internalInputClassName}
                    name="status"
                    defaultValue={visit.status}
                  >
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
                  <input
                    className={internalInputClassName}
                    name="note"
                    placeholder="Ej. pasa a caja solo a comprar un producto"
                  />
                </Field>
                <SubmitButton>Actualizar ruta</SubmitButton>
              </NoticeForm>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
