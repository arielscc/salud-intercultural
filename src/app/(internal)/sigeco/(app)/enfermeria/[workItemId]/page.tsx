import { notFound } from "next/navigation";
import type { StudyStatus, StudyType, VisitWorkItemStatus } from "@/generated/prisma/client";
import { Field, internalInputClassName } from "@/components/internal/Field";
import { VisitStatusPill } from "@/components/internal/StatusPill";
import { clinicalOrderTypeLabels } from "@/features/clinical-care/labels";
import {
  createNursingApplicationAction,
  createNursingNoteAction,
  createVitalSignsAction,
  updateNursingWorkItemAction
} from "@/features/nursing/actions";
import { nursingWorkItemStatusLabels } from "@/features/nursing/labels";
import { createStudyAction } from "@/features/studies/actions";
import { studyStatusLabels, studyTypeLabels } from "@/features/studies/labels";
import { getNursingWorkItemById } from "@/modules/database/queries/nursing";
import { requirePermission } from "@/modules/permissions";

const workItemStatusOptions = (["acknowledged", "in_progress", "completed", "blocked"] as VisitWorkItemStatus[]).map(
  (status) => [status, nursingWorkItemStatusLabels[status]] as [VisitWorkItemStatus, string]
);
const studyTypeOptions = Object.entries(studyTypeLabels) as Array<[StudyType, string]>;
const studyStatusOptions = Object.entries(studyStatusLabels) as Array<[StudyStatus, string]>;

type NursingWorkItemPageProps = {
  params: Promise<{ workItemId: string }>;
};

export default async function NursingWorkItemPage({ params }: NursingWorkItemPageProps) {
  await requirePermission("nursing_read");
  const { workItemId } = await params;
  const item = await getNursingWorkItemById(workItemId);

  if (!item) notFound();

  const patient = item.visit.patient;
  const order = item.clinicalOrders[0];

  return (
    <div className="grid gap-5">
      <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-muted">{patient.internalCode}</p>
            <h2 className="font-sora text-2xl font-bold">{patient.fullName}</h2>
            <p className="mt-1 text-sm text-muted">{patient.phone}</p>
          </div>
          <VisitStatusPill status={item.visit.status} />
        </div>
        <div className="mt-4 rounded-xl border border-border bg-surface-soft/60 p-3">
          <p className="text-xs font-bold uppercase tracking-normal text-muted">
            {order ? clinicalOrderTypeLabels[order.type] : "Tarea de enfermería"}
          </p>
          <p className="font-bold">{order?.title ?? item.title}</p>
          <p className="mt-1 text-sm text-muted">{order?.details ?? item.description}</p>
          <p className="mt-2 text-xs font-semibold text-muted">
            Registró: {order?.doctor?.name ?? order?.doctor?.email ?? item.createdBy?.name ?? item.createdBy?.email ?? "Sin responsable"}
          </p>
        </div>
      </section>

      <form action={updateNursingWorkItemAction} className="grid gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <input type="hidden" name="workItemId" value={item.id} />
        <h3 className="font-sora text-lg font-bold">Estado de tarea</h3>
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
        <button className="focus-ring min-h-12 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white">
          Actualizar tarea
        </button>
      </form>

      <form action={createVitalSignsAction} className="grid gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <input type="hidden" name="patientId" value={patient.id} />
        <input type="hidden" name="visitId" value={item.visit.id} />
        <input type="hidden" name="workItemId" value={item.id} />
        <h3 className="font-sora text-lg font-bold">Signos vitales</h3>
        <div className="grid gap-3 sm:grid-cols-2">
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
        <button className="focus-ring min-h-12 rounded-xl border border-border bg-surface-soft px-4 py-3 text-sm font-bold">
          Guardar signos
        </button>
      </form>

      <form action={createNursingApplicationAction} className="grid gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <input type="hidden" name="patientId" value={patient.id} />
        <input type="hidden" name="visitId" value={item.visit.id} />
        <input type="hidden" name="workItemId" value={item.id} />
        <input type="hidden" name="workItemId" value={item.id} />
        <input type="hidden" name="clinicalOrderId" value={order?.id ?? ""} />
        <h3 className="font-sora text-lg font-bold">Aplicación clínica</h3>
        <Field label="Medicamento o insumo">
          <input className={internalInputClassName} name="medication" defaultValue={order?.title ?? ""} required />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Cantidad">
            <input className={internalInputClassName} name="quantity" />
          </Field>
          <Field label="Vía">
            <input className={internalInputClassName} name="route" />
          </Field>
        </div>
        <Field label="Hora">
          <input className={internalInputClassName} name="appliedAt" type="datetime-local" />
        </Field>
        <Field label="Observaciones">
          <textarea className={`${internalInputClassName} min-h-20 py-3`} name="notes" />
        </Field>
        <button className="focus-ring min-h-12 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white">
          Registrar aplicación
        </button>
      </form>

      <form action={createStudyAction} className="grid gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <input type="hidden" name="patientId" value={patient.id} />
        <input type="hidden" name="visitId" value={item.visit.id} />
        <input type="hidden" name="workItemId" value={item.id} />
        <input type="hidden" name="clinicalOrderId" value={order?.id ?? ""} />
        <h3 className="font-sora text-lg font-bold">Estudio</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Tipo">
            <select className={internalInputClassName} name="type" defaultValue={order?.type === "study" ? "laboratory" : "other"}>
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
          <input className={internalInputClassName} name="title" defaultValue={order?.title ?? ""} required />
        </Field>
        <Field label="Resumen">
          <input className={internalInputClassName} name="resultSummary" />
        </Field>
        <Field label="Hallazgos">
          <textarea className={`${internalInputClassName} min-h-24 py-3`} name="findings" />
        </Field>
        <button className="focus-ring min-h-12 rounded-xl border border-border bg-surface-soft px-4 py-3 text-sm font-bold">
          Registrar estudio
        </button>
      </form>

      <form action={createNursingNoteAction} className="grid gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <input type="hidden" name="patientId" value={patient.id} />
        <input type="hidden" name="visitId" value={item.visit.id} />
        <h3 className="font-sora text-lg font-bold">Nota de enfermería</h3>
        <Field label="Nota">
          <textarea className={`${internalInputClassName} min-h-24 py-3`} name="note" required />
        </Field>
        <button className="focus-ring min-h-12 rounded-xl border border-border bg-surface-soft px-4 py-3 text-sm font-bold">
          Guardar nota
        </button>
      </form>
    </div>
  );
}
