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
  saveClinicalConsultationAction
} from "@/features/clinical-care/actions";
import { clinicalOrderStatusLabels, clinicalOrderTypeLabels } from "@/features/clinical-care/labels";
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
import { requirePermission } from "@/modules/permissions";

const orderTypeOptions = (Object.entries(clinicalOrderTypeLabels) as Array<
  [ClinicalOrderType, string]
>).filter(([type]) => type !== "study");
const targetAreaOptions = (["enfermeria", "administracion", "seguimiento"] as PatientRouteArea[]).map(
  (area) => [area, routeAreaLabels[area]] as [PatientRouteArea, string]
);

type ConsultationDetailPageProps = {
  params: Promise<{ visitId: string }>;
  searchParams: Promise<{ error?: string }>;
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

export default async function ConsultationDetailPage({
  params,
  searchParams
}: ConsultationDetailPageProps) {
  const user = await requirePermission("clinical_read");
  const [{ visitId }, query] = await Promise.all([params, searchParams]);
  const visit = await getClinicalVisitById(visitId);

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
  const followUpConsentGranted =
    visit.patient.consents[0]?.decision === "granted";
  const canRecordProposal =
    canWriteClinical &&
    visit.status === "in_consultation" &&
    Boolean(visit.clinicalConsultation) &&
    latestProposalOutcome?.status !== "accepted";

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[1.5fr_1fr]">
      <MobileBackLink href="/sigeco/consultas" label="Volver a Consulta" />
      <div className="grid gap-4 max-sm:contents">
        {query.error ? (
          <div
            className="rounded-[9px] border border-error/30 bg-error/10 px-4 py-3 text-sm text-error max-sm:order-1"
            role="alert"
          >
            {query.error === "resultado-invalido"
              ? "Revisa el resultado, el motivo y la instrucción para Administración."
              : query.error === "resultado-cerrado"
                ? "La propuesta aceptada ya fue confirmada y no puede enviarse nuevamente."
                : "La visita ya no está disponible para registrar esta decisión."}
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
          <CardHeader
            title="Consulta médica"
            description="Registro clínico de la visita actual."
          />
          <NoticeForm action={saveClinicalConsultationAction} notice="Consulta guardada" className="grid gap-4">
            <input type="hidden" name="visitId" value={visit.id} />
            <input type="hidden" name="motive" value={consultationMotive} />
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
                defaultValue={visit.clinicalConsultation?.findings ?? ""}
              />
            </Field>
            <Field label="Observaciones">
              <textarea
                className={`${internalInputClassName} min-h-24 py-3`}
                name="observations"
                defaultValue={visit.clinicalConsultation?.observations ?? ""}
              />
            </Field>
            <Field label="Plan de tratamiento">
              <textarea
                className={`${internalInputClassName} min-h-28 py-3`}
                name="treatmentPlanText"
                defaultValue={visit.clinicalConsultation?.treatmentPlanText ?? ""}
              />
            </Field>
            <Field label="Indicaciones">
              <textarea
                className={`${internalInputClassName} min-h-28 py-3`}
                name="indications"
                defaultValue={visit.clinicalConsultation?.indications ?? ""}
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
                <textarea className={`${internalInputClassName} min-h-24 py-3`} name="evolutionNote" />
              </Field>
            </CollapsibleSection>
            <FormActions className="justify-end">
              <SubmitButton>Guardar consulta</SubmitButton>
            </FormActions>
          </NoticeForm>
        </Card>
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
              <ConfirmForm
                action={applyVisitFlowAction}
                notice="Visita cerrada"
                confirmTitle="Cerrar visita"
                confirmDescription={`La visita de ${visit.patient.fullName} quedará completada y saldrá de las bandejas activas. Esta acción no se puede deshacer.`}
                confirmLabel="Cerrar visita"
              >
                <input type="hidden" name="visitId" value={visit.id} />
                <input type="hidden" name="flow" value="complete" />
                <input type="hidden" name="note" value="Salida directa después de la consulta" />
                <SubmitButton variant="outline" className="w-full">
                  Se va — cerrar visita
                </SubmitButton>
              </ConfirmForm>
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
