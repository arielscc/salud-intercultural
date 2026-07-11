import { notFound } from "next/navigation";
import type { ClinicalOrderType, PatientRouteArea } from "@/generated/prisma/client";
import { Field, internalInputClassName } from "@/components/internal/Field";
import { VisitStatusPill } from "@/components/internal/StatusPill";
import { Button } from "@/components/internal/ui/Button";
import { Card, CardHeader } from "@/components/internal/ui/Card";
import { InfoRow } from "@/components/internal/ui/InfoRow";
import { TimelineItem } from "@/components/internal/ui/TimelineItem";
import {
  createClinicalOrderAction,
  saveClinicalConsultationAction
} from "@/features/clinical-care/actions";
import { clinicalOrderStatusLabels, clinicalOrderTypeLabels } from "@/features/clinical-care/labels";
import { routeAreaLabels } from "@/features/patients/labels";
import { studyStatusLabels, studyTypeLabels } from "@/features/studies/labels";
import { applyVisitFlowAction } from "@/features/visits/actions";
import { isActiveVisitStatus } from "@/features/visits/schemas/visit.schema";
import { getClinicalVisitById } from "@/modules/database/queries/clinical-care";
import { requirePermission } from "@/modules/permissions";

const orderTypeOptions = Object.entries(clinicalOrderTypeLabels) as Array<[ClinicalOrderType, string]>;
const targetAreaOptions = (["enfermeria", "administracion", "seguimiento"] as PatientRouteArea[]).map(
  (area) => [area, routeAreaLabels[area]] as [PatientRouteArea, string]
);

type ConsultationDetailPageProps = {
  params: Promise<{ visitId: string }>;
};

export default async function ConsultationDetailPage({ params }: ConsultationDetailPageProps) {
  await requirePermission("clinical_read");
  const { visitId } = await params;
  const visit = await getClinicalVisitById(visitId);

  if (!visit) notFound();

  const primaryDiagnosis = visit.clinicalConsultation?.diagnoses.find((item) => item.kind === "primary");
  const secondaryDiagnosis = visit.clinicalConsultation?.diagnoses.find((item) => item.kind === "secondary");
  const prescriptionItem = visit.prescriptions[0]?.items[0];

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[1.5fr_1fr]">
      <div className="grid gap-4">
        <Card>
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
          <dl className="mt-4 grid gap-x-6 gap-y-2 border-t border-border pt-4 text-sm sm:grid-cols-2">
            {visit.patient.allergies ? (
              <InfoRow label="Alergias" value={visit.patient.allergies} wide />
            ) : null}
            {visit.patient.relevantHistory ? (
              <InfoRow label="Antecedentes" value={visit.patient.relevantHistory} wide />
            ) : null}
            {visit.reason ? <InfoRow label="Motivo recepción" value={visit.reason} wide /> : null}
          </dl>
        </Card>

        <Card>
          <CardHeader
            title="Consulta médica"
            description="Registro clínico de la visita actual."
          />
          <form action={saveClinicalConsultationAction} className="grid gap-4">
            <input type="hidden" name="visitId" value={visit.id} />
            <Field label="Motivo">
              <textarea
                className={`${internalInputClassName} min-h-24 py-3`}
                name="motive"
                defaultValue={visit.clinicalConsultation?.motive ?? visit.reason ?? ""}
                required
              />
            </Field>
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

            <fieldset className="grid gap-3 rounded-[9px] border border-border bg-background p-4">
              <legend className="px-1 text-[13px] font-semibold text-text">Receta rápida</legend>
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
            </fieldset>

            <Field label="Evolución">
              <textarea className={`${internalInputClassName} min-h-24 py-3`} name="evolutionNote" />
            </Field>
            <div className="flex justify-end border-t border-border pt-4">
              <Button type="submit">Guardar consulta</Button>
            </div>
          </form>
        </Card>
      </div>

      <div className="grid gap-4">
        {isActiveVisitStatus(visit.status) ? (
          <Card>
            <CardHeader
              title="Salida del paciente"
              description="Al terminar la consulta el paciente puede seguir a otra área o irse."
            />
            <div className="grid gap-2">
              <form action={applyVisitFlowAction}>
                <input type="hidden" name="visitId" value={visit.id} />
                <input type="hidden" name="flow" value="to_nursing" />
                <input type="hidden" name="note" value="Pasa a enfermería tras la consulta" />
                <Button type="submit" variant="outline" className="w-full">
                  Enviar a enfermería
                </Button>
              </form>
              <form action={applyVisitFlowAction}>
                <input type="hidden" name="visitId" value={visit.id} />
                <input type="hidden" name="flow" value="to_administration" />
                <input type="hidden" name="note" value="Pasa a administración tras la consulta" />
                <Button type="submit" variant="outline" className="w-full">
                  Enviar a administración
                </Button>
              </form>
              <form action={applyVisitFlowAction}>
                <input type="hidden" name="visitId" value={visit.id} />
                <input type="hidden" name="flow" value="complete" />
                <input type="hidden" name="note" value="Salida directa después de la consulta" />
                <Button type="submit" variant="outline" className="w-full">
                  Se va — cerrar visita
                </Button>
              </form>
            </div>
          </Card>
        ) : null}

        <Card>
          <CardHeader title="Indicación para otra área" />
          <form action={createClinicalOrderAction} className="grid gap-3">
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
            <Button type="submit" variant="outline">
              Crear indicación
            </Button>
          </form>
        </Card>

        <Card>
          <CardHeader title="Órdenes clínicas" />
          <div className="grid gap-0">
            {visit.clinicalOrders.map((order) => (
              <TimelineItem
                key={order.id}
                title={order.title}
                meta={`${clinicalOrderTypeLabels[order.type]} · ${routeAreaLabels[order.targetArea]}`}
                aside={
                  <span className="text-[11px] font-semibold text-muted">
                    {clinicalOrderStatusLabels[order.status]}
                  </span>
                }
                body={order.details ?? undefined}
              />
            ))}
            {visit.clinicalOrders.length === 0 ? (
              <p className="py-2 text-sm text-muted">Sin órdenes clínicas para otras áreas.</p>
            ) : null}
          </div>
        </Card>

        <Card>
          <CardHeader title="Estudios y enfermería" />
          <div className="grid gap-0">
            {visit.studies.map((study) => (
              <TimelineItem
                key={study.id}
                title={study.title}
                meta={`${studyTypeLabels[study.type]} · ${(study.performedAt ?? study.createdAt).toLocaleString("es-BO")}`}
                aside={
                  <span className="text-[11px] font-semibold text-muted">
                    {studyStatusLabels[study.status]}
                  </span>
                }
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
                meta={item.appliedAt.toLocaleString("es-BO")}
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
