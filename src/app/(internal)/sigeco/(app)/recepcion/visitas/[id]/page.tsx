import Link from "next/link";
import { ConfirmForm } from "@/components/internal/ConfirmForm";
import { Field, internalInputClassName } from "@/components/internal/Field";
import { MobileBackLink } from "@/components/internal/MobileBackLink";
import { NoticeForm } from "@/components/internal/NoticeForm";
import { PaidStudyOrderDialog } from "@/components/internal/PaidStudyOrderDialog";
import { VisitStatusPill } from "@/components/internal/StatusPill";
import { SubmitButton } from "@/components/internal/SubmitButton";
import { Card, CardHeader } from "@/components/internal/ui/Card";
import { TimelineItem } from "@/components/internal/ui/TimelineItem";
import { Chip } from "@/components/internal/ui/Chip";
import { VisitDiscontinuationForm } from "@/components/internal/visit-discontinuations/VisitDiscontinuationForm";
import { createReceptionPaidStudyOrderAction } from "@/features/clinical-care/actions";
import {
  routeAreaLabels,
  visitStatusLabels,
  workItemStatusLabels
} from "@/features/patients/labels";
import { applyVisitFlowAction, updateVisitStatusAction } from "@/features/visits/actions";
import { isActiveVisitStatus } from "@/features/visits/schemas/visit.schema";
import {
  visitDiscontinuationReasonLabels,
  visitPendingTypeLabels
} from "@/features/visit-discontinuations/labels";
import { geographicOriginLabel } from "@/features/geography/origin";
import { roleHasPermission } from "@/features/internal-auth/permissions";
import {
  verifiedAttributionDetail,
  visitAttributionSummary
} from "@/features/attribution/catalog";
import type { PatientRouteArea, VisitStatus } from "@/generated/prisma/client";
import { formatDateTime } from "@/lib/dates";
import { getVisitById } from "@/modules/database/queries/visits";
import { getActiveStudyCatalogItems } from "@/modules/database/queries/service-catalog";
import { requirePermission } from "@/modules/permissions";
import { CalendarClock, ClipboardList, MapPin, Phone, UserRound } from "lucide-react";
import { notFound } from "next/navigation";
import { getBranchContext } from "@/features/branches/context";

const statusOptions = (
  Object.entries(visitStatusLabels) as Array<[VisitStatus, string]>
).filter(
  ([status]) => !["completed", "left_without_care"].includes(status)
);
const areaOptions = Object.entries(routeAreaLabels) as Array<[PatientRouteArea, string]>;

type VisitDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    error?: string;
    aviso?: string;
    seguimiento?: string;
  }>;
};

