import { notFound } from "next/navigation";
import type { ClinicalOrderType, PatientRouteArea } from "@/generated/prisma/client";
import { ConfirmForm } from "@/components/internal/ConfirmForm";
import { Field, internalInputClassName } from "@/components/internal/Field";
import { NoticeForm } from "@/components/internal/NoticeForm";
import { MobileBackLink } from "@/components/internal/MobileBackLink";
import { VisitStatusPill } from "@/components/internal/StatusPill";
import { SubmitButton } from "@/components/internal/SubmitButton";
import { Card, CardHeader } from "@/components/internal/ui/Card";
import { CollapsibleSection } from "@/components/internal/ui/CollapsibleSection";
import { InfoRow } from "@/components/internal/ui/InfoRow";
import { TimelineItem } from "@/components/internal/ui/TimelineItem";
import {
  createClinicalOrderAction,
  saveClinicalConsultationAction
} from "@/features/clinical-care/actions";
import { clinicalOrderStatusLabels, clinicalOrderTypeLabels } from "@/features/clinical-care/labels";
import { routeAreaLabels } from "@/features/patients/labels";
import { symptomDurationUnitLabels, visitIntakeTypeLabels } from "@/features/reception/labels";
import { studyStatusLabels, studyTypeLabels } from "@/features/studies/labels";
import { applyVisitFlowAction } from "@/features/visits/actions";
import { isActiveVisitStatus } from "@/features/visits/schemas/visit.schema";
import { formatDateTime } from "@/lib/dates";
import { getClinicalVisitById } from "@/modules/database/queries/clinical-care";
import { requirePermission } from "@/modules/permissions";

const orderTypeOptions = Object.entries(clinicalOrderTypeLabels) as Array<[ClinicalOrderType, string]>;
const targetAreaOptions = (["enfermeria", "administracion", "seguimiento"] as PatientRouteArea[]).map(
  (area) => [area, routeAreaLabels[area]] as [PatientRouteArea, string]
);

type ConsultationDetailPageProps = {
  params: Promise<{ visitId: string }>;
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

export default async function ConsultationDetailPage({ params }: ConsultationDetailPageProps) {
  await requirePermission("clinical_read");
  const { visitId } = await params;
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

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[1.5fr_1fr]">
      <MobileBackLink href="/sigeco/consultas" label="Volver a Consulta" />
      <div className="grid gap-4 max-sm:contents">
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
            <div className="flex justify-end border-t border-border pt-4">
              <SubmitButton>Guardar consulta</SubmitButton>
            </div>
          </NoticeForm>
        </Card>
      </div>

      <div className="grid gap-4 max-sm:contents">
        {isActiveVisitStatus(visit.status) ? (
          <Card className="max-sm:order-2">
            <CardHeader
              title="Salida del paciente"
              description="Al terminar la consulta el paciente puede seguir a otra área o irse."
            />
            <div className="grid gap-2">
              <NoticeForm action={applyVisitFlowAction} notice="Paciente enviado a enfermería">
                <input type="hidden" name="visitId" value={visit.id} />
                <input type="hidden" name="flow" value="to_nursing" />
                <input type="hidden" name="note" value="Pasa a enfermería tras la consulta" />
                <SubmitButton variant="outline" className="w-full">
                  Enviar a enfermería
                </SubmitButton>
              </NoticeForm>
              <NoticeForm action={applyVisitFlowAction} notice="Paciente enviado a administración">
                <input type="hidden" name="visitId" value={visit.id} />
                <input type="hidden" name="flow" value="to_administration" />
                <input type="hidden" name="note" value="Pasa a administración tras la consulta" />
                <SubmitButton variant="outline" className="w-full">
                  Enviar a administración
                </SubmitButton>
              </NoticeForm>
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
          <CardHeader title="Órdenes clínicas" />
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
          <CardHeader title="Estudios y enfermería" />
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
