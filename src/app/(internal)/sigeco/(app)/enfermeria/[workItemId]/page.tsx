import { notFound } from "next/navigation";
import type { StudyStatus, StudyType, VisitWorkItemStatus } from "@/generated/prisma/client";
import { Field, internalInputClassName } from "@/components/internal/Field";
import { NoticeForm } from "@/components/internal/NoticeForm";
import { MobileBackLink } from "@/components/internal/MobileBackLink";
import { VisitStatusPill } from "@/components/internal/StatusPill";
import { SubmitButton } from "@/components/internal/SubmitButton";
import { Card, CardHeader } from "@/components/internal/ui/Card";
import { AreaTimeControl } from "@/components/internal/area-times/AreaTimeControl";
import { CollapsibleSection } from "@/components/internal/ui/CollapsibleSection";
import { DateTimePickerField } from "@/components/internal/ui/DatePickerField";
import { DesktopDetailContext } from "@/components/internal/ui/DesktopDetailContext";
import { FormActions } from "@/components/internal/ui/FormActions";
import { VisitDiscontinuationForm } from "@/components/internal/visit-discontinuations/VisitDiscontinuationForm";
import { clinicalOrderTypeLabels } from "@/features/clinical-care/labels";
import {
  createNursingApplicationAction,
  createNursingNoteAction,
  createVitalSignsAction,
  returnStudiesToDoctorAction,
  updateNursingWorkItemAction
} from "@/features/nursing/actions";
import { nursingWorkItemStatusLabels } from "@/features/nursing/labels";
import { consumeServiceSessionAction } from "@/features/service-sessions/service-session-actions";
import {
  formatServiceSessionMoney,
  serviceSessionPricingModeLabels
} from "@/features/service-sessions/labels";
import { getActivePatientServiceSessionPackages } from "@/modules/database/queries/service-sessions";
import { createStudyAction } from "@/features/studies/actions";
import { studyStatusLabels, studyTypeLabels } from "@/features/studies/labels";
import { roleHasPermission } from "@/features/internal-auth/permissions";
import { isActiveVisitStatus } from "@/features/visits/schemas/visit.schema";
import { getNursingWorkItemById } from "@/modules/database/queries/nursing";
import { getVisitAreaTimingState } from "@/modules/database/queries/area-times";
import { requirePermission } from "@/modules/permissions";
import { getBranchContext } from "@/features/branches/context";

const workItemStatusOptions = (["acknowledged", "in_progress", "completed", "blocked"] as VisitWorkItemStatus[]).map(
  (status) => [status, nursingWorkItemStatusLabels[status]] as [VisitWorkItemStatus, string]
);
const studyTypeOptions = Object.entries(studyTypeLabels) as Array<[StudyType, string]>;
const studyStatusOptions = Object.entries(studyStatusLabels) as Array<[StudyStatus, string]>;

type NursingWorkItemPageProps = {
  params: Promise<{ workItemId: string }>;
  searchParams: Promise<{ error?: string; aviso?: string }>;
};

