import { AreaTimeInline } from "@/components/internal/area-times/AreaTimeInline";
import { Field, internalInputClassName } from "@/components/internal/Field";
import { MobileBackLink } from "@/components/internal/MobileBackLink";
import { ConfirmForm } from "@/components/internal/ConfirmForm";
import { NoticeForm } from "@/components/internal/NoticeForm";
import { VisitStatusPill } from "@/components/internal/StatusPill";
import { SubmitButton } from "@/components/internal/SubmitButton";
import { Card, CardHeader } from "@/components/internal/ui/Card";
import { CollapsibleSection } from "@/components/internal/ui/CollapsibleSection";
import { DateTimePickerField } from "@/components/internal/ui/DatePickerField";
import { getBranchContext } from "@/features/branches/context";
import { clinicalOrderTypeLabels } from "@/features/clinical-care/labels";
import { roleHasPermission } from "@/features/internal-auth/permissions";
import {
  assignNursingWorkItemAction,
  createNursingApplicationAction,
  createNursingChargeOrderAction,
  createNursingNoteAction,
  deleteNursingNoteAction,
  createVitalSignsAction,
  deriveNursingToDoctorAction,
  updateVitalSignsAction
} from "@/features/nursing/actions";
import {
  PaidStudyOrderDialog,
  type PaidStudyOption
} from "@/components/internal/PaidStudyOrderDialog";
import { NursingRouteField } from "@/features/nursing/components/NursingRouteField";
import { VitalSignsForm } from "@/features/nursing/components/VitalSignsForm";
import {
  vitalSignLimits,
  vitalSignRangeText,
  type VitalSignField
} from "@/features/nursing/vital-signs";
import { serviceSessionPricingModeLabels } from "@/features/service-sessions/labels";
import { consumeServiceSessionAction } from "@/features/service-sessions/service-session-actions";
import { createStudyAction } from "@/features/studies/actions";
import { studyStatusLabels, studyTypeLabels } from "@/features/studies/labels";
import type {
  StudyStatus,
  StudyType,
  VitalSigns
} from "@/generated/prisma/client";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/dates";
import { getVisitAreaTimingState } from "@/modules/database/queries/area-times";
import {
  getInjectableProductOptions,
  getNursingChargeOptions,
  getNursingWorkItemById
} from "@/modules/database/queries/nursing";
import { getPatientServiceSessionPackages } from "@/modules/database/queries/service-sessions";
import { requirePermission } from "@/modules/permissions";
import { getModuleAccessState } from "@/modules/database/queries/modules";
import { canUse } from "@/features/modules/access";
import { CheckCircle2, Stethoscope, X } from "lucide-react";
import { notFound } from "next/navigation";

const studyTypeOptions = Object.entries(studyTypeLabels) as Array<[StudyType, string]>;
const studyStatusOptions = Object.entries(studyStatusLabels) as Array<[StudyStatus, string]>;

function formatVitalsSummary(vs: VitalSigns) {
  const parts: string[] = [];
  if (vs.temperatureCelsius != null) parts.push(`T ${vs.temperatureCelsius}°C`);
  if (vs.systolicPressureMmHg != null || vs.diastolicPressureMmHg != null) {
    parts.push(`PA ${vs.systolicPressureMmHg ?? "—"}/${vs.diastolicPressureMmHg ?? "—"} mmHg`);
  }
  if (vs.heartRateBpm != null) parts.push(`FC ${vs.heartRateBpm} lpm`);
  if (vs.oxygenSaturation != null) parts.push(`SpO₂ ${vs.oxygenSaturation}%`);
  if (vs.respiratoryRateRpm != null) parts.push(`FR ${vs.respiratoryRateRpm} rpm`);
  if (vs.weightKg != null) parts.push(`${vs.weightKg} kg`);
  if (vs.heightCm != null) parts.push(`${vs.heightCm} cm`);
  return parts.length > 0 ? parts.join(" · ") : "Sin valores registrados";
}

type NursingWorkItemPageProps = {
  params: Promise<{ workItemId: string }>;
  searchParams: Promise<{ error?: string; aviso?: string; campo?: string }>;
};

function invalidVitalSignField(campo: string | undefined) {
  return campo && campo in vitalSignLimits ? (campo as VitalSignField) : null;
}

