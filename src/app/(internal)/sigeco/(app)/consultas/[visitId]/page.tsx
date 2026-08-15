import { ActionErrorToast } from "@/components/internal/ActionErrorToast";
import { AnnulPrescriptionButton } from "@/components/internal/generated-documents/AnnulPrescriptionButton";
import { AreaTimeInline } from "@/components/internal/area-times/AreaTimeInline";
import { ClinicalConsultationFields } from "@/components/internal/ClinicalConsultationFields";
import { ChipRadio } from "@/components/internal/ui/ChipRadio";
import { ConfirmForm } from "@/components/internal/ConfirmForm";
import { DateTimePickerField } from "@/components/internal/ui/DatePickerField";
import { Field, internalInputClassName } from "@/components/internal/Field";
import { MobileBackLink } from "@/components/internal/MobileBackLink";
import { NoticeForm } from "@/components/internal/NoticeForm";
import { PaidStudyOrderDialog } from "@/components/internal/PaidStudyOrderDialog";
import { PrescriptionEditor } from "@/components/internal/PrescriptionEditor";
import { VisitStatusPill } from "@/components/internal/StatusPill";
import { SubmitButton } from "@/components/internal/SubmitButton";
import { Card, CardHeader } from "@/components/internal/ui/Card";
import { Chip } from "@/components/internal/ui/Chip";
import { CollapsibleSection } from "@/components/internal/ui/CollapsibleSection";
import { FormActions } from "@/components/internal/ui/FormActions";
import { InfoRow } from "@/components/internal/ui/InfoRow";
import { VisitDiscontinuationForm } from "@/components/internal/visit-discontinuations/VisitDiscontinuationForm";
import { getBranchContext } from "@/features/branches/context";
import {
  assignConsultationVisitAction,
  createPaidStudyOrderAction,
  finalizeClinicalConsultationAction,
  saveClinicalConsultationAction
} from "@/features/clinical-care/actions";
import {
  PatientVisitHistoryDialog,
  type VisitHistoryEntry
} from "@/features/clinical-care/components/PatientVisitHistoryDialog";
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
import { symptomDurationUnitLabels, visitIntakeTypeLabels } from "@/features/reception/labels";
import {
  formatServiceSessionMoney,
  serviceSessionPricingModeLabels
} from "@/features/service-sessions/labels";
import { studyStatusLabels, studyTypeLabels } from "@/features/studies/labels";
import { formatDate, formatDateTime } from "@/lib/dates";
import { getVisitAreaTimingState } from "@/modules/database/queries/area-times";
import {
  getClinicalNoteCatalogs,
  getClinicalVisitById,
  getDiagnosisCatalog,
  getIndicationCatalog,
  getMedicationOptions,
  getPatientConsultationHistory,
  getPatientPreviousPrescriptionItems,
  getVisitCurrentPrescriptionItems
} from "@/modules/database/queries/clinical-care";
import {
  getDoctorOrderByVisit,
  getDoctorOrderOptions
} from "@/modules/database/queries/doctor-orders";
import { getActiveStudyCatalogItems } from "@/modules/database/queries/service-catalog";
import { getPrescriptionDocuments } from "@/modules/generated-documents/service";
import { requirePermission } from "@/modules/permissions";
import type { SaleItemType } from "@/generated/prisma/client";
import { ChevronDown, HeartPulse, Paperclip } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

// Horarios de la clínica para agendar seguimientos: cada hora de 08:00 a 20:00.
const followUpTimeSlots = Array.from({ length: 13 }, (_, index) => {
  return `${String(8 + index).padStart(2, "0")}:00`;
});

// Medio de contacto que el paciente indicó en el registro (funnel de Recepción).
const contactPreferenceLabels: Record<string, string> = {
  whatsapp: "WhatsApp",
  call: "Llamada",
  both: "WhatsApp y llamada",
  no_contact: "No desea contacto",
  unknown: "Sin especificar"
};

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

// Ordinales femeninos para "Resumen 1ra Visita". Del undécimo en adelante se usa
// la forma corta (11ª), que se sigue leyendo bien y evita inventar sufijos.
const feminineOrdinals = [
  "1ra",
  "2da",
  "3ra",
  "4ta",
  "5ta",
  "6ta",
  "7ma",
  "8va",
  "9na",
  "10ma"
];

