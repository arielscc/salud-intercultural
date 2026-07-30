import Link from "next/link";
import { notFound } from "next/navigation";
import type { ClinicalOrderType, PatientRouteArea } from "@/generated/prisma/client";
import { ConfirmForm } from "@/components/internal/ConfirmForm";
import { Field, internalInputClassName } from "@/components/internal/Field";
import { NoticeForm } from "@/components/internal/NoticeForm";
import { MobileBackLink } from "@/components/internal/MobileBackLink";
import { PaidStudyOrderDialog } from "@/components/internal/PaidStudyOrderDialog";
import { VisitStatusPill } from "@/components/internal/StatusPill";
import { SubmitButton } from "@/components/internal/SubmitButton";
import { TreatmentProposalOutcomeForm } from "@/components/internal/treatment-proposals/TreatmentProposalOutcomeForm";
import { VisitDiscontinuationForm } from "@/components/internal/visit-discontinuations/VisitDiscontinuationForm";
import { ClinicalConsultationCorrectionForm } from "@/components/internal/clinical-records/ClinicalConsultationCorrectionForm";
import { Card, CardHeader } from "@/components/internal/ui/Card";
import { Chip } from "@/components/internal/ui/Chip";
import { CollapsibleSection } from "@/components/internal/ui/CollapsibleSection";
import { DesktopDetailContext } from "@/components/internal/ui/DesktopDetailContext";
import { FormActions } from "@/components/internal/ui/FormActions";
import { InfoRow } from "@/components/internal/ui/InfoRow";
import { TimelineItem } from "@/components/internal/ui/TimelineItem";
import {
  createClinicalOrderAction,
  createPaidStudyOrderAction,
  finalizeClinicalConsultationAction,
  saveClinicalConsultationAction
} from "@/features/clinical-care/actions";
import {
  correctPrescriptionAction,
  generatePrescriptionDocumentAction
} from "@/features/generated-documents/actions";
import { clinicalOrderStatusLabels, clinicalOrderTypeLabels } from "@/features/clinical-care/labels";
import { clinicalRecordStatusLabels } from "@/features/clinical-records/labels";
import { roleHasPermission } from "@/features/internal-auth/permissions";
import { routeAreaLabels } from "@/features/patients/labels";
import { symptomDurationUnitLabels, visitIntakeTypeLabels } from "@/features/reception/labels";
import { studyStatusLabels, studyTypeLabels } from "@/features/studies/labels";
import {
  treatmentProposalOutcomeReasonLabels,
  treatmentProposalOutcomeStatusLabels
} from "@/features/treatment-proposals/labels";
import { formatMoney } from "@/features/sales/labels";
import { applyVisitFlowAction } from "@/features/visits/actions";
import { formatDateTime } from "@/lib/dates";
import { getClinicalVisitById } from "@/modules/database/queries/clinical-care";
import { getPrescriptionDocuments } from "@/modules/generated-documents/service";
import { requirePermission } from "@/modules/permissions";