export default async function NursingWorkItemPage({ params, searchParams }: NursingWorkItemPageProps) {
  const user = await requirePermission("nursing_read", { module: "enfermeria" });
  const moduleAccess = await getModuleAccessState();
  const { activeBranch } = await getBranchContext(user);
  const { workItemId } = await params;
  const query = await searchParams;
  const invalidVitalField = invalidVitalSignField(query.campo);
  const item = await getNursingWorkItemById(workItemId);

  if (!item) notFound();
  if (item.visit.branchCode !== activeBranch.code) notFound();
  const areaTiming = await getVisitAreaTimingState(item.visit.id);
  const sessionPackages = await getPatientServiceSessionPackages(item.visit.patientId);
  const injectableProducts = await getInjectableProductOptions(item.visit.branchCode);
  const chargeOptions = await getNursingChargeOptions();
  // Opciones para derivar a Administración: catálogo (estudios/servicios de
  // enfermería) + productos de inventario que el paciente puede solicitar.
  const chargeStudyOptions: PaidStudyOption[] = [
    ...chargeOptions.catalog.map((option) => ({ ...option, kind: "catalog" as const })),
    ...chargeOptions.products.map((option) => ({ ...option, kind: "product" as const }))
  ];

  const patient = item.visit.patient;
  const canWriteNursing = canUse(user.role, moduleAccess, "nursing_write");
  const order = item.clinicalOrders[0];
  // Solo inyectables/procedimientos: excluye sueroterapia/ozono (sesiones) y estudios.
  const injectableOrder = item.clinicalOrders.find(
    (entry) => entry.type === "nursing_application" || entry.type === "medication"
  );
  const studyOrders = item.clinicalOrders.filter((entry) => entry.type === "study");

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
            <div className="flex flex-col items-end gap-1.5">
              <VisitStatusPill status={item.visit.status} />
              {areaTiming?.area === "enfermeria" &&
              canUse(user.role, moduleAccess, "area_time_write", "enfermeria") ? (
                <AreaTimeInline state={areaTiming} />
              ) : null}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[9px] border border-primary/25 bg-primary/5 p-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                Enfermera a cargo
              </p>
              <p className="mt-0.5 text-sm font-semibold text-text">
                {item.assignedTo?.name ?? item.assignedTo?.email ?? "Sin asignar"}
              </p>
            </div>
            {canWriteNursing ? (
              item.assignedToId === user.id ? (
                <NoticeForm action={assignNursingWorkItemAction} notice="Dejaste de atender">
                  <input type="hidden" name="workItemId" value={item.id} />
                  <input type="hidden" name="intent" value="release" />
                  <SubmitButton variant="outline">Dejar de atender</SubmitButton>
                </NoticeForm>
              ) : (
                <NoticeForm action={assignNursingWorkItemAction} notice="Estás atendiendo al paciente">
                  <input type="hidden" name="workItemId" value={item.id} />
                  <input type="hidden" name="intent" value="claim" />
                  <SubmitButton>
                    {item.assignedToId ? "Tomar el relevo" : "Atender a este paciente"}
                  </SubmitButton>
                </NoticeForm>
              )
            ) : null}
          </div>

          <div className="mt-4 rounded-[9px] border border-border bg-background p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
              Estudios y servicios a realizar
            </p>
            <ul className="mt-2 grid gap-2">
              {item.clinicalOrders.map((clinicalOrder) => {
                const pkg = sessionPackages.find(
                  (candidate) => candidate.serviceName === clinicalOrder.title
                );
                return (
                  <li
                    key={clinicalOrder.id}
                    className="flex items-center justify-between gap-3 rounded-[7px] border border-border bg-surface px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-text">
                        {clinicalOrder.title}
                      </p>
                      <p className="text-[11px] text-muted">
                        {clinicalOrderTypeLabels[clinicalOrder.type]}
                      </p>
                    </div>
                    {pkg ? (
                      <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold tabular-nums text-primary-dark">
                        ×{pkg.totalSessions} sesiones · faltan{" "}
                        {pkg.totalSessions - pkg.sessionsUsed}
                      </span>
                    ) : null}
                  </li>
                );
              })}
              {item.clinicalOrders.length === 0 ? (
                <li className="text-sm text-muted">{item.title}</li>
              ) : null}
            </ul>
            {order?.details ?? item.description ? (
              <p className="mt-2 text-[11px] text-muted">{order?.details ?? item.description}</p>
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
        {query.error === "invalid-vitals" ? (
          <div
            className="rounded-[9px] border border-error/30 bg-error/10 px-4 py-3 text-sm text-text max-sm:order-1"
            role="alert"
          >
            <p className="font-semibold text-error">No se guardaron los signos vitales</p>
            <p className="mt-1">
              {invalidVitalField
                ? `${vitalSignLimits[invalidVitalField].label} quedó fuera del rango permitido (${vitalSignRangeText(
                    invalidVitalField
                  )}). Corrige el valor y vuelve a guardar.`
                : "Alguna medición quedó fuera del rango permitido. Revisa los valores marcados en rojo y vuelve a guardar."}
            </p>
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
                const done = remaining <= 0;
                return (
                  <div
                    key={pkg.id}
                    className={cn(
                      "rounded-[9px] border p-3",
                      done ? "border-success/30 bg-success/5" : "border-border"
                    )}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-text">{pkg.serviceName}</span>
                      <div className="flex items-center gap-2">
                        {done ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-0.5 text-[11px] font-semibold text-success">
                            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                            Completado
                          </span>
                        ) : null}
                        <span className="text-xs tabular-nums text-muted">
                          {serviceSessionPricingModeLabels[pkg.pricingMode]}
                        </span>
                      </div>
                    </div>
                    <p className="mt-1 text-sm tabular-nums text-muted">
                      Usadas <strong className="text-text">{pkg.sessionsUsed}</strong> de{" "}
                      {pkg.totalSessions} · Restantes{" "}
                      <strong className="text-text">{Math.max(0, remaining)}</strong>
                    </p>

                    {pkg.uses.length > 0 ? (
                      <div className="mt-3 grid gap-1.5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                          Sesiones registradas
                        </p>
                        {pkg.uses.map((use) => (
                          <div
                            key={use.id}
                            className="flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded-[7px] border border-success/30 bg-success/10 px-3 py-2 text-sm text-success"
                          >
                            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                            <span className="font-semibold">
                              Sesión {use.sessionNumber}/{pkg.totalSessions}
                            </span>
                            <span className="tabular-nums">· {formatDateTime(use.appliedAt)}</span>
                            {use.appliedBy ? (
                              <span>· {use.appliedBy.name ?? use.appliedBy.email}</span>
                            ) : null}
                            {use.notes ? (
                              <span className="w-full text-success/90">{use.notes}</span>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {canWriteNursing && remaining > 0 && pkg.status === "active" ? (
                      <NoticeForm
                        action={consumeServiceSessionAction}
                        notice="Sesión registrada"
                        className="mt-3 grid gap-2"
                      >
                        <input type="hidden" name="packageId" value={pkg.id} />
                        <input type="hidden" name="visitId" value={item.visit.id} />
                        <input type="hidden" name="workItemId" value={item.id} />
                        <Field label="Fecha y hora de la sesión">
                          <DateTimePickerField name="appliedAt" />
                        </Field>
                        <Field label="Nota / detalle de la sesión (opcional)">
                          <textarea
                            className={`${internalInputClassName} min-h-24 py-2`}
                            name="notes"
                            placeholder="Describe lo que se le aplicó al paciente: medicación, dosis, observaciones…"
                          />
                        </Field>
                        <SubmitButton className="w-full">
                          Registrar sesión {pkg.sessionsUsed + 1}/{pkg.totalSessions}
                        </SubmitButton>
                      </NoticeForm>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </Card>
        ) : null}

        <Card className="max-sm:order-3">
          {item.visit.vitalSigns.length > 0 ? (
            <div className="mb-4 grid gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                Signos vitales registrados
              </p>
              {item.visit.vitalSigns.map((vs) => (
                <CollapsibleSection
                  key={vs.id}
                  title={formatDateTime(vs.recordedAt)}
                  description={formatVitalsSummary(vs)}
                  className="rounded-[9px] border border-border bg-background"
                >
                  {canWriteNursing ? (
                    <VitalSignsForm
                      action={updateVitalSignsAction}
                      notice="Signos vitales actualizados"
                      submitLabel="Guardar cambios"
                      submitVariant="outline"
                      hiddenFields={{
                        id: vs.id,
                        patientId: patient.id,
                        visitId: item.visit.id,
                        workItemId: item.id
                      }}
                      defaults={{
                        temperatureCelsius: vs.temperatureCelsius?.toString() ?? "",
                        oxygenSaturation: vs.oxygenSaturation?.toString() ?? "",
                        systolicPressureMmHg: vs.systolicPressureMmHg?.toString() ?? "",
                        diastolicPressureMmHg: vs.diastolicPressureMmHg?.toString() ?? "",
                        heartRateBpm: vs.heartRateBpm?.toString() ?? "",
                        respiratoryRateRpm: vs.respiratoryRateRpm?.toString() ?? "",
                        weightKg: vs.weightKg?.toString() ?? "",
                        heightCm: vs.heightCm?.toString() ?? ""
                      }}
                      defaultNotes={vs.notes ?? ""}
                    />
                  ) : (
                    <p className="text-sm text-muted">{formatVitalsSummary(vs)}</p>
                  )}
                </CollapsibleSection>
              ))}
            </div>
          ) : null}
          <CollapsibleSection
            title="Agregar signos vitales"
            description="Registrar cuando la orden o la atención lo requieran."
            defaultOpen={order?.type === "vital_signs" && item.visit.vitalSigns.length === 0}
            className="border-0 bg-transparent open:bg-transparent"
          >
          <VitalSignsForm
            action={createVitalSignsAction}
            notice="Signos vitales guardados"
            submitLabel="Guardar signos vitales"
            hiddenFields={{
              patientId: patient.id,
              visitId: item.visit.id,
              workItemId: item.id
            }}
            intro="Registra los que tengas; no es obligatorio llenarlos todos."
          />
          </CollapsibleSection>
        </Card>

        <Card className="max-sm:order-2">
          {item.nursingApplications.length > 0 ? (
            <div className="mb-4 grid gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                Aplicaciones registradas
              </p>
              {item.nursingApplications.map((app) => (
                <div
                  key={app.id}
                  className="rounded-[9px] border border-success/30 bg-success/10 px-3 py-2 text-sm text-success"
                >
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="font-semibold">{app.medication}</span>
                    {app.quantityUnits != null ? <span>· {app.quantityUnits} u</span> : null}
                    {app.route ? <span>· {app.route}</span> : null}
                    <span className="tabular-nums">· {formatDateTime(app.appliedAt)}</span>
                    {app.responsible ? (
                      <span>· {app.responsible.name ?? app.responsible.email}</span>
                    ) : null}
                  </div>
                  {app.notes ? <p className="mt-1 text-success/90">{app.notes}</p> : null}
                </div>
              ))}
            </div>
          ) : null}
          <CollapsibleSection
            title="Aplicación clínica (inyectables / procedimientos)"
            description="Solo inyectables y procedimientos. No incluye sueroterapia, ozonoterapia ni estudios."
            defaultOpen={Boolean(injectableOrder) || item.nursingApplications.length > 0}
            className="border-0 bg-transparent open:bg-transparent"
          >
          <NoticeForm action={createNursingApplicationAction} notice="Aplicación registrada" className="grid gap-3">
            <input type="hidden" name="patientId" value={patient.id} />
            <input type="hidden" name="visitId" value={item.visit.id} />
            <input type="hidden" name="workItemId" value={item.id} />
            <input type="hidden" name="clinicalOrderId" value={injectableOrder?.id ?? ""} />
            <Field label="Producto inyectable (opcional, descuenta stock)">
              <select className={internalInputClassName} name="inventoryItemId" defaultValue="">
                <option value="">— Ninguno / procedimiento —</option>
                {injectableProducts.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} · stock {product.currentStock} {product.unit}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Medicamento / insumo o procedimiento">
              <input
                className={internalInputClassName}
                name="medication"
                defaultValue=""
                placeholder="Si no es un producto del inventario, escríbelo aquí (ej. curación, nebulización)"
                required
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Cantidad (unidades)">
                <input className={internalInputClassName} name="quantityUnits" inputMode="numeric" placeholder="1" />
              </Field>
              <Field label="Hora">
                <DateTimePickerField name="appliedAt" />
              </Field>
            </div>
            <NursingRouteField />
            <Field label="Observaciones">
              <textarea className={`${internalInputClassName} min-h-20 py-3`} name="notes" />
            </Field>
            <SubmitButton className="w-full">Registrar aplicación</SubmitButton>
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
        <Card className="max-sm:order-5">
          <CardHeader
            title="Nota de enfermería"
            description="Se guarda en el historial permanente del paciente y el médico también la verá al recibirlo."
          />
          {item.visit.nursingNotes.length > 0 ? (
            <div className="mb-4 grid gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                Notas registradas
              </p>
              {item.visit.nursingNotes.map((note) => (
                <div
                  key={note.id}
                  className="flex items-start gap-2 rounded-[9px] border border-border bg-background px-3 py-2 text-sm text-text"
                >
                  <div className="min-w-0 flex-1">
                    <p className="whitespace-pre-line break-words">{note.note}</p>
                    <p className="mt-1 text-xs tabular-nums text-muted">
                      {formatDateTime(note.createdAt)}
                      {note.user ? ` · ${note.user.name ?? note.user.email}` : ""}
                    </p>
                  </div>
                  {canWriteNursing ? (
                    <ConfirmForm
                      action={deleteNursingNoteAction}
                      notice="Nota eliminada"
                      confirmTitle="Eliminar nota"
                      confirmDescription="Esta acción no se puede deshacer. La nota se borrará del historial del paciente."
                      confirmLabel="Eliminar"
                      confirmAtAllWidths
                      className="shrink-0"
                    >
                      <input type="hidden" name="noteId" value={note.id} />
                      <input type="hidden" name="workItemId" value={item.id} />
                      <input type="hidden" name="patientId" value={patient.id} />
                      <button
                        type="submit"
                        aria-label="Eliminar nota"
                        title="Eliminar nota"
                        className="focus-ring flex size-7 items-center justify-center rounded-full text-muted transition hover:bg-error/10 hover:text-error"
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </ConfirmForm>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
          <NoticeForm action={createNursingNoteAction} notice="Nota guardada" className="grid gap-3">
            <input type="hidden" name="patientId" value={patient.id} />
            <input type="hidden" name="visitId" value={item.visit.id} />
            <Field label="Nota">
              <textarea className={`${internalInputClassName} min-h-24 py-3`} name="note" required />
            </Field>
            <SubmitButton variant="outline">Guardar nota</SubmitButton>
          </NoticeForm>
        </Card>

        {canWriteNursing ? (
          <Card className="max-sm:order-6">
            <CardHeader
              title="Derivar al paciente"
              description="Al médico: se devuelve con todo lo registrado (signos, aplicaciones, estudios y notas). A Administración: para cobrar algo adicional que el paciente solicitó; al pagar, vuelve a Enfermería."
            />
            {query.error === "invalid-charge" ? (
              <p className="mb-3 rounded-[7px] bg-error/10 p-3 text-sm text-error">No se pudo generar la orden de cobro. Revisa los ítems seleccionados.</p>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <PaidStudyOrderDialog
                visitId={item.visit.id}
                action={createNursingChargeOrderAction}
                studies={chargeStudyOptions}
                triggerLabel="Derivar a Administración"
                title="Derivar a Administración"
                description="Selecciona los estudios, servicios o productos que el paciente solicitó. Se genera la orden de cobro y la ficha pasa a Administración; al pagar, vuelve a Enfermería."
                emptyMessage="No hay ítems disponibles para cobrar."
              />
              <NoticeForm action={deriveNursingToDoctorAction} notice="Paciente derivado al médico">
                <input type="hidden" name="workItemId" value={item.id} />
                <input type="hidden" name="visitId" value={item.visit.id} />
                <SubmitButton
                  variant="primary"
                  size="md"
                  className="min-h-16 w-full gap-2 text-[15px] font-semibold shadow-sm"
                >
                  <Stethoscope className="h-5 w-5" aria-hidden="true" />
                  Derivar al médico
                </SubmitButton>
              </NoticeForm>
            </div>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