function visitOrdinal(position: number) {
  return feminineOrdinals[position - 1] ?? `${position}ª`;
}

/** Encabezados en plural para agrupar lo vendido por tipo dentro del resumen. */
const saleItemGroupLabels: Record<SaleItemType, string> = {
  treatment: "Tratamientos",
  medication: "Medicamentos",
  resonance: "Resonancias",
  serum: "Sueros",
  service: "Servicios",
  study: "Estudios",
  product: "Productos",
  other: "Otros"
};

const saleItemGroupOrder: SaleItemType[] = [
  "treatment",
  "service",
  "serum",
  "product",
  "medication",
  "study",
  "resonance",
  "other"
];

// Enlaza un medicamento escrito a mano con un producto del inventario: minúsculas,
// sin tildes y sin espacios repetidos. Solo se usa para coincidencias exactas.
function normalizeMedicationName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ");
}

function yesNoLabel(value: boolean | null) {
  if (value === null) return "Sin registro";
  return value ? "Sí" : "No";
}

function pageErrorMessage(error: string) {
  const messages: Record<string, string> = {
    "consulta-invalida": "Revisa los datos obligatorios de la consulta.",
    "receta-duplicada":
      "No puedes recetar el mismo medicamento dos veces. Quita el repetido antes de guardar.",
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
    "correccion-receta-duplicada":
      "Uno de los medicamentos que agregaste ya está en la receta. Quítalo antes de guardar.",
    "anulacion-invalida":
      "No se pudo cambiar el estado de la versión. Inténtalo de nuevo.",
    "receta-anulada-vigente":
      "La versión vigente fue anulada. Corrige la receta (agrega o ajusta un medicamento) para emitir una nueva.",
    "seguimiento-invalido":
      "Revisa el motivo, la fecha y la hora del seguimiento.",
    "seguimiento-fecha-pasada":
      "La fecha del seguimiento debe ser a futuro. Elige hoy o un día posterior.",
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
    indicationCatalog,
    diagnosisCatalog,
    clinicalNoteCatalogs
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
      getIndicationCatalog(),
      getDiagnosisCatalog(),
      getClinicalNoteCatalogs()
    ]);

  if (!visit) notFound();
  if (visit.branchCode !== activeBranch.code) notFound();

  const consultationHistory = await getPatientConsultationHistory(visit.patient.id, visit.id);
  const previousPrescriptionItems = await getPatientPreviousPrescriptionItems(
    visit.patient.id,
    visit.id
  );

  // Resumen de cada visita anterior para el modal del médico: qué se le hizo, qué
  // se le vendió (agrupado por tipo) y cuánto se le cobró. Las ventas anuladas no
  // suman dinero. La numeración es cronológica real: la más antigua es la 1ra.
  const visitHistorySummaries: VisitHistoryEntry[] = consultationHistory.visits.map(
    (entry, indexFromNewest) => {
      const position = consultationHistory.totalCount - indexFromNewest;
      const sales = entry.sales.filter((sale) => sale.status !== "cancelled");
      const linesByType = new Map<SaleItemType, VisitHistoryEntry["groups"][number]["lines"]>();
      for (const sale of sales) {
        for (const item of sale.items) {
          const lines = linesByType.get(item.type) ?? [];
          lines.push({
            id: item.id,
            description: item.description,
            quantity: item.quantity,
            unitPriceCents: item.unitPriceCents,
            totalCents: item.totalCents
          });
          linesByType.set(item.type, lines);
        }
      }
      const groups = saleItemGroupOrder
        .filter((type) => linesByType.has(type))
        .map((type) => {
          const lines = linesByType.get(type) ?? [];
          return {
            label: saleItemGroupLabels[type],
            lines,
            totalCents: lines.reduce((sum, line) => sum + line.totalCents, 0)
          };
        });

      return {
        id: entry.id,
        ordinal: visitOrdinal(position),
        dateLabel: formatDateTime(entry.checkedInAt ?? entry.createdAt),
        reason: entry.clinicalConsultation?.motive ?? entry.reason ?? undefined,
        diagnoses: (entry.clinicalConsultation?.diagnoses ?? []).map(
          (diagnosis) => diagnosis.name
        ),
        treatmentPlan: entry.clinicalConsultation?.treatmentPlanText ?? undefined,
        indications: entry.clinicalConsultation?.indications ?? undefined,
        groups,
        sessions: entry.serviceSessionPackages.map((pkg) => ({
          id: pkg.id,
          label: `${pkg.serviceName} (${serviceSessionPricingModeLabels[pkg.pricingMode]})`,
          detail: `${pkg.sessionsUsed}/${pkg.totalSessions} sesiones · ${formatServiceSessionMoney(pkg.totalPaidCents)}`
        })),
        prescription: (entry.prescriptions[0]?.items ?? []).map((item) => ({
          id: item.id,
          label: item.medication,
          detail:
            [item.dose, item.frequency, item.duration].filter(Boolean).join(" · ") || undefined
        })),
        totalCents: sales.reduce((sum, sale) => sum + sale.totalCents, 0),
        pendingCents: sales.reduce((sum, sale) => sum + sale.balanceCents, 0)
      };
    }
  );

  const primaryDiagnosis = visit.clinicalConsultation?.diagnoses.find((item) => item.kind === "primary");
  const secondaryDiagnosis = visit.clinicalConsultation?.diagnoses.find((item) => item.kind === "secondary");
  const prescriptionItem = visit.prescriptions[0]?.items[0];
  const age = calculatePatientAge(visit.patient.birthDate);
  const symptomDuration =
    visit.symptomDurationValue && visit.symptomDurationUnit
      ? `${visit.symptomDurationValue} ${symptomDurationUnitLabels[visit.symptomDurationUnit].toLocaleLowerCase("es-BO")}`
      : "Sin registro";
  const consultationMotive = visit.clinicalConsultation?.motive ?? visit.reason ?? "Sin motivo registrado";
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
  // Cronómetro del área: solo aplica cuando la visita está en Médico y el usuario
  // puede registrar tiempos. Acompaña la cabecera del paciente, sin tarjeta propia.
  const medicoAreaTiming =
    areaTiming?.area === "medico" && roleHasPermission(user.role, "area_time_write")
      ? areaTiming
      : null;
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
  // Los medicamentos de la receta vigente llegan marcados en el modal de derivación
  // para que el médico solo confirme la cantidad. Se enlazan por `inventoryItemId`
  // y, si el ítem se escribió libre, por nombre exacto normalizado contra el
  // inventario. Los que no tienen producto (ej. recetados para farmacia externa)
  // se ofrecen aparte como línea de texto libre, para que no se pierdan en silencio.
  const prescribedMatch = (() => {
    const productsByName = new Map(
      doctorOrderOptions.productOptions.map((option) => [
        normalizeMedicationName(option.label),
        option.inventoryItemId
      ])
    );
    const productIds = new Set(
      doctorOrderOptions.productOptions.map((option) => option.inventoryItemId)
    );
    const productIdsFound: string[] = [];
    const withoutProduct: string[] = [];
    for (const item of currentPrescriptionItems) {
      const matchedId =
        item.inventoryItemId && productIds.has(item.inventoryItemId)
          ? item.inventoryItemId
          : productsByName.get(normalizeMedicationName(item.medication));
      if (matchedId) productIdsFound.push(matchedId);
      else if (item.medication.trim()) withoutProduct.push(item.medication.trim());
    }
    return {
      productIds: [...new Set(productIdsFound)],
      withoutProduct: [...new Set(withoutProduct)]
    };
  })();
  // Enfermería: estudios + servicios que se ejecutan en enfermería.
  const nursingOptions = [
    ...studyCatalogItems.map((study) => ({
      id: study.id,
      label: study.name,
      referenceCents: study.basePriceCents,
      capCents: study.ownMaxDiscountCents,
      group: "Estudios"
    })),
    ...doctorOrderOptions.catalogOptions
      .filter((option) => option.source === "service" && option.requiresNursing)
      .map((option) => ({
        id: option.catalogItemId,
        label: option.label,
        referenceCents: option.packagePriceCents ?? option.unitPriceCents,
        capCents: option.perUnitCapCents,
        group: "Servicios de enfermería"
      }))
  ];
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
          <ActionErrorToast message={pageErrorMessage(query.error)} />
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
                  : query.aviso === "receta-anulada"
                    ? "La versión de la receta quedó anulada."
                    : query.aviso === "receta-habilitada"
                      ? "La versión de la receta quedó habilitada."
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
            <div className="flex flex-col items-end gap-1.5">
              <VisitStatusPill status={visit.status} />
              {/* Bajo xl no existe la cabecera fija de la columna derecha. */}
              {medicoAreaTiming ? (
                <AreaTimeInline state={medicoAreaTiming} />
              ) : null}
            </div>
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

        {visitHistorySummaries.length > 0 ? (
          <div className="max-sm:order-2">
            <PatientVisitHistoryDialog
              patientName={visit.patient.fullName}
              visits={visitHistorySummaries}
            />
          </div>
        ) : null}

        <Card className="max-sm:order-3 p-0">
          <details className="group" open>
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
                <ClinicalConsultationFields
                  diagnosisCatalog={diagnosisCatalog}
                  indicationCatalog={indicationCatalog}
                  findingCatalog={clinicalNoteCatalogs.findings}
                  observationCatalog={clinicalNoteCatalogs.observations}
                  defaults={{
                    primaryDiagnosis: primaryDiagnosis?.name,
                    secondaryDiagnosis: secondaryDiagnosis?.name,
                    findings: visit.clinicalConsultation?.findings,
                    observations: visit.clinicalConsultation?.observations,
                    treatmentPlanText: visit.clinicalConsultation?.treatmentPlanText,
                    indications: visit.clinicalConsultation?.indications
                  }}
                />

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

              {visit.clinicalEvolutions.length > 0 ? (
                <div className="grid gap-2 border-t border-border pt-4">
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
                      ? "Mostrar versión actual"
                      : "Emitir primera versión"}
                  </SubmitButton>
                </form>
              ) : null}

              <div className="mt-4 grid gap-2">
                {prescriptionDocuments.map((document) =>
                  document.annulledAt ? (
                    <div
                      key={document.id}
                      className="flex min-h-11 flex-wrap items-center justify-between gap-2 rounded-[9px] border border-dashed border-border bg-background px-3 py-2 text-sm"
                    >
                      <span className="inline-flex items-center gap-2">
                        <span className="font-semibold text-muted line-through">
                          Versión {document.version}
                        </span>
                        <span className="rounded-full bg-error/10 px-2 py-0.5 text-[11px] font-semibold text-error">
                          Anulada
                        </span>
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <span className="tabular-nums text-muted line-through">
                          {document.documentNumber}
                        </span>
                        {canCorrectClinical ? (
                          <AnnulPrescriptionButton
                            visitId={visit.id}
                            documentId={document.id}
                            version={document.version}
                            annulled
                          />
                        ) : null}
                      </span>
                    </div>
                  ) : (
                    <div
                      key={document.id}
                      className="flex min-h-11 items-center gap-2 rounded-[9px] border border-border px-1 pr-1"
                    >
                      <Link
                        className="focus-ring flex min-h-11 flex-1 flex-wrap items-center justify-between gap-2 rounded-[8px] px-2 py-2 text-sm hover:text-primary-dark"
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
                      {canCorrectClinical ? (
                        <AnnulPrescriptionButton
                          visitId={visit.id}
                          documentId={document.id}
                          version={document.version}
                          annulled={false}
                        />
                      ) : null}
                    </div>
                  )
                )}
                {prescriptionDocuments.length === 0 ? (
                  <p className="text-sm text-muted">
                    Todavía no se emitió una versión para imprimir o descargar.
                  </p>
                ) : null}
              </div>

              {canCorrectClinical && prescriptionDocuments.length > 0 ? (
                <CollapsibleSection
                  title="Agregar medicamentos a la receta"
                  description="Los medicamentos que agregues se suman a la receta vigente y crean una nueva versión. La anterior queda intacta."
                  className="mt-4"
                >
                  <form
                    id="corregir-receta"
                    action={correctPrescriptionAction}
                    className="grid gap-3"
                  >
                    <input type="hidden" name="visitId" value={visit.id} />
                    {currentPrescriptionItems.length > 0 ? (
                      <div className="rounded-[9px] border border-border bg-background p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                          Ya en la receta
                        </p>
                        <ul className="mt-1.5 grid gap-1 text-sm text-text">
                          {currentPrescriptionItems.map((item, index) => (
                            <li key={`${item.medication}-${index}`}>
                              {item.medication}
                              {[item.dose, item.frequency, item.duration]
                                .filter(Boolean)
                                .join(" · ")
                                ? ` · ${[item.dose, item.frequency, item.duration]
                                    .filter(Boolean)
                                    .join(" · ")}`
                                : ""}
                            </li>
                          ))}
                        </ul>
                        <p className="mt-2 text-xs text-muted">
                          Agregar uno de estos medicamentos dará error al guardar.
                        </p>
                      </div>
                    ) : null}
                    <Field label="Motivo de la corrección">
                      <textarea
                        className={`${internalInputClassName} min-h-20 py-3`}
                        name="reason"
                        required
                      />
                    </Field>
                    <PrescriptionEditor
                      medications={medicationOptions}
                      previousItems={previousPrescriptionItems}
                      initialItems={[]}
                    />
                    <SubmitButton className="w-full sm:w-auto">
                      Guardar y emitir nueva versión
                    </SubmitButton>
                  </form>
                </CollapsibleSection>
              ) : null}
            </Card>
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 max-sm:contents xl:sticky xl:top-0 xl:max-h-[calc(100dvh-6.5rem)] xl:overflow-y-auto xl:overscroll-contain xl:pr-1">
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
                  // Al cambiar la receta se remonta el modal para que la
                  // preselección refleje los medicamentos vigentes.
                  key={[...prescribedMatch.productIds, ...prescribedMatch.withoutProduct].join("|")}
                  visitId={visit.id}
                  action={saveDoctorOrderAction}
                  options={administrationOptions}
                  preselectedProductIds={prescribedMatch.productIds}
                  prescribedWithoutProduct={prescribedMatch.withoutProduct}
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


        {canWriteClinical ? (
          <Card className="max-sm:order-2">
            <CardHeader
              title="Agendar seguimiento (Recepción)"
              description="Se agenda ahora y Recepción lo verá cuando el paciente pague el tratamiento de esta visita."
            />
            <form action={createDoctorVisitFollowUpAction} className="grid gap-3">
              <input type="hidden" name="visitId" value={visit.id} />
              <input type="hidden" name="patientId" value={visit.patient.id} />
              <div className="rounded-[9px] border border-border bg-background px-3 py-2 text-sm">
                <span className="text-muted">Medio de contacto del paciente: </span>
                <span className="font-semibold text-text">
                  {contactPreferenceLabels[visit.patient.followUpPreference] ??
                    "Sin especificar"}
                </span>
              </div>
              <fieldset className="grid gap-1.5">
                <legend className="mb-1 text-sm font-medium text-muted">
                  Tipo de seguimiento
                </legend>
                <div className="flex flex-wrap gap-2">
                  {(["return", "evolution"] as const).map((value, index) => (
                    <ChipRadio
                      key={value}
                      name="type"
                      value={value}
                      label={followUpTypeLabels[value]}
                      defaultChecked={index === 0}
                    />
                  ))}
                </div>
              </fieldset>
              <Field label="Fecha y hora">
                <DateTimePickerField
                  name="dueAt"
                  required
                  timeSlots={followUpTimeSlots}
                  disablePast
                  longLabel
                />
              </Field>
              <Field label="Notas (opcional)">
                <textarea
                  className={`${internalInputClassName} min-h-14 py-2`}
                  name="notes"
                  rows={2}
                />
              </Field>
              <p className="text-xs text-muted">
                Quedará en espera y se activará automáticamente cuando la venta de
                esta visita esté pagada.
              </p>
              <FormActions className="justify-end">
                <SubmitButton>Agendar seguimiento</SubmitButton>
              </FormActions>
            </form>
          </Card>
        ) : null}

        {visit.status === "in_consultation" && canRecordDiscontinuation ? (
          <Card className="max-sm:order-3">
            <CardHeader
              title="Salida del paciente"
              description="Registra por qué no continúa y cierra la visita."
            />
            <VisitDiscontinuationForm
              visitId={visit.id}
              patientName={visit.patient.fullName}
              compact
              showRecoveryFollowUp={false}
              showNote={false}
              submitLabel="Cerrar Visita"
            />
          </Card>
        ) : null}

      </div>
    </div>
  );
}