export default async function VisitDetailPage({ params, searchParams }: VisitDetailPageProps) {
  const user = await requirePermission("visits_read");
  const { activeBranch } = await getBranchContext(user);
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const [visit, studyCatalogItems] = await Promise.all([
    getVisitById(id),
    getActiveStudyCatalogItems()
  ]);

  if (!visit) notFound();
  if (visit.branchCode !== activeBranch.code) notFound();

  const isActive = isActiveVisitStatus(visit.status);
  const canRecordDiscontinuation = roleHasPermission(
    user.role,
    "visit_discontinuations_write"
  );

  return (
    <div className="grid gap-4">
      <MobileBackLink href="/sigeco/recepcion" label="Volver a Recepción" />
      {query.error === "cerrada" ? (
        <div className="rounded-[9px] bg-warning/10 px-4 py-3 text-sm">
          <p className="flex items-center gap-1.5 font-semibold text-warning">
            <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
            Esta visita ya está cerrada; no se aplicó la acción.
          </p>
        </div>
      ) : null}
      {query.error === "consulta-sin-finalizar" ? (
        <div className="rounded-[9px] bg-warning/10 px-4 py-3 text-sm">
          <p className="font-semibold text-warning">
            La visita no puede cerrarse todavía.
          </p>
          <p className="mt-1 text-text">
            El médico debe finalizar y firmar la consulta antes del cierre.
          </p>
        </div>
      ) : null}
      {query.error === "invalid-study-order" ? (
        <div className="rounded-[9px] bg-error/10 px-4 py-3 text-sm text-error" role="alert">
          Selecciona al menos un estudio activo y revisa los precios ingresados.
        </div>
      ) : null}
      {query.error === "abandono-invalido" ? (
        <div className="rounded-[9px] bg-error/10 px-4 py-3 text-sm text-error">
          <p className="font-semibold">Selecciona un motivo para continuar.</p>
          <p className="mt-1">
            La visita permanece abierta y no se cambió ningún pendiente.
          </p>
        </div>
      ) : null}
      {query.aviso === "llegada-registrada-atribucion-pendiente" ? (
        <div className="rounded-[9px] bg-warning/10 px-4 py-3 text-sm">
          <p className="font-semibold text-warning">La llegada quedó registrada.</p>
          <p className="mt-1 text-muted">
            Payload no respondió y la campaña quedó pendiente. La fuente indicada
            por el paciente se conservó; no vuelvas a registrar la llegada.
          </p>
        </div>
      ) : null}
      {query.aviso === "abandono-registrado" ? (
        <div className="rounded-[9px] bg-primary/10 px-4 py-3 text-sm text-primary-dark">
          <p className="font-semibold">El abandono quedó registrado.</p>
          <p className="mt-1">
            {query.seguimiento === "creado"
              ? "También se creó el seguimiento de recuperación."
              : query.seguimiento === "existente"
                ? "La visita quedó vinculada al seguimiento que ya estaba pendiente."
              : query.seguimiento === "sin-consentimiento"
                ? "No se creó contacto porque no existe consentimiento vigente."
                : "Los pendientes quedaron conservados para su revisión."}
          </p>
        </div>
      ) : null}

      <Card className="overflow-hidden border-primary/30 bg-surface p-0 shadow-sm">
        <div className="border-b border-primary/20 bg-primary/10 px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[9px] bg-primary text-white shadow-sm">
                <UserRound className="h-6 w-6" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-primary-dark">
                  {visit.patient.internalCode}
                </p>
                <h2 className="mt-2 font-sora text-2xl font-bold leading-tight text-text sm:text-3xl">
                  <a
                    href={`/sigeco/recepcion/pacientes/${visit.patientId}`}
                    className="focus-ring rounded-[7px] hover:text-primary-dark hover:underline"
                  >
                    {visit.patient.fullName}
                  </a>
                </h2>
                <div className="mt-2 flex flex-wrap gap-2 text-sm">
                  <span className="inline-flex items-center gap-1.5 rounded-[7px] bg-surface px-2.5 py-1 font-semibold tabular-nums text-text shadow-sm">
                    <Phone className="h-3.5 w-3.5 text-primary-dark" aria-hidden="true" />
                    {visit.patient.phone}
                  </span>
                  {visit.patient.secondaryPhone ? (
                    <span className="inline-flex items-center gap-1.5 rounded-[7px] bg-surface px-2.5 py-1 font-semibold tabular-nums text-text shadow-sm">
                      <Phone className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
                      Fijo {visit.patient.secondaryPhone}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary-dark">
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                {visit.route ? routeAreaLabels[visit.route.currentArea] : "Sin ruta"}
              </span>
              <VisitStatusPill status={visit.status} />
            </div>
          </div>
        </div>

        <div className="p-[18px]">
          <dl className="grid overflow-hidden rounded-[7px] border border-border bg-border sm:grid-cols-[minmax(12rem,0.8fr)_minmax(0,1.5fr)]">
            <div className="bg-surface px-3 py-2.5">
              <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase text-muted">
                <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
                Llegada
              </dt>
              <dd className="mt-0.5 text-sm font-medium tabular-nums text-text">
                {formatDateTime(visit.checkedInAt)}
              </dd>
            </div>
            <div className="mt-px bg-surface px-3 py-2.5 sm:ml-px sm:mt-0">
              <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase text-muted">
                <ClipboardList className="h-3.5 w-3.5" aria-hidden="true" />
                Motivo de atención
              </dt>
              <dd className="mt-0.5 text-sm font-medium text-text">
                {visit.reason || "Sin motivo registrado"}
              </dd>
            </div>
            <div className="mt-px bg-surface px-3 py-2.5 sm:col-span-2">
              <dt className="text-[11px] font-semibold uppercase text-muted">
                Procedencia de esta visita
              </dt>
              <dd className="mt-0.5 text-sm font-medium text-text">
                {geographicOriginLabel({
                  city: visit.originCity,
                  department: visit.originDepartment,
                  country: visit.originCountry
                }) || "Sin registrar"}
                {!visit.originMatchesPatient
                  ? " · diferente de su procedencia habitual"
                  : ""}
              </dd>
            </div>
            <div className="mt-px bg-surface px-3 py-2.5">
              <dt className="text-[11px] font-semibold uppercase text-muted">
                Fuentes de esta llegada
              </dt>
              <dd className="mt-0.5 text-sm font-medium text-text">
                {visitAttributionSummary(visit.attribution)}
              </dd>
            </div>
            <div className="mt-px bg-surface px-3 py-2.5 sm:ml-px">
              <dt className="text-[11px] font-semibold uppercase text-muted">
                Detalle interno verificado
              </dt>
              <dd className="mt-0.5 text-sm font-medium text-text">
                {verifiedAttributionDetail(visit.attribution)}
              </dd>
            </div>
          </dl>

          {isActive ? (
            <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
              {["recepcion", "super_admin"].includes(user.role) ? (
                <PaidStudyOrderDialog
                  visitId={visit.id}
                  action={createReceptionPaidStudyOrderAction}
                  studies={studyCatalogItems.map((study) => ({
                    id: study.id,
                    label: study.name,
                    referenceCents: study.basePriceCents
                  }))}
                  compactTrigger
                  triggerLabel="Enviar a análisis"
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
              {canRecordDiscontinuation ? (
                <a
                  href="#no-continuara"
                  className="focus-ring inline-flex min-h-9 items-center rounded-[7px] border border-error/30 px-3 text-sm font-semibold text-error hover:border-error/50"
                >
                  No continuará
                </a>
              ) : null}
            </div>
          ) : null}
        </div>
      </Card>

      <div className="grid items-start gap-4 xl:grid-cols-[1.4fr_1fr]">
        <div className="grid gap-4">
          {visit.discontinuation ? (
            <Card>
              <CardHeader
                title="Dónde se detuvo la visita"
                description="Registro del abandono y de lo que todavía debe recuperarse."
              />
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-semibold uppercase text-muted">
                    Punto y área
                  </dt>
                  <dd className="mt-1 font-semibold text-text">
                    {visitStatusLabels[visit.discontinuation.fromStatus]} ·{" "}
                    {routeAreaLabels[visit.discontinuation.area]}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase text-muted">
                    Motivo
                  </dt>
                  <dd className="mt-1 font-semibold text-text">
                    {
                      visitDiscontinuationReasonLabels[
                        visit.discontinuation.reason
                      ]
                    }
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase text-muted">
                    Registrado
                  </dt>
                  <dd className="mt-1 text-text">
                    {formatDateTime(visit.discontinuation.occurredAt)} ·{" "}
                    {visit.discontinuation.recordedBy?.name ??
                      visit.discontinuation.recordedBy?.email ??
                      "Usuario no disponible"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase text-muted">
                    Seguimiento
                  </dt>
                  <dd className="mt-1 text-text">
                    {visit.discontinuation.followUpTask ? (
                      <Link
                        href={`/sigeco/seguimientos/${visit.discontinuation.followUpTask.id}`}
                        className="focus-ring rounded-[7px] font-semibold text-primary-dark hover:underline"
                      >
                        {visit.discontinuation.followUpTask.assignedTo?.name ??
                          visit.discontinuation.followUpTask.assignedTo?.email ??
                          "Pendiente sin responsable"}
                      </Link>
                    ) : (
                      "No creado"
                    )}
                  </dd>
                </div>
              </dl>
              {visit.discontinuation.note ? (
                <p className="mt-3 rounded-[7px] bg-surface-soft px-3 py-2 text-sm text-text">
                  {visit.discontinuation.note}
                </p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {visit.discontinuation.pendingTypes.length > 0 ? (
                  visit.discontinuation.pendingTypes.map((type) => (
                    <Chip key={type}>{visitPendingTypeLabels[type]}</Chip>
                  ))
                ) : (
                  <span className="text-sm text-muted">
                    No se registraron pendientes.
                  </span>
                )}
              </div>
            </Card>
          ) : null}

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
            <>
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
              {canRecordDiscontinuation ? (
                <Card>
                  <CardHeader
                    title="No continuará"
                    description="Registra el motivo y conserva todo lo que quedó pendiente."
                  />
                  <VisitDiscontinuationForm
                    visitId={visit.id}
                    patientName={visit.patient.fullName}
                    defaultPendingTypes={
                      visit.route?.currentArea === "recepcion"
                        ? ["consultation"]
                        : []
                    }
                  />
                </Card>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
