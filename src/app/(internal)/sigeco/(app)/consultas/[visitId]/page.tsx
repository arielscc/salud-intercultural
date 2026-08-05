import { AreaTimeControl } from "@/components/internal/area-times/AreaTimeControl";
import { ClinicalConsultationCorrectionForm } from "@/components/internal/clinical-records/ClinicalConsultationCorrectionForm";
import { ConfirmForm } from "@/components/internal/ConfirmForm";
import { Field, internalInputClassName } from "@/components/internal/Field";
import { MobileBackLink } from "@/components/internal/MobileBackLink";
import { NoticeForm } from "@/components/internal/NoticeForm";
import { PaidStudyOrderDialog } from "@/components/internal/PaidStudyOrderDialog";
import { VisitStatusPill } from "@/components/internal/StatusPill";
import { SubmitButton } from "@/components/internal/SubmitButton";
import { TreatmentProposalOutcomeForm } from "@/components/internal/treatment-proposals/TreatmentProposalOutcomeForm";
import { Card, CardHeader } from "@/components/internal/ui/Card";
import { Chip } from "@/components/internal/ui/Chip";
import { CollapsibleSection } from "@/components/internal/ui/CollapsibleSection";
import { DesktopDetailContext } from "@/components/internal/ui/DesktopDetailContext";
import { FormActions } from "@/components/internal/ui/FormActions";
import { InfoRow } from "@/components/internal/ui/InfoRow";
import { TimelineItem } from "@/components/internal/ui/TimelineItem";
import { VisitDiscontinuationForm } from "@/components/internal/visit-discontinuations/VisitDiscontinuationForm";
import { getBranchContext } from "@/features/branches/context";
import {
  assignConsultationVisitAction,
  createClinicalOrderAction,
  createPaidStudyOrderAction,
  finalizeClinicalConsultationAction,
  saveClinicalConsultationAction
} from "@/features/clinical-care/actions";
import { clinicalOrderStatusLabels, clinicalOrderTypeLabels } from "@/features/clinical-care/labels";
import { clinicalRecordStatusLabels } from "@/features/clinical-records/labels";
import { AdministrationOrderDialog } from "@/features/doctor-orders/components/AdministrationOrderDialog";
import { saveDoctorOrderAction } from "@/features/doctor-orders/doctor-order-actions";
import {
  doctorOrderLineSourceLabels,
  doctorOrderLineTotalCents,
  doctorOrderStatusLabels,
  formatDoctorOrderMoney
} from "@/features/doctor-orders/labels";
import { createDoctorVisitFollowUpAction } from "@/features/follow-ups/actions";
import { followUpTypeLabels } from "@/features/follow-ups/labels";
import {
  correctPrescriptionAction,
  generatePrescriptionDocumentAction
} from "@/features/generated-documents/actions";
import { roleHasPermission } from "@/features/internal-auth/permissions";
import { routeAreaLabels } from "@/features/patients/labels";
import { symptomDurationUnitLabels, visitIntakeTypeLabels } from "@/features/reception/labels";
import { formatMoney } from "@/features/sales/labels";
import {
  formatServiceSessionMoney,
  serviceSessionPricingModeLabels
} from "@/features/service-sessions/labels";
import { studyStatusLabels, studyTypeLabels } from "@/features/studies/labels";
import {
  treatmentProposalOutcomeReasonLabels,
  treatmentProposalOutcomeStatusLabels
} from "@/features/treatment-proposals/labels";
import { applyVisitFlowAction } from "@/features/visits/actions";
import type { ClinicalOrderType, PatientRouteArea } from "@/generated/prisma/client";
import { formatDate, formatDateTime } from "@/lib/dates";
import { getVisitAreaTimingState } from "@/modules/database/queries/area-times";
import {
  getClinicalVisitById,
  getIndicationCatalog,
  getMedicationOptions,
  getPatientConsultationHistory,
  getPatientPreviousPrescriptionItems,
  getVisitCurrentPrescriptionItems
} from "@/modules/database/queries/clinical-care";
import { PrescriptionEditor } from "@/components/internal/PrescriptionEditor";
import { IndicationField } from "@/components/internal/IndicationField";
import {
  getDoctorOrderByVisit,
  getDoctorOrderOptions
} from "@/modules/database/queries/doctor-orders";
import { getVisitLatestSale } from "@/modules/database/queries/sales";
import { getActiveStudyCatalogItems } from "@/modules/database/queries/service-catalog";
import { getPrescriptionDocuments } from "@/modules/generated-documents/service";
import { requirePermission } from "@/modules/permissions";
import { ChevronDown, HeartPulse, Paperclip } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

// El suero se ordena por el pedido para Administración (pago previo, Tarea 4),
// no por la derivación directa a Enfermería.
const orderTypeOptions = (Object.entries(clinicalOrderTypeLabels) as Array<
  [ClinicalOrderType, string]
>).filter(([type]) => type !== "study" && type !== "serum");
const targetAreaOptions = (["enfermeria", "administracion", "seguimiento"] as PatientRouteArea[]).map(
  (area) => [area, routeAreaLabels[area]] as [PatientRouteArea, string]
);

type ConsultationDetailPageProps = {
  params: Promise<{ visitId: string }>;
  searchParams: Promise<{ error?: string; aviso?: string }>;
};

function calculatePatientAge(birthDate: Date | null) {
  if (!birthDate) return null;
  const now = new Date();
  let age = now.getFullYear() - birthDate.getFullYear();
  const monthDelta = now.getMonth() - birthDate.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < birthDate.getDate())) age -= 1;
  return age >= 0 ? age : null;
}

function yesNoLabel(value: boolean | null) {
  if (value === null) return "Sin registro";
  return value ? "Sí" : "No";
}

