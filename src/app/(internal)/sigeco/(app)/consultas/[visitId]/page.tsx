import { notFound } from "next/navigation";
import type { ClinicalOrderType, PatientRouteArea } from "@/generated/prisma/client";
import { Field, internalInputClassName } from "@/components/internal/Field";
import { VisitStatusPill } from "@/components/internal/StatusPill";
import {
  createClinicalOrderAction,
  saveClinicalConsultationAction
} from "@/features/clinical-care/actions";
import { clinicalOrderStatusLabels, clinicalOrderTypeLabels } from "@/features/clinical-care/labels";
import { routeAreaLabels } from "@/features/patients/labels";
import { studyStatusLabels, studyTypeLabels } from "@/features/studies/labels";
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
    <div className="grid gap-5">
      <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-muted">{visit.patient.internalCode}</p>
            <h2 className="font-sora text-2xl font-bold">{visit.patient.fullName}</h2>
            <p className="mt-1 text-sm text-muted">{visit.patient.phone}</p>
          </div>
          <VisitStatusPill status={visit.status} />
        </div>
        <div className="mt-4 grid gap-2 text-sm text-muted">
          {visit.patient.allergies ? <p>Alergias: {visit.patient.allergies}</p> : null}
          {visit.patient.relevantHistory ? <p>Antecedentes: {visit.patient.relevantHistory}</p> : null}
          {visit.reason ? <p>Motivo recepción: {visit.reason}</p> : null}
        </div>
      </section>

      <form action={saveClinicalConsultationAction} className="grid gap-4 rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <input type="hidden" name="visitId" value={visit.id} />
        <h3 className="font-sora text-lg font-bold">Consulta médica</h3>
        <Field label="Motivo">
          <textarea
            className={`${internalInputClassName} min-h-24 py-3`}
            name="motive"
            defaultValue={visit.clinicalConsultation?.motive ?? visit.reason ?? ""}
            required
          />
        </Field>
        <Field label="Diagnóstico principal">
          <input className={internalInputClassName} name="primaryDiagnosis" defaultValue={primaryDiagnosis?.name} required />
        </Field>
        <Field label="Diagnóstico secundario">
          <input className={internalInputClassName} name="secondaryDiagnosis" defaultValue={secondaryDiagnosis?.name} />
        </Field>
        <Field label="Hallazgos">
          <textarea className={`${internalInputClassName} min-h-24 py-3`} name="findings" defaultValue={visit.clinicalConsultation?.findings ?? ""} />
        </Field>
        <Field label="Observaciones">
          <textarea className={`${internalInputClassName} min-h-24 py-3`} name="observations" defaultValue={visit.clinicalConsultation?.observations ?? ""} />
        </Field>
        <Field label="Plan de tratamiento">
          <textarea className={`${internalInputClassName} min-h-28 py-3`} name="treatmentPlanText" defaultValue={visit.clinicalConsultation?.treatmentPlanText ?? ""} />
        </Field>
        <Field label="Indicaciones">
          <textarea className={`${internalInputClassName} min-h-28 py-3`} name="indications" defaultValue={visit.clinicalConsultation?.indications ?? ""} />
        </Field>

        <div className="rounded-2xl border border-border bg-surface-soft/60 p-3">
          <h4 className="mb-3 font-bold">Receta rápida</h4>
          <div className="grid gap-3">
            <Field label="Medicamento">
              <input className={internalInputClassName} name="prescriptionMedication" defaultValue={prescriptionItem?.medication} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Dosis">
                <input className={internalInputClassName} name="prescriptionDose" defaultValue={prescriptionItem?.dose ?? ""} />
              </Field>
              <Field label="Frecuencia">
                <input className={internalInputClassName} name="prescriptionFrequency" defaultValue={prescriptionItem?.frequency ?? ""} />
              </Field>
              <Field label="Duración">
                <input className={internalInputClassName} name="prescriptionDuration" defaultValue={prescriptionItem?.duration ?? ""} />
              </Field>
            </div>
            <Field label="Observaciones de receta">
              <input className={internalInputClassName} name="prescriptionObservations" defaultValue={prescriptionItem?.observations ?? ""} />
            </Field>
          </div>
        </div>

        <Field label="Evolución">
          <textarea className={`${internalInputClassName} min-h-24 py-3`} name="evolutionNote" />
        </Field>
        <button className="focus-ring min-h-12 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white">
          Guardar consulta
        </button>
      </form>

      <section className="grid gap-4 rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <h3 className="font-sora text-lg font-bold">Indicación para otra área</h3>
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
            <input className={internalInputClassName} name="title" placeholder="Aplicar suero ABC" required />
          </Field>
          <Field label="Detalle">
            <textarea className={`${internalInputClassName} min-h-24 py-3`} name="details" />
          </Field>
          <button className="focus-ring min-h-12 rounded-xl border border-border bg-surface-soft px-4 py-3 text-sm font-bold">
            Crear indicación
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <h3 className="mb-4 font-sora text-lg font-bold">Órdenes clínicas</h3>
        <div className="grid gap-3">
          {visit.clinicalOrders.map((order) => (
            <article key={order.id} className="rounded-xl border border-border bg-surface-soft/60 p-3">
              <p className="font-bold">{order.title}</p>
              <p className="text-xs font-semibold text-muted">
                {clinicalOrderTypeLabels[order.type]} · {routeAreaLabels[order.targetArea]} ·{" "}
                {clinicalOrderStatusLabels[order.status]}
              </p>
              {order.details ? <p className="mt-2 text-sm text-muted">{order.details}</p> : null}
            </article>
          ))}
          {visit.clinicalOrders.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted">
              Sin órdenes clínicas para otras áreas.
            </p>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <h3 className="mb-4 font-sora text-lg font-bold">Estudios y enfermería</h3>
        <div className="grid gap-3">
          {visit.studies.map((study) => (
            <article key={study.id} className="rounded-xl border border-border bg-surface-soft/60 p-3">
              <p className="font-bold">{study.title}</p>
              <p className="text-xs font-semibold text-muted">
                {studyTypeLabels[study.type]} · {studyStatusLabels[study.status]} ·{" "}
                {(study.performedAt ?? study.createdAt).toLocaleString("es-BO")}
              </p>
              {study.resultSummary ? <p className="mt-2 text-sm text-muted">{study.resultSummary}</p> : null}
              {study.findings ? <p className="mt-1 text-sm text-muted">{study.findings}</p> : null}
            </article>
          ))}
          {visit.vitalSigns.slice(0, 3).map((item) => (
            <article key={item.id} className="rounded-xl border border-border bg-surface-soft/60 p-3">
              <p className="font-bold">Signos vitales</p>
              <p className="text-sm text-muted">
                PA {item.systolicPressureMmHg ?? "-"} / {item.diastolicPressureMmHg ?? "-"} · Pulso{" "}
                {item.heartRateBpm ?? "-"} · Sat {item.oxygenSaturation ?? "-"}
              </p>
            </article>
          ))}
          {visit.nursingApplications.slice(0, 3).map((item) => (
            <article key={item.id} className="rounded-xl border border-border bg-surface-soft/60 p-3">
              <p className="font-bold">{item.medication}</p>
              <p className="text-sm text-muted">
                {item.quantity ?? "Sin cantidad"} · {item.route ?? "Sin vía"} ·{" "}
                {item.appliedAt.toLocaleString("es-BO")}
              </p>
            </article>
          ))}
          {visit.studies.length + visit.vitalSigns.length + visit.nursingApplications.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted">
              Sin estudios ni registros de enfermería en esta visita.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