export default async function NursingWorkItemPage({ params, searchParams }: NursingWorkItemPageProps) {
  const user = await requirePermission("nursing_read");
  const { activeBranch } = await getBranchContext(user);
  const { workItemId } = await params;
  const query = await searchParams;
  const item = await getNursingWorkItemById(workItemId);

  if (!item) notFound();
  if (item.visit.branchCode !== activeBranch.code) notFound();
  const areaTiming = await getVisitAreaTimingState(item.visit.id);
  const sessionPackages = await getActivePatientServiceSessionPackages(item.visit.patientId);

  const patient = item.visit.patient;
  const canWriteNursing = roleHasPermission(user.role, "nursing_write");
  const order = item.clinicalOrders[0];
  const applicationOrderTypes = ["nursing_application", "serum", "medication"];
  const studyOrders = item.clinicalOrders.filter((entry) => entry.type === "study");
  const studiesCompleted = studyOrders.length > 0 && studyOrders.every((entry) => entry.status === "completed");
  const canRecordDiscontinuation = roleHasPermission(
    user.role,
    "visit_discontinuations_write"
  );

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[1.5fr_1fr]">
      <MobileBackLink href="/sigeco/enfermeria" label="Volver a Enfermería" />
      <div className="grid gap-4 max-sm:contents">
        <Card className="max-sm:order-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium tabular-nums text-muted">{patient.internalCode}</p>
              <h2 className="font-sora text-xl font-bold tracking-tight text-text">
                {patient.fullName}
              </h2>
              <p className="mt-0.5 text-sm tabular-nums text-muted">{patient.phone}</p>
            </div>
            <VisitStatusPill status={item.visit.status} />
          </div>
          <div className="mt-4 rounded-[9px] border border-border bg-background p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
              {order ? clinicalOrderTypeLabels[order.type] : "Tarea de enfermería"}
            </p>
            <p className="mt-0.5 text-sm font-semibold text-text">{order?.title ?? item.title}</p>
            {order?.details ?? item.description ? (
              <p className="mt-1 text-sm text-muted">{order?.details ?? item.description}</p>
            ) : null}
            <p className="mt-2 text-[11px] text-muted">
              Registró:{" "}
              {order?.doctor?.name ??
                order?.doctor?.email ??
                item.createdBy?.name ??
                item.createdBy?.email ??
                "Sin responsable"}
            </p>
          </div>
        </Card>

        {query.aviso === "sesion-registrada" ? (
          <div
            className="rounded-[9px] border border-success/30 bg-success/10 px-4 py-3 text-sm text-text max-sm:order-1"
            role="status"
          >
            Sesión registrada. Se descontó del paquete del paciente.
          </div>
        ) : null}
        {query.error === "no-sessions-left" || query.error === "not-active" ? (
          <div
            className="rounded-[9px] border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning max-sm:order-1"
            role="alert"
          >
            {query.error === "no-sessions-left"
              ? "Ese paquete ya no tiene sesiones disponibles."
              : "Ese paquete ya no está activo."}
          </div>
        ) : null}

        {sessionPackages.length > 0 ? (
          <Card className="max-sm:order-2">
            <CardHeader
              title="Sesiones de servicio del paciente"
              description="Suero/ozono pagados. Registra cada sesión aplicada; cada una cuenta como una visita."
            />
            <div className="grid gap-3">
              {sessionPackages.map((pkg) => {
                const remaining = pkg.totalSessions - pkg.sessionsUsed;
                return (
                  <div key={pkg.id} className="rounded-[9px] border border-border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-text">{pkg.serviceName}</span>
                      <span className="text-xs tabular-nums text-muted">
                        {serviceSessionPricingModeLabels[pkg.pricingMode]} ·{" "}
                        {formatServiceSessionMoney(pkg.totalPaidCents)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm tabular-nums text-muted">
                      Usadas <strong className="text-text">{pkg.sessionsUsed}</strong> de{" "}
                      {pkg.totalSessions} · Restantes{" "}
                      <strong className="text-text">{remaining}</strong>
                    </p>
                    {canWriteNursing && remaining > 0 ? (
                      <NoticeForm
                        action={consumeServiceSessionAction}
                        notice="Sesión registrada"
                        className="mt-3 grid gap-2"
                      >
                        <input type="hidden" name="packageId" value={pkg.id} />
                        <input type="hidden" name="visitId" value={item.visit.id} />
                        <input type="hidden" name="workItemId" value={item.id} />
                        <Field label="Nota de la sesión (opcional)">
                          <input className={internalInputClassName} name="notes" />
                        </Field>
                        <FormActions className="justify-end">
                          <SubmitButton variant="outline">
                            Registrar sesión {pkg.sessionsUsed + 1}/{pkg.totalSessions}
                          </SubmitButton>
                        </FormActions>
                      </NoticeForm>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </Card>
        ) : null}

        <Card className="max-sm:order-3">
          <CollapsibleSection
            title="Signos vitales"
            description="Registrar cuando la orden o la atención lo requieran."
            defaultOpen={order?.type === "vital_signs"}
            className="border-0 bg-transparent open:bg-transparent"
          >
          <NoticeForm action={createVitalSignsAction} notice="Signos vitales guardados" className="grid gap-3">
            <input type="hidden" name="patientId" value={patient.id} />
            <input type="hidden" name="visitId" value={item.visit.id} />
            <input type="hidden" name="workItemId" value={item.id} />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Field label="Temperatura C">
                <input className={internalInputClassName} name="temperatureCelsius" inputMode="decimal" />
              </Field>
              <Field label="Saturación O2">
                <input className={internalInputClassName} name="oxygenSaturation" inputMode="numeric" />
              </Field>
              <Field label="Presión sistólica">
                <input className={internalInputClassName} name="systolicPressureMmHg" inputMode="numeric" />
              </Field>
              <Field label="Presión diastólica">
                <input className={internalInputClassName} name="diastolicPressureMmHg" inputMode="numeric" />
              </Field>
              <Field label="Pulso">
                <input className={internalInputClassName} name="heartRateBpm" inputMode="numeric" />
              </Field>
              <Field label="Respiración">
                <input className={internalInputClassName} name="respiratoryRateRpm" inputMode="numeric" />
              </Field>
              <Field label="Peso kg">
                <input className={internalInputClassName} name="weightKg" inputMode="decimal" />
              </Field>
              <Field label="Talla cm">
                <input className={internalInputClassName} name="heightCm" inputMode="decimal" />
              </Field>
            </div>
            <Field label="Observaciones">
              <textarea className={`${internalInputClassName} min-h-20 py-3`} name="notes" />
            </Field>
            <div className="flex justify-end">
              <SubmitButton variant="outline">Guardar signos</SubmitButton>
            </div>
          </NoticeForm>
          </CollapsibleSection>
        </Card>

        <Card className="max-sm:order-2">
          <CollapsibleSection
            title="Aplicación clínica"
            description="La indicación médica ya viene prellenada."
            defaultOpen={order ? applicationOrderTypes.includes(order.type) : false}
            className="border-0 bg-transparent open:bg-transparent"
          >
          <NoticeForm action={createNursingApplicationAction} notice="Aplicación registrada" className="grid gap-3">
            <input type="hidden" name="patientId" value={patient.id} />
            <input type="hidden" name="visitId" value={item.visit.id} />
            <input type="hidden" name="workItemId" value={item.id} />
            <input type="hidden" name="clinicalOrderId" value={order?.id ?? ""} />
            <Field label="Medicamento o insumo">
              <input
                className={internalInputClassName}
                name="medication"
                defaultValue={order?.title ?? ""}
                required
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Cantidad">
                <input className={internalInputClassName} name="quantity" />
              </Field>
              <Field label="Vía">
                <input className={internalInputClassName} name="route" />
              </Field>
              <Field label="Hora">
                <DateTimePickerField name="appliedAt" />
              </Field>
            </div>
            <Field label="Observaciones">
              <textarea className={`${internalInputClassName} min-h-20 py-3`} name="notes" />
            </Field>
            <FormActions className="justify-end border-t-0 pt-0">
              <SubmitButton>Registrar aplicación</SubmitButton>
            </FormActions>
          </NoticeForm>
          </CollapsibleSection>
        </Card>

        <Card className="max-sm:order-4">
          <CollapsibleSection
            title="Estudio"
            description="Registrar solo cuando exista una orden o resultado."
            defaultOpen={order?.type === "study"}
            className="border-0 bg-transparent open:bg-transparent"
          >
          <div className="grid gap-5">
          {studyOrders.map((studyOrder) => studyOrder.status === "completed" ? (
            <div key={studyOrder.id} className="rounded-[7px] border border-success/30 bg-success/10 p-3 text-sm font-medium text-success">
              {studyOrder.title}: resultado registrado
            </div>
          ) : (
          <NoticeForm key={studyOrder.id} action={createStudyAction} notice={`${studyOrder.title} registrado`} className="grid gap-3 border-b border-border pb-5 last:border-0 last:pb-0">
            <input type="hidden" name="patientId" value={patient.id} />
            <input type="hidden" name="visitId" value={item.visit.id} />
            <input type="hidden" name="workItemId" value={item.id} />
            <input type="hidden" name="clinicalOrderId" value={studyOrder.id} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Tipo">
                <select
                  className={internalInputClassName}
                  name="type"
                  defaultValue={studyOrder.title === "Resonancia" ? "resonance" : "laboratory"}
                >
                  {studyTypeOptions.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Estado">
                <select className={internalInputClassName} name="status" defaultValue="performed">
                  {studyStatusOptions.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Nombre del estudio">
              <input
                className={internalInputClassName}
                name="title"
                defaultValue={studyOrder.title}
                required
              />
            </Field>
            <Field label="Resumen">
              <input className={internalInputClassName} name="resultSummary" />
            </Field>
            <Field label="Hallazgos">
              <textarea className={`${internalInputClassName} min-h-24 py-3`} name="findings" />
            </Field>
            <div className="flex justify-end">
              <SubmitButton variant="outline">Registrar estudio</SubmitButton>
            </div>
          </NoticeForm>
          ))}
          {studyOrders.length === 0 ? <p className="text-sm text-muted">Esta tarea no tiene estudios asociados.</p> : null}
          </div>
          </CollapsibleSection>
        </Card>
      </div>

      <div className="grid gap-4 max-sm:contents xl:sticky xl:top-0 xl:max-h-[calc(100dvh-6.5rem)] xl:overflow-y-auto xl:overscroll-contain xl:pr-1">
        <DesktopDetailContext
          eyebrow={patient.internalCode}
          title={patient.fullName}
          meta={patient.phone}
          status={<VisitStatusPill status={item.visit.status} />}
        />
        {areaTiming?.area === "enfermeria" &&
        roleHasPermission(user.role, "area_time_write") ? (
          <AreaTimeControl state={areaTiming} compact />
        ) : null}
        {isActiveVisitStatus(item.visit.status) &&
        canRecordDiscontinuation ? (
          <Card className="max-sm:order-4">
            <CardHeader
              title="No continuará"
              description="Guarda el motivo y bloquea lo que quedó sin realizar."
            />
            <VisitDiscontinuationForm
              visitId={item.visit.id}
              patientName={patient.fullName}
              defaultPendingTypes={[
                ...(studyOrders.some(
                  (studyOrder) => studyOrder.status !== "completed"
                )
                  ? (["study"] as const)
                  : []),
                ...(item.clinicalOrders.some((clinicalOrder) =>
                  applicationOrderTypes.includes(clinicalOrder.type)
                ) && item.status !== "completed"
                  ? (["application"] as const)
                  : [])
              ]}
              compact
            />
          </Card>
        ) : null}
        <Card className="max-sm:order-5">
          {query.error === "estudios-incompletos" ? (
            <p className="mb-3 rounded-[7px] bg-warning/10 p-3 text-sm text-warning">Registra el resultado de todos los estudios antes de devolver al paciente.</p>
          ) : null}
          {studyOrders.length > 0 ? (
            <NoticeForm action={returnStudiesToDoctorAction} notice="Paciente devuelto al médico" className="mb-4">
              <input type="hidden" name="workItemId" value={item.id} />
              <input type="hidden" name="visitId" value={item.visit.id} />
              <SubmitButton className="w-full" disabled={!studiesCompleted}>Finalizar análisis y devolver al médico</SubmitButton>
            </NoticeForm>
          ) : null}
          <CardHeader
            title="Estado de la tarea"
            description="Registra el avance operativo o devuelve los estudios finalizados al médico."
          />
          <NoticeForm action={updateNursingWorkItemAction} notice="Tarea actualizada" className="grid gap-3">
            <input type="hidden" name="workItemId" value={item.id} />
            <Field label="Estado">
              <select
                className={internalInputClassName}
                name="status"
                defaultValue={item.status === "pending" ? "acknowledged" : item.status}
              >
                {workItemStatusOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Nota">
              <textarea className={`${internalInputClassName} min-h-20 py-3`} name="notes" />
            </Field>
            <SubmitButton>Actualizar tarea</SubmitButton>
          </NoticeForm>
        </Card>

        <Card className="max-sm:order-6">
          <CardHeader
            title="Nota de enfermería"
            description="Añade una observación clínica al historial permanente del paciente."
          />
          <NoticeForm action={createNursingNoteAction} notice="Nota guardada" className="grid gap-3">
            <input type="hidden" name="patientId" value={patient.id} />
            <input type="hidden" name="visitId" value={item.visit.id} />
            <Field label="Nota">
              <textarea className={`${internalInputClassName} min-h-24 py-3`} name="note" required />
            </Field>
            <SubmitButton variant="outline">Guardar nota</SubmitButton>
          </NoticeForm>
        </Card>
      </div>
    </div>
  );
}