function pageErrorMessage(error: string) {
  const messages: Record<string, string> = {
    "consulta-invalida": "Revisa los datos obligatorios de la consulta.",
    "consulta-desactualizada":
      "Otra persona modificó esta consulta. Recarga la información antes de intentarlo nuevamente.",
    "consulta-finalizada":
      "La consulta ya está finalizada. Para cambiarla debes registrar una corrección.",
    "consulta-ya-finalizada": "La consulta ya había sido finalizada.",
    "consulta-sin-finalizar":
      "Primero finaliza y firma la consulta. La visita continúa abierta.",
    "correccion-invalida":
      "Revisa el tipo, el motivo y los datos de la corrección.",
    "correccion-sin-cambios":
      "No se registró la corrección porque los datos son iguales a la versión vigente.",
    "correccion-no-disponible":
      "Solo puede corregirse una consulta finalizada y vigente.",
    "resultado-invalido":
      "Revisa el resultado, el motivo y la instrucción para Administración.",
    "resultado-cerrado":
      "La propuesta aceptada ya fue confirmada y no puede enviarse nuevamente.",
    "receta-invalida": "No existe una receta vigente para emitir.",
    "perfil-profesional-requerido":
      "Dirección debe confirmar los registros profesionales antes de emitir la receta.",
    "correccion-receta-invalida":
      "Revisa el motivo y todos los datos de la receta corregida.",
    "correccion-receta-sin-cambios":
      "La receta no cambió; se conservó la versión vigente.",
    "seguimiento-invalido":
      "Revisa el motivo, la fecha y la hora del seguimiento.",
    "pedido-invalido": "Revisa las líneas del pedido: oferta, cantidad y montos.",
    "discount-over-cap":
      "El descuento total del pedido supera el tope permitido (suma de los umbrales por producto).",
    "empty-order": "Agrega al menos una línea antes de enviar el pedido a Administración.",
    "consultation-not-finalized":
      "Finaliza y firma la consulta antes de enviar el pedido a Administración.",
    "visit-not-in-consultation": "La visita ya no admite cambios en el pedido.",
    "already-confirmed": "Administración ya confirmó este pedido; no se puede editar.",
    "invalid-line": "Una línea apunta a una oferta o producto que ya no está disponible.",
    "invalid-study-order":
      "Selecciona al menos un estudio activo y revisa los precios ingresados."
  };
  return (
    messages[error] ??
    "La visita ya no está disponible para registrar esta decisión."
  );
}

