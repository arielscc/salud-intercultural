import { notFound } from "next/navigation";
import type { StudyStatus, StudyType, VisitWorkItemStatus } from "@/generated/prisma/client";
import { Field, internalInputClassName } from "@/components/internal/Field";
import { VisitStatusPill } from "@/components/internal/StatusPill";
import { Button } from "@/components/internal/ui/Button";
import { Card, CardHeader } from "@/components/internal/ui/Card";
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
    <div className="grid items-start gap-4 xl:grid-cols-[1.5fr_1fr]">
      <div className="grid gap-4">
        <Card>
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

        <Card>
          <CardHeader title="Signos vitales" />
          <form action={createVitalSignsAction} className="grid gap-3">
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
              <Button type="submit" variant="outline">
                Guardar signos
              </Button>
            </div>
          </form>
        </Card>

        <Card>
          <CardHeader title="Aplicación clínica" />
          <form action={createNursingApplicationAction} className="grid gap-3">
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
                <input className={internalInputClassName} name="appliedAt" type="datetime-local" />
              </Field>
            </div>
            <Field label="Observaciones">
              <textarea className={`${internalInputClassName} min-h-20 py-3`} name="notes" />
            </Field>
            <div className="flex justify-end">
              <Button type="submit">Registrar aplicación</Button>
            </div>
          </form>
        </Card>

        <Card>
          <CardHeader title="Estudio" />
          <form action={createStudyAction} className="grid gap-3">
            <input type="hidden" name="patientId" value={patient.id} />
            <input type="hidden" name="visitId" value={item.visit.id} />
            <input type="hidden" name="workItemId" value={item.id} />
            <input type="hidden" name="clinicalOrderId" value={order?.id ?? ""} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Tipo">
                <select
                  className={internalInputClassName}
                  name="type"
                  defaultValue={order?.type === "study" ? "laboratory" : "other"}
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
                defaultValue={order?.title ?? ""}
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
              <Button type="submit" variant="outline">
                Registrar estudio
              </Button>
            </div>
          </form>
        </Card>
      </div>

      <div className="grid gap-4">
        <Card>
          <CardHeader title="Estado de tarea" />
          <form action={updateNursingWorkItemAction} className="grid gap-3">
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
            <Button type="submit">Actualizar tarea</Button>
          </form>
        </Card>

        <Card>
          <CardHeader title="Nota de enfermería" />
          <form action={createNursingNoteAction} className="grid gap-3">
            <input type="hidden" name="patientId" value={patient.id} />
            <input type="hidden" name="visitId" value={item.visit.id} />
            <Field label="Nota">
              <textarea className={`${internalInputClassName} min-h-24 py-3`} name="note" required />
            </Field>
            <Button type="submit" variant="outline">
              Guardar nota
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
