import { notFound } from "next/navigation";
import { Field, internalInputClassName } from "@/components/internal/Field";
import { VisitStatusPill } from "@/components/internal/StatusPill";
import { createFollowUpTaskAction } from "@/features/follow-ups/actions";
import { followUpStatusLabels } from "@/features/follow-ups/labels";
import {
  patientCaptureSourceLabels,
  patientGenderLabels,
  routeAreaLabels
} from "@/features/patients/labels";
import { formatMoney, saleStatusLabels } from "@/features/sales/labels";
import { studyTypeLabels } from "@/features/studies/labels";
import { createVisitAction } from "@/features/visits/actions";
import { getPatientById } from "@/modules/database/queries/patients";
import { requirePermission } from "@/modules/permissions";

type PatientDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PatientDetailPage({ params }: PatientDetailPageProps) {
  await requirePermission("patients_read");
  const { id } = await params;
  const patient = await getPatientById(id);

  if (!patient) notFound();

  return (
    <div className="grid gap-5">
      <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <p className="text-sm font-semibold text-muted">{patient.internalCode}</p>
        <h2 className="font-sora text-2xl font-bold">{patient.fullName}</h2>
        <div className="mt-3 grid gap-1 text-sm text-muted">
          <p>Teléfono: {patient.phone}</p>
          {patient.secondaryPhone ? <p>Alternativo: {patient.secondaryPhone}</p> : null}
          <p>Género: {patientGenderLabels[patient.gender]}</p>
          {patient.city ? <p>Ciudad: {patient.city}</p> : null}
          <p>Fuente: {patientCaptureSourceLabels[patient.captureSource]}</p>
        </div>
      </section>

      <section className="grid gap-4 rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <h3 className="font-sora text-lg font-bold">Registrar llegada</h3>
        <form action={createVisitAction} className="grid gap-3">
          <input type="hidden" name="patientId" value={patient.id} />
          <Field label="Motivo de visita">
            <textarea className={`${internalInputClassName} min-h-24 py-3`} name="reason" />
          </Field>
          <Field label="Nota de recepción">
            <input className={internalInputClassName} name="note" />
          </Field>
          <button className="focus-ring min-h-12 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white">
            Abrir visita
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <h3 className="mb-4 font-sora text-lg font-bold">Ficha permanente</h3>
        <div className="grid gap-3 text-sm">
          <Info label="Alergias" value={patient.allergies} />
          <Info label="Antecedentes" value={patient.relevantHistory} />
          <Info label="Observaciones" value={patient.generalObservations} />
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <h3 className="mb-4 font-sora text-lg font-bold">Visitas</h3>
        <div className="grid gap-3">
          {patient.visits.map((visit) => (
            <a
              key={visit.id}
              href={`/sigeco/visitas/${visit.id}`}
              className="focus-ring rounded-xl border border-border bg-surface-soft/60 p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold">{visit.checkedInAt.toLocaleString("es-BO")}</p>
                  <p className="text-sm text-muted">
                    Área actual: {visit.route ? routeAreaLabels[visit.route.currentArea] : "Sin ruta"}
                  </p>
                </div>
                <VisitStatusPill status={visit.status} />
              </div>
            </a>
          ))}
          {patient.visits.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted">
              Este paciente aún no tiene visitas registradas.
            </p>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <h3 className="mb-4 font-sora text-lg font-bold">Timeline de enfermería</h3>
        <div className="grid gap-3">
          {patient.vitalSigns.map((item) => (
            <article key={item.id} className="rounded-xl border border-border bg-surface-soft/60 p-3">
              <p className="font-bold">Signos vitales</p>
              <p className="text-sm text-muted">
                {item.recordedAt.toLocaleString("es-BO")} · PA {item.systolicPressureMmHg ?? "-"} /
                {item.diastolicPressureMmHg ?? "-"} · Pulso {item.heartRateBpm ?? "-"} · Temp{" "}
                {item.temperatureCelsius?.toString() ?? "-"}
              </p>
              {item.notes ? <p className="mt-1 text-sm text-muted">{item.notes}</p> : null}
            </article>
          ))}
          {patient.nursingApplications.map((item) => (
            <article key={item.id} className="rounded-xl border border-border bg-surface-soft/60 p-3">
              <p className="font-bold">{item.medication}</p>
              <p className="text-sm text-muted">
                {item.appliedAt.toLocaleString("es-BO")} · {item.quantity ?? "Sin cantidad"} ·{" "}
                {item.route ?? "Sin vía"}
              </p>
              {item.notes ? <p className="mt-1 text-sm text-muted">{item.notes}</p> : null}
            </article>
          ))}
          {patient.nursingNotes.map((item) => (
            <article key={item.id} className="rounded-xl border border-border bg-surface-soft/60 p-3">
              <p className="font-bold">Nota de enfermería</p>
              <p className="text-sm text-muted">{item.createdAt.toLocaleString("es-BO")}</p>
              <p className="mt-1 text-sm text-muted">{item.note}</p>
            </article>
          ))}
          {patient.vitalSigns.length + patient.nursingApplications.length + patient.nursingNotes.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted">
              Sin registros de enfermería.
            </p>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <h3 className="mb-4 font-sora text-lg font-bold">Estudios</h3>
        <div className="grid gap-3">
          {patient.studies.map((study) => (
            <article key={study.id} className="rounded-xl border border-border bg-surface-soft/60 p-3">
              <p className="font-bold">{study.title}</p>
              <p className="text-sm text-muted">
                {studyTypeLabels[study.type]} ·{" "}
                {(study.performedAt ?? study.createdAt).toLocaleString("es-BO")}
              </p>
              {study.resultSummary ? <p className="mt-1 text-sm text-muted">{study.resultSummary}</p> : null}
            </article>
          ))}
          {patient.studies.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted">
              Sin estudios registrados.
            </p>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <h3 className="mb-4 font-sora text-lg font-bold">Cronología administrativa</h3>
        <div className="grid gap-3">
          {patient.sales.map((sale) => (
            <a
              key={sale.id}
              href={`/sigeco/administracion/ventas/${sale.id}`}
              className="focus-ring rounded-xl border border-border bg-surface-soft/60 p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold">{formatMoney(sale.totalCents)}</p>
                  <p className="text-sm text-muted">
                    Pagado {formatMoney(sale.paidCents)} · Saldo {formatMoney(sale.balanceCents)}
                  </p>
                </div>
                <span className="text-sm font-bold text-muted">{saleStatusLabels[sale.status]}</span>
              </div>
            </a>
          ))}
          {patient.sales.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted">
              Sin ventas ni cobros registrados.
            </p>
          ) : null}
        </div>
      </section>

      <section className="grid gap-4 rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <h3 className="font-sora text-lg font-bold">Crear seguimiento</h3>
        <form action={createFollowUpTaskAction} className="grid gap-3">
          <input type="hidden" name="patientId" value={patient.id} />
          <Field label="Título">
            <input className={internalInputClassName} name="title" defaultValue="Seguimiento a paciente" required />
          </Field>
          <Field label="Fecha y hora">
            <input className={internalInputClassName} name="dueAt" type="datetime-local" required />
          </Field>
          <Field label="Notas">
            <textarea className={`${internalInputClassName} min-h-20 py-3`} name="notes" />
          </Field>
          <button className="focus-ring min-h-12 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white">
            Crear seguimiento
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <h3 className="mb-4 font-sora text-lg font-bold">Historial de seguimiento</h3>
        <div className="grid gap-3">
          {patient.followUpTasks.map((task) => (
            <a key={task.id} href={`/sigeco/seguimientos/${task.id}`} className="focus-ring rounded-xl border border-border bg-surface-soft/60 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold">{task.title}</p>
                  <p className="text-sm text-muted">{task.dueAt.toLocaleString("es-BO")}</p>
                </div>
                <span className="text-sm font-bold text-muted">{followUpStatusLabels[task.status]}</span>
              </div>
              {task.attempts[0]?.notes ? <p className="mt-2 text-sm text-muted">{task.attempts[0].notes}</p> : null}
            </a>
          ))}
          {patient.followUpTasks.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted">
              Sin seguimientos registrados.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-xl border border-border bg-surface-soft/60 p-3">
      <p className="text-xs font-bold uppercase tracking-normal text-muted">{label}</p>
      <p className="mt-1 text-text">{value || "Sin registro"}</p>
    </div>
  );
}