export default async function ConsultationDetailPage({
  params,
  searchParams
}: ConsultationDetailPageProps) {
  const user = await requirePermission("clinical_read");
  const { activeBranch } = await getBranchContext(user);
  const [{ visitId }, query] = await Promise.all([params, searchParams]);
  const [
    visit,
    prescriptionDocuments,
    areaTiming,
    doctorOrder,
    doctorOrderOptions,
    studyCatalogItems,
    medicationOptions,
    currentPrescriptionItems,
    indicationCatalog
  ] =
    await Promise.all([
      getClinicalVisitById(visitId),
      getPrescriptionDocuments(visitId),
      getVisitAreaTimingState(visitId),
      getDoctorOrderByVisit(visitId),
      getDoctorOrderOptions(),
      getActiveStudyCatalogItems(),
      getMedicationOptions(),
      getVisitCurrentPrescriptionItems(visitId),
      getIndicationCatalog()
    ]);

  if (!visit) notFound();
  if (visit.branchCode !== activeBranch.code) notFound();

  const consultationHistory = await getPatientConsultationHistory(visit.patient.id, visit.id);
  const previousPrescriptionItems = await getPatientPreviousPrescriptionItems(
    visit.patient.id,
    visit.id
  );
  const latestVisitSale = await getVisitLatestSale(visit.id);

  const primaryDiagnosis = visit.clinicalConsultation?.diagnoses.find((item) => item.kind === "primary");
  const secondaryDiagnosis = visit.clinicalConsultation?.diagnoses.find((item) => item.kind === "secondary");
  const prescriptionItem = visit.prescriptions[0]?.items[0];
  const age = calculatePatientAge(visit.patient.birthDate);
  const symptomDuration =
    visit.symptomDurationValue && visit.symptomDurationUnit
      ? `${visit.symptomDurationValue} ${symptomDurationUnitLabels[visit.symptomDurationUnit].toLocaleLowerCase("es-BO")}`
      : "Sin registro";
  const consultationMotive = visit.clinicalConsultation?.motive ?? visit.reason ?? "Sin motivo registrado";
  const latestProposalOutcome = visit.treatmentProposalOutcomes[0];
  const proposalSale =
    latestProposalOutcome?.administrationOrder?.workItem?.sales[0];
  const canWriteClinical = roleHasPermission(user.role, "clinical_write");
  const canFinalizeClinical = roleHasPermission(
    user.role,
    "clinical_finalize"
  );
  const canCorrectClinical = roleHasPermission(user.role, "clinical_correct");
  const canRecordDiscontinuation = roleHasPermission(
    user.role,
    "visit_discontinuations_write"
  );
  const followUpConsentGranted =
    visit.patient.consents[0]?.decision === "granted";
  const canRecordProposal =
    canWriteClinical &&
    visit.status === "in_consultation" &&
    visit.clinicalConsultation?.status === "finalized" &&
    latestProposalOutcome?.status !== "accepted";
  const canDerivePatient =
    canWriteClinical &&
    (visit.status === "in_consultation" || visit.status === "in_administration");
  // Administración: tratamientos (siempre) + servicios NO de enfermería + productos.
  const administrationOptions = [
    ...doctorOrderOptions.catalogOptions
      .filter((option) => option.source === "treatment" || !option.requiresNursing)
      .map((option) => ({
        source: option.source as "service" | "treatment",
        catalogItemId: option.catalogItemId,
        label: option.label,
        group: option.source === "treatment" ? "Tratamientos" : "Servicios",
        unitPriceCents: option.unitPriceCents,
        perUnitCapCents: option.perUnitCapCents
      })),
    ...doctorOrderOptions.productOptions.map((option) => ({
      source: "product" as const,
      inventoryItemId: option.inventoryItemId,
      label: option.label,
      group: "Productos",
      unitPriceCents: option.unitPriceCents,
      perUnitCapCents: option.perUnitCapCents
    }))
  ];
  // Enfermería: estudios + servicios que se ejecutan en enfermería.
  const nursingOptions = [
    ...studyCatalogItems.map((study) => ({
      id: study.id,
      label: study.name,
      referenceCents: study.basePriceCents,
      capCents: study.ownMaxDiscountCents
    })),
    ...doctorOrderOptions.catalogOptions
      .filter((option) => option.source === "service" && option.requiresNursing)
      .map((option) => ({
        id: option.catalogItemId,
        label: option.label,
        referenceCents: option.packagePriceCents ?? option.unitPriceCents,
        capCents: option.perUnitCapCents
      }))
  ];
  const clinicalSnapshot = {
    motive: consultationMotive,
    primaryDiagnosis: primaryDiagnosis?.name ?? "",
    secondaryDiagnosis: secondaryDiagnosis?.name,
    findings: visit.clinicalConsultation?.findings,
    observations: visit.clinicalConsultation?.observations,
    treatmentPlanText: visit.clinicalConsultation?.treatmentPlanText,
    indications: visit.clinicalConsultation?.indications
  };

  // Todo lo que el paciente trae desde Enfermería en esta visita.
  const hasNursingData =
    visit.studies.length > 0 ||
    visit.vitalSigns.length > 0 ||
    visit.nursingApplications.length > 0 ||
    visit.serviceSessionUses.length > 0 ||
    visit.nursingNotes.length > 0;

  // Fecha en la que se realizó lo de Enfermería (la actividad más reciente).
  const nursingActivityDates = [
    ...visit.studies.map((s) => s.performedAt ?? s.createdAt),
    ...visit.vitalSigns.map((v) => v.recordedAt),
    ...visit.nursingApplications.map((a) => a.appliedAt),
    ...visit.serviceSessionUses.map((u) => u.appliedAt),
    ...visit.nursingNotes.map((n) => n.createdAt)
  ];
  const nursingDate =
    nursingActivityDates.length > 0
      ? new Date(Math.max(...nursingActivityDates.map((d) => d.getTime())))
      : null;

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[1.5fr_1fr]">
      <MobileBackLink href="/sigeco/consultas" label="Volver a Consulta" />
      <div className="grid gap-4 max-sm:contents">
        {query.error ? (
          <div
            className="rounded-[9px] border border-error/30 bg-error/10 px-4 py-3 text-sm text-error max-sm:order-1"
            role="alert"
          >
            {pageErrorMessage(query.error)}
          </div>
        ) : null}
        {query.aviso ? (
          <div
            className="rounded-[9px] border border-success/30 bg-success/10 px-4 py-3 text-sm text-text max-sm:order-1"
            role="status"
          >
            {query.aviso === "consulta-finalizada"
              ? "La consulta quedó finalizada con autor, fecha y hora."
              : query.aviso === "pedido-guardado"
                ? "El pedido para Administración quedó guardado."
                : query.aviso === "seguimiento-agendado"
                  ? "Seguimiento agendado y enviado a Recepción."
                  : "La corrección quedó registrada como una nueva versión."}
          </div>
        ) : null}
        <Card className="max-sm:order-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium tabular-nums text-muted">
                {visit.patient.internalCode}
              </p>
              <h2 className="font-sora text-xl font-bold tracking-tight text-text">
                {visit.patient.fullName}
              </h2>
              <p className="mt-0.5 text-sm tabular-nums text-muted">{visit.patient.phone}</p>
            </div>
            <VisitStatusPill status={visit.status} />
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[9px] border border-primary/25 bg-primary/5 p-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                Médico a cargo
              </p>
              <p className="mt-0.5 text-sm font-semibold text-text">
                {visit.attendingUser?.name ?? visit.attendingUser?.email ?? "Sin asignar"}
              </p>
            </div>
            {canWriteClinical ? (
              visit.attendingUserId === user.id ? (
                <NoticeForm action={assignConsultationVisitAction} notice="Dejaste de atender">
                  <input type="hidden" name="visitId" value={visit.id} />
                  <input type="hidden" name="intent" value="release" />
                  <SubmitButton variant="outline">Dejar de atender</SubmitButton>
                </NoticeForm>
              ) : (
                <NoticeForm action={assignConsultationVisitAction} notice="Estás atendiendo al paciente">
                  <input type="hidden" name="visitId" value={visit.id} />
                  <input type="hidden" name="intent" value="claim" />
                  <SubmitButton>
                    {visit.attendingUserId ? "Tomar el relevo" : "Atender a este paciente"}
                  </SubmitButton>
                </NoticeForm>
              )
            ) : null}
          </div>
          <dl className="mt-4 grid gap-x-6 gap-y-3 border-t border-border pt-4 text-sm sm:grid-cols-2">
            <InfoRow label="Motivo de consulta" value={visit.reason} wide />
            <InfoRow label="Desde cuándo" value={symptomDuration} />
            <InfoRow label="Tipo de visita" value={visitIntakeTypeLabels[visit.intakeType]} />
            <InfoRow label="Atención previa por esto" value={yesNoLabel(visit.previouslyTreated)} />
            <InfoRow label="Trae estudios" value={yesNoLabel(visit.bringsStudies)} />
            <InfoRow label="Edad" value={age === null ? "Sin registro" : `${age} años`} />
            <InfoRow label="Alergias" value={visit.patient.allergies} />
            <InfoRow label="Enfermedad de base" value={visit.patient.relevantHistory} />
            <InfoRow label="Medicación actual" value={visit.patient.currentMedication} wide />
          </dl>
        </Card>

        {hasNursingData ? (
          <Card className="max-sm:order-1 border-primary/30 bg-primary/[0.03]">
            <div className="flex items-start gap-2">
              <HeartPulse className="mt-0.5 h-5 w-5 shrink-0 text-primary-dark" aria-hidden="true" />
              <CardHeader
                className="mb-0"
                title="Estudios y procedimientos realizados en Enfermería"
                description={
                  nursingDate
                    ? `Realizados el ${formatDate(nursingDate)}. Lo que el paciente trae desde Enfermería en esta visita.`
                    : "Lo que el paciente trae desde Enfermería en esta visita."
                }
              />
            </div>

            <div className="mt-4 grid gap-4">
              {visit.studies.length > 0 ? (
                <CollapsibleSection
                  title={`Estudios y resultados (${visit.studies.length})`}
                >
                  {visit.studies.map((study) => (
                    <div key={study.id} className="rounded-[9px] border border-border bg-surface p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold text-text">{study.title}</span>
                        <Chip
                          tone={
                            study.status === "performed"
                              ? "success"
                              : study.status === "cancelled"
                                ? "error"
                                : "neutral"
                          }
                          dot
                        >
                          {studyStatusLabels[study.status]}
                        </Chip>
                      </div>
                      <p className="mt-0.5 text-xs tabular-nums text-muted">
                        {studyTypeLabels[study.type]} ·{" "}
                        {formatDateTime(study.performedAt ?? study.createdAt)}
                        {study.recordedBy
                          ? ` · ${study.recordedBy.name ?? study.recordedBy.email}`
                          : ""}
                      </p>
                      {study.resultSummary ? (
                        <p className="mt-2 text-sm text-text">{study.resultSummary}</p>
                      ) : null}
                      {study.findings ? (
                        <p className="mt-1 text-sm text-muted">{study.findings}</p>
                      ) : null}
                      {study.attachments.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {study.attachments.map((file) => (
                            <span
                              key={file.id}
                              className="inline-flex items-center gap-1 rounded-full bg-surface-soft px-2 py-0.5 text-[11px] text-muted"
                            >
                              <Paperclip className="h-3 w-3" aria-hidden="true" />
                              {file.label ?? "Archivo"}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </CollapsibleSection>
              ) : null}

              {visit.vitalSigns.length > 0 ? (
                <CollapsibleSection
                  title={`Signos vitales (${visit.vitalSigns.length}${
                    visit.vitalSigns.length > 1 ? " mediciones" : ""
                  })`}
                >
                  {visit.vitalSigns.map((vs, index) => {
                    // Más recientes primero: la medición más nueva lleva el número mayor.
                    const measurementNumber = visit.vitalSigns.length - index;
                    const values = [
                      vs.temperatureCelsius != null
                        ? ["Temperatura", `${vs.temperatureCelsius} °C`]
                        : null,
                      vs.systolicPressureMmHg != null || vs.diastolicPressureMmHg != null
                        ? ["Presión arterial", `${vs.systolicPressureMmHg ?? "-"}/${vs.diastolicPressureMmHg ?? "-"} mmHg`]
                        : null,
                      vs.heartRateBpm != null
                        ? ["Frecuencia cardíaca", `${vs.heartRateBpm} lpm`]
                        : null,
                      vs.respiratoryRateRpm != null
                        ? ["Frecuencia respiratoria", `${vs.respiratoryRateRpm} rpm`]
                        : null,
                      vs.oxygenSaturation != null
                        ? ["Saturación de oxígeno", `${vs.oxygenSaturation} %`]
                        : null,
                      vs.weightKg != null ? ["Peso", `${vs.weightKg} kg`] : null,
                      vs.heightCm != null ? ["Talla", `${vs.heightCm} cm`] : null
                    ].filter((item): item is [string, string] => item !== null);
                    return (
                      <div key={vs.id} className="overflow-hidden rounded-[9px] border border-border bg-surface">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface-soft px-3 py-2">
                          <span className="inline-flex items-center gap-2">
                            <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold tabular-nums text-primary-dark">
                              {measurementNumber}
                            </span>
                            <span className="text-xs font-semibold text-text">
                              Medición {measurementNumber}
                            </span>
                          </span>
                          <span className="text-xs font-medium tabular-nums text-muted">
                            {formatDateTime(vs.recordedAt)}
                          </span>
                        </div>
                        <div className="p-3">
                          {values.length > 0 ? (
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm tabular-nums text-text">
                              {values.map(([label, value]) => (
                                <span key={label}>
                                  <span className="text-muted">{label}</span> {value}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted">Sin valores registrados.</p>
                          )}
                          {vs.notes ? (
                            <p className="mt-2 text-sm text-muted">{vs.notes}</p>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </CollapsibleSection>
              ) : null}

              {visit.nursingApplications.length > 0 ? (
                <CollapsibleSection
                  title={`Aplicaciones e inyectables (${visit.nursingApplications.length})`}
                >
                  {visit.nursingApplications.map((app) => {
                    const productName = app.inventoryItem?.name ?? null;
                    const title = productName ?? app.medication;
                    const showMedicationDetail =
                      Boolean(productName) && app.medication && app.medication !== productName;
                    const details = [
                      app.quantityUnits != null
                        ? ["Cantidad", `${app.quantityUnits} u`]
                        : null,
                      app.quantity ? ["Dosis", app.quantity] : null,
                      app.route ? ["Vía", app.route] : null
                    ].filter((item): item is [string, string] => item !== null);
                    return (
                      <div key={app.id} className="rounded-[9px] border border-border bg-surface p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-semibold text-text">{title}</span>
                          <span className="text-xs tabular-nums text-muted">
                            {formatDateTime(app.appliedAt)}
                          </span>
                        </div>
                        {showMedicationDetail ? (
                          <p className="mt-0.5 text-sm text-muted">{app.medication}</p>
                        ) : null}
                        {details.length > 0 ? (
                          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-text">
                            {details.map(([label, value]) => (
                              <span key={label}>
                                <span className="text-muted">{label}</span> {value}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        {app.responsible ? (
                          <p className="mt-1 text-xs text-muted">
                            Aplicó: {app.responsible.name ?? app.responsible.email}
                          </p>
                        ) : null}
                        {app.notes ? (
                          <p className="mt-1 text-sm text-muted">{app.notes}</p>
                        ) : null}
                      </div>
                    );
                  })}
                </CollapsibleSection>
              ) : null}

              {visit.serviceSessionUses.length > 0 ? (
                <CollapsibleSection
                  title={`Sueroterapia, ozonoterapia y sesiones (${visit.serviceSessionUses.length})`}
                >
                  {visit.serviceSessionUses.map((use) => (
                    <div key={use.id} className="rounded-[9px] border border-border bg-surface p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold text-text">{use.package.serviceName}</span>
                        <span className="text-xs tabular-nums text-muted">
                          {formatDateTime(use.appliedAt)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-sm text-muted">
                        Sesión {use.sessionNumber}
                        {use.appliedBy
                          ? ` · ${use.appliedBy.name ?? use.appliedBy.email}`
                          : ""}
                      </p>
                      {use.notes ? (
                        <p className="mt-1 text-sm text-muted">{use.notes}</p>
                      ) : null}
                    </div>
                  ))}
                </CollapsibleSection>
              ) : null}

              {visit.nursingNotes.length > 0 ? (
                <section className="grid gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-primary-dark">
                    Notas de enfermería
                  </p>
                  {visit.nursingNotes.map((note) => (
                    <div key={note.id} className="rounded-[9px] border border-border bg-surface p-3">
                      <p className="whitespace-pre-line text-sm text-text">{note.note}</p>
                      <p className="mt-1 text-xs tabular-nums text-muted">
                        {formatDateTime(note.createdAt)}
                        {note.user ? ` · ${note.user.name ?? note.user.email}` : ""}
                      </p>
                    </div>
                  ))}
                </section>
              ) : null}
            </div>
          </Card>
        ) : null}

        {consultationHistory.length > 0 ? (
          <Card className="max-sm:order-2 p-0">
            <details className="group">
              <summary className="focus-ring flex min-h-11 cursor-pointer list-none items-start justify-between gap-3 rounded-[9px] p-[18px] [&::-webkit-details-marker]:hidden">
                <div>
                  <h3 className="text-sm font-semibold text-text">Historial del paciente</h3>
                  <p className="mt-0.5 text-xs text-muted">
                    {consultationHistory.length} visita
                    {consultationHistory.length === 1 ? "" : "s"} anterior
                    {consultationHistory.length === 1 ? "" : "es"} · solo lectura
                  </p>
                </div>
                <ChevronDown
                  className="mt-0.5 size-5 shrink-0 text-muted transition group-open:rotate-180"
                  aria-hidden="true"
                />
              </summary>
              <div className="grid gap-3 border-t border-border p-[18px]">
                {consultationHistory.map((entry) => {
                  const dxPrimary = entry.clinicalConsultation?.diagnoses.find(
                    (dx) => dx.kind === "primary"
                  );
                  const dxSecondary = entry.clinicalConsultation?.diagnoses.find(
                    (dx) => dx.kind === "secondary"
                  );
                  const soldCents = entry.sales.reduce((sum, sale) => sum + sale.totalCents, 0);
                  const rx = entry.prescriptions[0]?.items[0];
                  return (
                    <article
                      key={entry.id}
                      className="rounded-[9px] border border-border p-3 text-sm"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold text-text">
                          {formatDateTime(entry.checkedInAt ?? entry.createdAt)}
                        </span>
                        {soldCents > 0 ? (
                          <span className="tabular-nums text-text">{formatMoney(soldCents)}</span>
                        ) : null}
                      </div>
                      {dxPrimary ? (
                        <p className="mt-1 text-muted">
                          Dx: {dxPrimary.name}
                          {dxSecondary ? ` · ${dxSecondary.name}` : ""}
                        </p>
                      ) : (
                        <p className="mt-1 text-muted">Sin diagnóstico registrado.</p>
                      )}
                      {entry.clinicalConsultation?.treatmentPlanText ? (
                        <p className="mt-1 text-muted">
                          Plan: {entry.clinicalConsultation.treatmentPlanText}
                        </p>
                      ) : null}
                      {entry.sales.length > 0 ? (
                        <ul className="mt-1 grid gap-0.5 text-muted">
                          {entry.sales.flatMap((sale) =>
                            sale.items.map((saleItem) => (
                              <li key={saleItem.id} className="tabular-nums">
                                {saleItem.description} · {saleItem.quantity} ×{" "}
                                {formatMoney(saleItem.unitPriceCents)}
                              </li>
                            ))
                          )}
                        </ul>
                      ) : null}
                      {entry.serviceSessionPackages.map((pkg) => (
                        <p key={pkg.id} className="mt-1 tabular-nums text-muted">
                          {pkg.serviceName} ({serviceSessionPricingModeLabels[pkg.pricingMode]}):{" "}
                          {pkg.sessionsUsed}/{pkg.totalSessions} sesiones ·{" "}
                          {formatServiceSessionMoney(pkg.totalPaidCents)}
                        </p>
                      ))}
                      {rx ? (
                        <p className="mt-1 text-muted">
                          Receta: {rx.medication}
                          {[rx.dose, rx.frequency, rx.duration].filter(Boolean).length > 0
                            ? ` · ${[rx.dose, rx.frequency, rx.duration].filter(Boolean).join(" · ")}`
                            : ""}
                        </p>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </details>
          </Card>
        ) : null}

        <Card className="max-sm:order-3 p-0">
          <details className="group">
            <summary className="focus-ring flex min-h-11 cursor-pointer list-none items-start justify-between gap-3 rounded-[9px] p-[18px] [&::-webkit-details-marker]:hidden">
              <div>
                <h3 className="text-sm font-semibold text-text">Consulta médica</h3>
                <p className="mt-0.5 text-xs text-muted">
                  {visit.clinicalConsultation?.status === "finalized"
                    ? "Registro aprobado. Los cambios posteriores crean otra versión."
                    : "Guarda el borrador y finalízalo cuando esté completo."}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Chip
                  tone={
                    visit.clinicalConsultation?.status === "finalized"
                      ? "success"
                      : "warning"
                  }
                  dot
                >
                  {visit.clinicalConsultation
                    ? clinicalRecordStatusLabels[
                        visit.clinicalConsultation.status
                      ]
                    : "Sin guardar"}
                </Chip>
                <ChevronDown
                  className="h-4 w-4 shrink-0 text-muted transition-transform group-open:rotate-180"
                  aria-hidden="true"
                />
              </div>
            </summary>
            <div className="border-t border-border p-[18px]">

          {visit.clinicalConsultation?.status !== "finalized" &&
          canWriteClinical ? (
            <>
              <NoticeForm
                action={saveClinicalConsultationAction}
                notice="Consulta guardada"
                className="grid gap-4"
              >
                <input type="hidden" name="visitId" value={visit.id} />
                <input
                  type="hidden"
                  name="expectedRevision"
                  value={visit.clinicalConsultation?.revision ?? 0}
                />
                <input
                  type="hidden"
                  name="motive"
                  value={consultationMotive}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Diagnóstico principal">
                    <input
                      className={internalInputClassName}
                      name="primaryDiagnosis"
                      defaultValue={primaryDiagnosis?.name}
                      required
                    />
                  </Field>
                  <Field label="Diagnóstico secundario">
                    <input
                      className={internalInputClassName}
                      name="secondaryDiagnosis"
                      defaultValue={secondaryDiagnosis?.name}
                    />
                  </Field>
                </div>
                <Field label="Hallazgos">
                  <textarea
                    className={`${internalInputClassName} min-h-24 py-3`}
                    name="findings"
                    defaultValue={
                      visit.clinicalConsultation?.findings ?? ""
                    }
                  />
                </Field>
                <Field label="Observaciones">
                  <textarea
                    className={`${internalInputClassName} min-h-24 py-3`}
                    name="observations"
                    defaultValue={
                      visit.clinicalConsultation?.observations ?? ""
                    }
                  />
                </Field>
                <Field label="Plan de tratamiento">
                  <textarea
                    className={`${internalInputClassName} min-h-28 py-3`}
                    name="treatmentPlanText"
                    defaultValue={
                      visit.clinicalConsultation?.treatmentPlanText ?? ""
                    }
                  />
                </Field>
                <Field label="Indicaciones">
                  <IndicationField
                    name="indications"
                    defaultValue={visit.clinicalConsultation?.indications ?? ""}
                    catalog={indicationCatalog}
                  />
                </Field>

                <CollapsibleSection
                  title="Evolución"
                  description="Agregar una nota solo cuando corresponda documentar evolución."
                  defaultOpen={visit.clinicalEvolutions.length > 0}
                >
                  <Field label="Nota de evolución">
                    <textarea
                      className={`${internalInputClassName} min-h-24 py-3`}
                      name="evolutionNote"
                    />
                  </Field>
                </CollapsibleSection>

                <CollapsibleSection
                  title="Receta"
                  description="Agrega los medicamentos indicados, cada uno con su frecuencia y duración."
                  defaultOpen={currentPrescriptionItems.length > 0}
                >
                  <PrescriptionEditor
                    medications={medicationOptions}
                    previousItems={previousPrescriptionItems}
                    initialItems={currentPrescriptionItems}
                  />
                </CollapsibleSection>
                <FormActions className="justify-end">
                  <SubmitButton>Guardar borrador</SubmitButton>
                </FormActions>
              </NoticeForm>

              {visit.clinicalConsultation && canFinalizeClinical ? (
                <ConfirmForm
                  action={finalizeClinicalConsultationAction}
                  notice="Consulta finalizada"
                  confirmTitle="Finalizar y firmar consulta"
                  confirmDescription="Después de confirmar, la consulta ya no podrá editarse como borrador. Cualquier cambio exigirá una corrección con motivo."
                  confirmLabel="Finalizar consulta"
                  confirmAtAllWidths
                  className="mt-4 border-t border-border pt-4"
                >
                  <input
                    type="hidden"
                    name="visitId"
                    value={visit.id}
                  />
                  <input
                    type="hidden"
                    name="consultationId"
                    value={visit.clinicalConsultation.id}
                  />
                  <input
                    type="hidden"
                    name="expectedRevision"
                    value={visit.clinicalConsultation.revision}
                  />
                  <SubmitButton variant="outline" className="w-full">
                    Finalizar y firmar consulta
                  </SubmitButton>
                </ConfirmForm>
              ) : null}
            </>
          ) : visit.clinicalConsultation ? (
            <div className="grid gap-4">
              <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                <InfoRow
                  label="Motivo de consulta"
                  value={visit.clinicalConsultation.motive}
                  wide
                />
                <InfoRow
                  label="Diagnóstico principal"
                  value={primaryDiagnosis?.name}
                />
                <InfoRow
                  label="Diagnóstico secundario"
                  value={secondaryDiagnosis?.name}
                />
                <InfoRow
                  label="Hallazgos"
                  value={visit.clinicalConsultation.findings}
                  wide
                />
                <InfoRow
                  label="Observaciones"
                  value={visit.clinicalConsultation.observations}
                  wide
                />
                <InfoRow
                  label="Plan de tratamiento"
                  value={visit.clinicalConsultation.treatmentPlanText}
                  wide
                />
                <InfoRow
                  label="Indicaciones"
                  value={visit.clinicalConsultation.indications}
                  wide
                />
              </dl>

              {prescriptionItem || visit.clinicalEvolutions.length > 0 ? (
                <div className="grid gap-2 border-t border-border pt-4">
                  {prescriptionItem ? (
                    <div className="rounded-[9px] border border-border px-3 py-2.5 text-sm">
                      <p className="font-semibold text-text">
                        Receta: {prescriptionItem.medication}
                      </p>
                      <p className="mt-1 text-muted">
                        {[
                          prescriptionItem.dose,
                          prescriptionItem.frequency,
                          prescriptionItem.duration
                        ]
                          .filter(Boolean)
                          .join(" · ") || "Sin detalle adicional"}
                      </p>
                    </div>
                  ) : null}
                  {visit.clinicalEvolutions.map((evolution) => (
                    <div
                      key={evolution.id}
                      className="rounded-[9px] border border-border px-3 py-2.5 text-sm"
                    >
                      <p className="font-semibold text-text">Evolución</p>
                      <p className="mt-1 text-muted">{evolution.note}</p>
                      <p className="mt-1 text-xs tabular-nums text-muted">
                        {formatDateTime(evolution.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="rounded-[9px] border border-border bg-background px-3 py-2.5 text-sm">
                <p className="font-semibold text-text">
                  Versión {visit.clinicalConsultation.revision}
                </p>
                <p className="mt-1 text-muted">
                  {visit.clinicalConsultation.finalizedAt
                    ? `Finalizada ${formatDateTime(
                        visit.clinicalConsultation.finalizedAt
                      )} por ${
                        visit.clinicalConsultation.finalizedBy?.name ??
                        visit.clinicalConsultation.finalizedBy?.email ??
                        "usuario no disponible"
                      }`
                    : "Este registro continúa como borrador."}
                </p>
              </div>

              <Link
                href={`/sigeco/consultas/${visit.id}/historial`}
                className="focus-ring inline-flex min-h-11 items-center justify-center rounded-[9px] border border-border px-4 text-sm font-semibold text-text hover:border-primary/40 hover:text-primary-dark"
              >
                Ver historial y comparar versiones
              </Link>

              {visit.clinicalConsultation.status === "finalized" &&
              canCorrectClinical ? (
                <CollapsibleSection
                  title="Corregir consulta finalizada"
                  description="Crea otra versión y conserva intacta la anterior."
                >
                  <ClinicalConsultationCorrectionForm
                    visitId={visit.id}
                    consultationId={visit.clinicalConsultation.id}
                    expectedRevision={visit.clinicalConsultation.revision}
                    snapshot={clinicalSnapshot}
                  />
                </CollapsibleSection>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted">
              Todavía no existe una consulta guardada.
            </p>
          )}
            </div>
          </details>
        </Card>

        {visit.clinicalConsultation?.status === "finalized" &&
        prescriptionItem ? (
          <div id="documentos-receta" className="max-sm:order-4">
            <Card>
              <CardHeader
                title="Receta para entregar"
                description="Se genera desde la receta clínica vigente; no permite escribir datos distintos en el documento."
              />
              {canWriteClinical ? (
                <form action={generatePrescriptionDocumentAction}>
                  <input type="hidden" name="visitId" value={visit.id} />
                  <SubmitButton className="w-full sm:w-auto">
                    {prescriptionDocuments.length > 0
                      ? "Comprobar y emitir versión vigente"
                      : "Emitir primera versión"}
                  </SubmitButton>
                </form>
              ) : null}

              <div className="mt-4 grid gap-2">
                {prescriptionDocuments.map((document) => (
                  <Link
                    key={document.id}
                    className="focus-ring flex min-h-11 flex-wrap items-center justify-between gap-2 rounded-[9px] border border-border px-3 py-2 text-sm hover:border-primary/40"
                    href={`/sigeco/consultas/${visit.id}/recetas/${document.id}`}
                  >
                    <span className="font-semibold text-text">
                      Versión {document.version}
                    </span>
                    <span className="tabular-nums text-muted">
                      {document.documentNumber} ·{" "}
                      {formatDateTime(document.generatedAt)}
                    </span>
                  </Link>
                ))}
                {prescriptionDocuments.length === 0 ? (
                  <p className="text-sm text-muted">
                    Todavía no se emitió una versión para imprimir o descargar.
                  </p>
                ) : null}
              </div>

              {canCorrectClinical && prescriptionDocuments.length > 0 ? (
                <CollapsibleSection
                  title="Corregir receta emitida"
                  description="Crea una nueva receta clínica y una nueva versión del documento. La anterior queda intacta."
                  className="mt-4"
                >
                  <form
                    id="corregir-receta"
                    action={correctPrescriptionAction}
                    className="grid gap-3"
                  >
                    <input type="hidden" name="visitId" value={visit.id} />
                    <Field label="Motivo de la corrección">
                      <textarea
                        className={`${internalInputClassName} min-h-20 py-3`}
                        name="reason"
                        required
                      />
                    </Field>
                    <Field label="Medicamento o tratamiento">
                      <input
                        className={internalInputClassName}
                        name="medication"
                        defaultValue={prescriptionItem.medication}
                        required
                      />
                    </Field>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <Field label="Dosis">
                        <input
                          className={internalInputClassName}
                          name="dose"
                          defaultValue={prescriptionItem.dose ?? ""}
                        />
                      </Field>
                      <Field label="Frecuencia">
                        <input
                          className={internalInputClassName}
                          name="frequency"
                          defaultValue={prescriptionItem.frequency ?? ""}
                        />
                      </Field>
                      <Field label="Duración">
                        <input
                          className={internalInputClassName}
                          name="duration"
                          defaultValue={prescriptionItem.duration ?? ""}
                        />
                      </Field>
                    </div>
                    <Field label="Observaciones">
                      <textarea
                        className={`${internalInputClassName} min-h-20 py-3`}
                        name="observations"
                        defaultValue={prescriptionItem.observations ?? ""}
                      />
                    </Field>
                    <SubmitButton className="w-full sm:w-auto">
                      Guardar corrección y emitir nueva versión
                    </SubmitButton>
                  </form>
                </CollapsibleSection>
              ) : null}
            </Card>
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 max-sm:contents xl:sticky xl:top-0 xl:max-h-[calc(100dvh-6.5rem)] xl:overflow-y-auto xl:overscroll-contain xl:pr-1">
        <DesktopDetailContext
          eyebrow={visit.patient.internalCode}
          title={visit.patient.fullName}
          meta={visit.patient.phone}
          status={<VisitStatusPill status={visit.status} />}
        />
        {areaTiming?.area === "medico" &&
        roleHasPermission(user.role, "area_time_write") ? (
          <AreaTimeControl state={areaTiming} compact hideStartAttention />
        ) : null}

        {canWriteClinical ? (
          <Card className="max-sm:order-2">
            <CardHeader
              title="Derivar al paciente"
              description="Enfermería: estudios y servicios que se ejecutan ahí (pago previo). Administración: tratamientos, productos y consultas para cobrar. El médico no cobra."
            />
            {canDerivePatient ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <PaidStudyOrderDialog
                  visitId={visit.id}
                  action={createPaidStudyOrderAction}
                  studies={nursingOptions}
                />
                <AdministrationOrderDialog
                  visitId={visit.id}
                  action={saveDoctorOrderAction}
                  options={administrationOptions}
                />
              </div>
            ) : (
              <p className="text-sm text-muted">
                La visita ya no está activa para derivar.
              </p>
            )}

            {doctorOrder && doctorOrder.lines.length > 0 ? (
              <div className="mt-4 border-t border-border pt-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                    Pedido a Administración
                  </span>
                  <Chip
                    tone={
                      doctorOrder.status === "confirmed"
                        ? "success"
                        : doctorOrder.status === "submitted"
                          ? "primary"
                          : "neutral"
                    }
                    dot
                  >
                    {doctorOrderStatusLabels[doctorOrder.status]}
                  </Chip>
                </div>
                <div className="grid gap-1.5">
                  {doctorOrder.lines.map((line) => (
                    <div
                      key={line.id}
                      className="flex flex-wrap justify-between gap-2 text-sm text-muted"
                    >
                      <span>
                        {doctorOrderLineSourceLabels[line.source]} · {line.description} ×{" "}
                        {line.quantity}
                      </span>
                      <span className="tabular-nums text-text">
                        {formatDoctorOrderMoney(doctorOrderLineTotalCents(line))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </Card>
        ) : null}

        <Card className="max-sm:order-2">
          <CardHeader
            title="Resultado de la propuesta"
            description="El médico registra la respuesta después de explicar el tratamiento."
          />

          {latestProposalOutcome ? (
            <div className="mb-4 rounded-[9px] border border-border bg-background p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Chip
                  tone={
                    latestProposalOutcome.status === "accepted"
                      ? "success"
                      : latestProposalOutcome.status === "rejected"
                        ? "warning"
                        : "neutral"
                  }
                  dot
                >
                  {
                    treatmentProposalOutcomeStatusLabels[
                      latestProposalOutcome.status
                    ]
                  }
                </Chip>
                <span className="text-xs tabular-nums text-muted">
                  {formatDateTime(latestProposalOutcome.decidedAt)}
                </span>
              </div>
              <p className="mt-2 text-sm font-semibold text-text">
                {
                  treatmentProposalOutcomeReasonLabels[
                    latestProposalOutcome.reason
                  ]
                }
              </p>
              <p className="mt-1 text-xs text-muted">
                Registrado por{" "}
                {latestProposalOutcome.doctor?.name ??
                  latestProposalOutcome.doctor?.email ??
                  "Médico"}
              </p>
              {latestProposalOutcome.note ? (
                <p className="mt-2 text-sm text-muted">
                  {latestProposalOutcome.note}
                </p>
              ) : null}

              {latestProposalOutcome.administrationOrder?.workItem ? (
                <div className="mt-3 border-t border-border pt-3 text-sm">
                  <a
                    href={`/sigeco/administracion/${latestProposalOutcome.administrationOrder.workItem.id}`}
                    className="font-semibold text-primary-dark hover:underline"
                  >
                    Ver instrucción enviada a Administración
                  </a>
                  <p className="mt-1 text-muted">
                    {proposalSale
                      ? `Venta ${formatMoney(proposalSale.totalCents)} · Cobrado ${formatMoney(proposalSale.paidCents)} · Saldo ${formatMoney(proposalSale.balanceCents)}`
                      : "Todavía no se registró una venta."}
                  </p>
                </div>
              ) : null}

              {latestProposalOutcome.status === "needs_time" ? (
                <p className="mt-3 border-t border-border pt-3 text-sm text-muted">
                  {latestProposalOutcome.followUpTask
                    ? "Seguimiento creado para Recepción/Marlen."
                    : "No se creó seguimiento porque no había consentimiento vigente."}
                </p>
              ) : null}

              {visit.treatmentProposalOutcomes.length > 1 ? (
                <details className="mt-3 border-t border-border pt-3">
                  <summary className="cursor-pointer text-sm font-semibold text-primary-dark">
                    Ver decisiones anteriores
                  </summary>
                  <div className="mt-2 grid gap-2">
                    {visit.treatmentProposalOutcomes
                      .slice(1)
                      .map((outcome) => (
                        <div
                          key={outcome.id}
                          className="rounded-[7px] border border-border px-3 py-2 text-sm"
                        >
                          <div className="flex flex-wrap justify-between gap-2">
                            <span className="font-semibold text-text">
                              {
                                treatmentProposalOutcomeStatusLabels[
                                  outcome.status
                                ]
                              }
                            </span>
                            <span className="text-xs tabular-nums text-muted">
                              {formatDateTime(outcome.decidedAt)}
                            </span>
                          </div>
                          <p className="mt-1 text-muted">
                            {
                              treatmentProposalOutcomeReasonLabels[
                                outcome.reason
                              ]
                            }
                          </p>
                        </div>
                      ))}
                  </div>
                </details>
              ) : null}
            </div>
          ) : (
            <p className="mb-4 text-sm text-muted">
              Todavía no se registró qué decidió el paciente.
            </p>
          )}

          {canRecordProposal ? (
            <TreatmentProposalOutcomeForm
              visitId={visit.id}
              followUpConsentGranted={followUpConsentGranted}
            />
          ) : latestProposalOutcome?.status === "accepted" ? (
            <p className="text-sm text-muted">
              La decisión aceptada quedó cerrada después de enviar la
              instrucción a Administración.
            </p>
          ) : !visit.clinicalConsultation ? (
            <p className="text-sm text-warning">
              Guarda primero la consulta y el plan explicado al paciente.
            </p>
          ) : visit.clinicalConsultation.status === "draft" ? (
            <p className="text-sm text-warning">
              Finaliza y firma la consulta antes de registrar la decisión del
              paciente.
            </p>
          ) : null}
        </Card>

        {canWriteClinical ? (
          <Card className="max-sm:order-2">
            <CardHeader
              title="Agendar seguimiento (Recepción)"
              description="El médico agenda un seguimiento a Recepción con fecha, hora y motivo. Solo cuando hay una venta registrada en la visita."
            />
            {latestVisitSale ? (
              <form action={createDoctorVisitFollowUpAction} className="grid gap-3">
                <input type="hidden" name="visitId" value={visit.id} />
                <input type="hidden" name="patientId" value={visit.patient.id} />
                {!followUpConsentGranted ? (
                  <p className="rounded-[9px] border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
                    Sin consentimiento vigente para contactar. El seguimiento se
                    agenda, pero Recepción no podrá contactar hasta que exista
                    consentimiento.
                  </p>
                ) : null}
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Tipo de seguimiento">
                    <select className={internalInputClassName} name="type" defaultValue="return">
                      <option value="return">{followUpTypeLabels.return}</option>
                      <option value="evolution">{followUpTypeLabels.evolution}</option>
                      <option value="treatment_recovery">
                        {followUpTypeLabels.treatment_recovery}
                      </option>
                    </select>
                  </Field>
                  <Field label="Fecha y hora">
                    <input
                      className={internalInputClassName}
                      type="datetime-local"
                      name="dueAt"
                      required
                    />
                  </Field>
                </div>
                <Field label="Motivo">
                  <input
                    className={internalInputClassName}
                    name="title"
                    placeholder="Ej. Confirmar evolución del tratamiento"
                    required
                  />
                </Field>
                <Field label="Notas (opcional)">
                  <textarea className={`${internalInputClassName} min-h-20 py-3`} name="notes" />
                </Field>
                <FormActions className="justify-end">
                  <SubmitButton>Agendar seguimiento</SubmitButton>
                </FormActions>
              </form>
            ) : (
              <p className="text-sm text-muted">
                Solo puedes agendar seguimiento cuando haya una venta registrada de
                tratamiento o servicio en esta visita.
              </p>
            )}
          </Card>
        ) : null}

        {visit.status === "in_consultation" ? (
          <Card className="max-sm:order-3">
            <CardHeader
              title="Salida del paciente"
              description="Al terminar la consulta el paciente puede seguir a otra área o irse."
            />
            <div className="grid gap-2">
              {visit.clinicalConsultation?.status === "finalized" ? (
                <ConfirmForm
                  action={applyVisitFlowAction}
                  notice="Visita cerrada"
                  confirmTitle="Cerrar visita"
                  confirmDescription={`La visita de ${visit.patient.fullName} quedará completada y saldrá de las bandejas activas. Esta acción no se puede deshacer.`}
                  confirmLabel="Cerrar visita"
                >
                  <input type="hidden" name="visitId" value={visit.id} />
                  <input type="hidden" name="flow" value="complete" />
                  <input
                    type="hidden"
                    name="note"
                    value="Salida directa después de la consulta"
                  />
                  <SubmitButton variant="outline" className="w-full">
                    Se va — cerrar visita
                  </SubmitButton>
                </ConfirmForm>
              ) : (
                <p className="rounded-[9px] border border-warning/30 bg-warning/10 px-3 py-2.5 text-sm text-text">
                  Para cerrar la atención, primero guarda, revisa y finaliza la
                  consulta.
                </p>
              )}
              {canRecordDiscontinuation ? (
                <VisitDiscontinuationForm
                  visitId={visit.id}
                  patientName={visit.patient.fullName}
                  defaultPendingTypes={
                    visit.clinicalConsultation ? [] : ["consultation"]
                  }
                  compact
                />
              ) : null}
            </div>
          </Card>
        ) : null}

        <Card className="max-sm:order-4">
          <CollapsibleSection
            title="Indicación para otra área"
            description="Crear una orden solo si otra área debe intervenir."
            defaultOpen={visit.clinicalOrders.length > 0}
            className="border-0 bg-transparent open:bg-transparent"
          >
          <NoticeForm action={createClinicalOrderAction} notice="Indicación creada" className="grid gap-3">
            <input type="hidden" name="visitId" value={visit.id} />
            <Field label="Tipo">
              <select className={internalInputClassName} name="type" defaultValue="serum">
                {orderTypeOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Área destino">
              <select className={internalInputClassName} name="targetArea" defaultValue="enfermeria">
                {targetAreaOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Indicación">
              <input
                className={internalInputClassName}
                name="title"
                placeholder="Aplicar suero ABC"
                required
              />
            </Field>
            <Field label="Detalle">
              <textarea className={`${internalInputClassName} min-h-24 py-3`} name="details" />
            </Field>
            <SubmitButton variant="outline">Crear indicación</SubmitButton>
          </NoticeForm>
          </CollapsibleSection>
        </Card>

        <Card className="max-sm:order-5">
          <CardHeader
            title="Órdenes clínicas emitidas"
            description="Indicaciones enviadas a otras áreas durante esta visita."
          />
          <div className="grid gap-0">
            {visit.clinicalOrders.map((order) => (
              <TimelineItem
                key={order.id}
                title={order.title}
                meta={`${clinicalOrderTypeLabels[order.type]} · ${routeAreaLabels[order.targetArea]}`}
                aside={clinicalOrderStatusLabels[order.status]}
                body={order.details ?? undefined}
              />
            ))}
            {visit.clinicalOrders.length === 0 ? (
              <p className="py-2 text-sm text-muted">Sin órdenes clínicas para otras áreas.</p>
            ) : null}
          </div>
        </Card>

      </div>
    </div>
  );
}