const orderTypeOptions = (Object.entries(clinicalOrderTypeLabels) as Array<
  [ClinicalOrderType, string]
>).filter(([type]) => type !== "study");
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
      "La receta no cambió; se conservó la versión vigente."
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
  const [{ visitId }, query] = await Promise.all([params, searchParams]);
  const [visit, prescriptionDocuments] = await Promise.all([
    getClinicalVisitById(visitId),
    getPrescriptionDocuments(visitId)
  ]);

  if (!visit) notFound();

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
  const clinicalSnapshot = {
    motive: consultationMotive,
    primaryDiagnosis: primaryDiagnosis?.name ?? "",
    secondaryDiagnosis: secondaryDiagnosis?.name,
    findings: visit.clinicalConsultation?.findings,
    observations: visit.clinicalConsultation?.observations,
    treatmentPlanText: visit.clinicalConsultation?.treatmentPlanText,
    indications: visit.clinicalConsultation?.indications
  };

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

        <Card className="max-sm:order-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <CardHeader
              title="Consulta médica"
              description={
                visit.clinicalConsultation?.status === "finalized"
                  ? "Registro aprobado. Los cambios posteriores crean otra versión."
                  : "Guarda el borrador y finalízalo cuando esté completo."
              }
            />
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
          </div>

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
                  <textarea
                    className={`${internalInputClassName} min-h-28 py-3`}
                    name="indications"
                    defaultValue={
                      visit.clinicalConsultation?.indications ?? ""
                    }
                  />
                </Field>

                <CollapsibleSection
                  title="Receta rápida"
                  description="Abrir solo cuando se indique medicación."
                  defaultOpen={Boolean(prescriptionItem)}
                >
                  <Field label="Medicamento">
                    <input
                      className={internalInputClassName}
                      name="prescriptionMedication"
                      defaultValue={prescriptionItem?.medication}
                    />
                  </Field>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field label="Dosis">
                      <input
                        className={internalInputClassName}
                        name="prescriptionDose"
                        defaultValue={prescriptionItem?.dose ?? ""}
                      />
                    </Field>
                    <Field label="Frecuencia">
                      <input
                        className={internalInputClassName}
                        name="prescriptionFrequency"
                        defaultValue={prescriptionItem?.frequency ?? ""}
                      />
                    </Field>
                    <Field label="Duración">
                      <input
                        className={internalInputClassName}
                        name="prescriptionDuration"
                        defaultValue={prescriptionItem?.duration ?? ""}
                      />
                    </Field>
                  </div>
                  <Field label="Observaciones de receta">
                    <input
                      className={internalInputClassName}
                      name="prescriptionObservations"
                      defaultValue={prescriptionItem?.observations ?? ""}
                    />
                  </Field>
                </CollapsibleSection>

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

        {visit.status === "in_consultation" ? (
          <Card className="max-sm:order-3">
            <CardHeader
              title="Salida del paciente"
              description="Al terminar la consulta el paciente puede seguir a otra área o irse."
            />
            <div className="grid gap-2">
              <PaidStudyOrderDialog visitId={visit.id} action={createPaidStudyOrderAction} />
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

        <Card className="max-sm:order-6">
          <CardHeader
            title="Resultados de estudios y enfermería"
            description="Resultados y actuaciones recibidos desde las áreas de apoyo clínico."
          />
          <div className="grid gap-0">
            {visit.studies.map((study) => (
              <TimelineItem
                key={study.id}
                title={study.title}
                meta={`${studyTypeLabels[study.type]} · ${formatDateTime(study.performedAt ?? study.createdAt)}`}
                aside={studyStatusLabels[study.status]}
                body={
                  study.resultSummary || study.findings ? (
                    <>
                      {study.resultSummary ? <span className="block">{study.resultSummary}</span> : null}
                      {study.findings ? <span className="mt-1 block">{study.findings}</span> : null}
                    </>
                  ) : undefined
                }
              />
            ))}
            {visit.vitalSigns.slice(0, 3).map((item) => (
              <TimelineItem
                key={item.id}
                title="Signos vitales"
                body={
                  <span className="tabular-nums">
                    PA {item.systolicPressureMmHg ?? "-"}/{item.diastolicPressureMmHg ?? "-"} · Pulso{" "}
                    {item.heartRateBpm ?? "-"} · Sat {item.oxygenSaturation ?? "-"}
                  </span>
                }
              />
            ))}
            {visit.nursingApplications.slice(0, 3).map((item) => (
              <TimelineItem
                key={item.id}
                title={item.medication}
                meta={formatDateTime(item.appliedAt)}
                body={`${item.quantity ?? "Sin cantidad"} · ${item.route ?? "Sin vía"}`}
              />
            ))}
            {visit.studies.length + visit.vitalSigns.length + visit.nursingApplications.length === 0 ? (
              <p className="py-2 text-sm text-muted">
                Sin estudios ni registros de enfermería en esta visita.
              </p>
            ) : null}
          </div>
        </Card>
      </div>
    </div>
  );
}
