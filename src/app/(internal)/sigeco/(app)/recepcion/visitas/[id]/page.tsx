import Link from "next/link";
import { ConfirmForm } from "@/components/internal/ConfirmForm";
import { MobileBackLink } from "@/components/internal/MobileBackLink";
import { NoticeForm } from "@/components/internal/NoticeForm";
import { PaidStudyOrderDialog } from "@/components/internal/PaidStudyOrderDialog";
import { VisitStatusPill } from "@/components/internal/StatusPill";
import { SubmitButton } from "@/components/internal/SubmitButton";
import { Card, CardHeader } from "@/components/internal/ui/Card";
import { Chip } from "@/components/internal/ui/Chip";
import { VisitDiscontinuationForm } from "@/components/internal/visit-discontinuations/VisitDiscontinuationForm";
import { createReceptionPaidStudyOrderAction } from "@/features/clinical-care/actions";
import {
  routeAreaLabels,
  visitStatusLabels
} from "@/features/patients/labels";
import { applyVisitFlowAction } from "@/features/visits/actions";
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
import { formatDateTime } from "@/lib/dates";
import { createDirectWhatsAppLink } from "@/lib/whatsapp";
import { getVisitById } from "@/modules/database/queries/visits";
import { getActiveStudyCatalogItems } from "@/modules/database/queries/service-catalog";
import { requirePermission } from "@/modules/permissions";
import {
  Building2,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  MapPin,
  Phone,
  Stethoscope,
  Undo2,
  UserRound
} from "lucide-react";
import { notFound } from "next/navigation";
import { getBranchContext } from "@/features/branches/context";

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
  const currentArea = visit.route?.currentArea;
  const isOutsideReception = isActive && currentArea && currentArea !== "recepcion";
  const receptionActionsDisabled = Boolean(isOutsideReception);
  const activeBillingWorkItem = visit.workItems.find(
    (item) =>
      item.area === "administracion" &&
      ["pending", "acknowledged", "in_progress", "blocked"].includes(item.status) &&
      (item.sales.length > 0 || item.title.toLowerCase().includes("cobro"))
  );
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
      {query.error === "cobro-activo" ? (
        <div className="rounded-[9px] bg-warning/10 px-4 py-3 text-sm">
          <p className="font-semibold text-warning">
            No se puede volver a traer la visita.
          </p>
          <p className="mt-1 text-text">
            Existe una solicitud de cobro activa en Caja. Primero debe resolverse
            esa orden desde Administración.
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

      {isOutsideReception ? (
        <Card className="border-warning/30 bg-warning/10">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-warning">
                El paciente está en otra área
              </p>
              <p className="mt-1 text-sm text-text">
                Actualmente está en {routeAreaLabels[currentArea]}.
                {activeBillingWorkItem
                  ? " Tiene una solicitud de cobro activa, por eso no se puede volver a traer a recepción."
                  : " Si fue derivado por error, puedes traerlo nuevamente a recepción."}
              </p>
            </div>
            {roleHasPermission(user.role, "visits_update") && !activeBillingWorkItem ? (
              <NoticeForm
                action={applyVisitFlowAction}
                notice="Paciente devuelto a recepción"
                className="shrink-0"
              >
                <input type="hidden" name="visitId" value={visit.id} />
                <input type="hidden" name="flow" value="to_reception" />
                <input type="hidden" name="redirectTo" value={`/sigeco/recepcion/visitas/${visit.id}?aviso=paciente-devuelto-recepcion`} />
                <SubmitButton size="sm" variant="outline" className="border-warning/40 bg-surface text-warning hover:border-warning/70">
                  <Undo2 className="h-4 w-4" aria-hidden="true" />
                  Volver a traer a recepción
                </SubmitButton>
              </NoticeForm>
            ) : activeBillingWorkItem ? (
              <span className="shrink-0 rounded-[7px] border border-warning/30 bg-surface px-3 py-2 text-xs font-semibold text-warning">
                Cobro activo en Caja
              </span>
            ) : null}
          </div>
        </Card>
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
                  <a
                    href={createDirectWhatsAppLink(visit.patient.phone)}
                    target="_blank"
                    rel="noreferrer"
                    className="focus-ring inline-flex items-center gap-1.5 rounded-[7px] bg-surface px-2.5 py-1 font-semibold tabular-nums text-text shadow-sm hover:text-primary-dark hover:underline"
                  >
                    <Phone className="h-3.5 w-3.5 text-primary-dark" aria-hidden="true" />
                    {visit.patient.phone}
                  </a>
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
                Cómo nos conoció
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
            <div className="mt-4 grid gap-2 border-t border-border pt-4 sm:grid-cols-2 xl:grid-cols-5">
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
                  triggerClassName="min-h-16 w-full justify-start border border-primary/30 bg-primary px-3 text-left text-white shadow-sm hover:bg-primary-dark sm:justify-center"
                  triggerDisabled={receptionActionsDisabled}
                  triggerLabel="Enviar a análisis"
                />
              ) : null}
              <NoticeForm
                action={applyVisitFlowAction}
                notice="Paciente enviado a consulta"
                className="contents"
              >
                <input type="hidden" name="visitId" value={visit.id} />
                <input type="hidden" name="flow" value="to_consultation" />
                <input type="hidden" name="redirectTo" value="/sigeco/recepcion?aviso=paciente-enviado-consulta" />
                <SubmitButton
                  size="sm"
                  variant="outline"
                  disabled={receptionActionsDisabled}
                  className="min-h-16 w-full justify-start border-primary/30 bg-primary/10 px-3 text-left text-primary-dark shadow-sm hover:border-primary/50 hover:bg-primary/15 sm:justify-center"
                >
                  <Stethoscope className="h-4 w-4" aria-hidden="true" />
                  Enviar a consulta
                </SubmitButton>
              </NoticeForm>
              <NoticeForm
                action={applyVisitFlowAction}
                notice="Paciente enviado a administración"
                className="contents"
              >
                <input type="hidden" name="visitId" value={visit.id} />
                <input type="hidden" name="flow" value="to_administration" />
                <input type="hidden" name="redirectTo" value="/sigeco/recepcion?aviso=paciente-enviado-administracion" />
                <input
                  type="hidden"
                  name="note"
                  value="Pasa a administración para realizar una compra"
                />
                <SubmitButton
                  size="sm"
                  variant="outline"
                  disabled={receptionActionsDisabled}
                  className="min-h-16 w-full justify-start border-warning/35 bg-warning/10 px-3 text-left text-warning shadow-sm hover:border-warning/60 hover:bg-warning/15 sm:justify-center"
                >
                  <Building2 className="h-4 w-4" aria-hidden="true" />
                  Enviar a administración
                </SubmitButton>
              </NoticeForm>
              <ConfirmForm
                action={applyVisitFlowAction}
                notice="Visita cerrada"
                confirmTitle="Cerrar visita"
                confirmDescription={`La visita de ${visit.patient.fullName} quedará completada y saldrá de las bandejas activas. Esta acción no se puede deshacer.`}
                confirmLabel="Cerrar visita"
                className="contents"
              >
                <input type="hidden" name="visitId" value={visit.id} />
                <input type="hidden" name="flow" value="complete" />
                <input type="hidden" name="redirectTo" value="/sigeco/recepcion?aviso=visita-cerrada" />
                <SubmitButton
                  size="sm"
                  variant="outline"
                  disabled={receptionActionsDisabled}
                  className="min-h-16 w-full justify-start border-success/30 bg-success/10 px-3 text-left text-success shadow-sm hover:border-success/55 hover:bg-success/15 sm:justify-center"
                >
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  Cerrar atención completada
                </SubmitButton>
              </ConfirmForm>
            </div>
          ) : null}
        </div>
      </Card>

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
                  {visitDiscontinuationReasonLabels[visit.discontinuation.reason]}
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

        {isActive && canRecordDiscontinuation ? (
          <Card>
            <CardHeader
              title="No continuará"
              description="Registra el motivo y conserva todo lo que quedó pendiente."
            />
            <VisitDiscontinuationForm
              visitId={visit.id}
              patientName={visit.patient.fullName}
              defaultPendingTypes={
                visit.route?.currentArea === "recepcion" ? ["consultation"] : []
              }
            />
          </Card>
        ) : null}
      </div>
    </div>
  );
}
