import { notFound } from "next/navigation";
import type { InternalLeadContactMethod, InternalLeadContactResult, InternalLeadStatus } from "@/generated/prisma/client";
import { Field, internalInputClassName } from "@/components/internal/Field";
import { LeadStatusPill } from "@/components/internal/StatusPill";
import {
  contactMethodLabels,
  contactResultLabels,
  leadSourceLabels,
  leadStatusLabels
} from "@/features/crm/labels";
import {
  createLeadContactAttemptAction,
  createLeadReminderAction,
  updateLeadStatusAction
} from "@/features/crm/actions";
import { getInternalLeadById } from "@/modules/database/queries/leads-v3";
import { requirePermission } from "@/modules/permissions";

const statusOptions = Object.entries(leadStatusLabels) as Array<[InternalLeadStatus, string]>;
const methodOptions = Object.entries(contactMethodLabels) as Array<[InternalLeadContactMethod, string]>;
const resultOptions = Object.entries(contactResultLabels) as Array<[InternalLeadContactResult, string]>;

type LeadDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function InternalLeadDetailPage({ params }: LeadDetailPageProps) {
  await requirePermission("leads_read");
  const { id } = await params;
  const lead = await getInternalLeadById(id);

  if (!lead) notFound();

  return (
    <div className="grid gap-5">
      <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-muted">{leadSourceLabels[lead.source]}</p>
            <h2 className="font-sora text-2xl font-bold">{lead.name || "Sin nombre"}</h2>
            <p className="mt-1 text-sm text-muted">{lead.phone}</p>
          </div>
          <LeadStatusPill status={lead.status} />
        </div>
        <div className="grid gap-2 text-sm text-muted">
          {lead.email ? <p>Email: {lead.email}</p> : null}
          {lead.city ? <p>Ciudad: {lead.city}</p> : null}
          {lead.symptoms ? <p>Síntomas: {lead.symptoms}</p> : null}
          {lead.intentionToVisit ? <p>Intención: {lead.intentionToVisit}</p> : null}
          {lead.commercialNotes ? <p>Notas: {lead.commercialNotes}</p> : null}
        </div>
      </section>

      <section className="grid gap-4 rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <h3 className="font-sora text-lg font-bold">Actualizar estado</h3>
        <form action={updateLeadStatusAction} className="grid gap-3">
          <input type="hidden" name="leadId" value={lead.id} />
          <Field label="Estado">
            <select className={internalInputClassName} name="status" defaultValue={lead.status}>
              {statusOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Nota">
            <input className={internalInputClassName} name="note" />
          </Field>
          <button className="focus-ring min-h-12 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white">
            Guardar estado
          </button>
        </form>
      </section>

      <section className="grid gap-4 rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <h3 className="font-sora text-lg font-bold">Registrar contacto</h3>
        <form action={createLeadContactAttemptAction} className="grid gap-3">
          <input type="hidden" name="leadId" value={lead.id} />
          <Field label="Método">
            <select className={internalInputClassName} name="method" defaultValue="call">
              {methodOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Resultado">
            <select className={internalInputClassName} name="result" defaultValue="contacted">
              {resultOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Notas">
            <textarea className={`${internalInputClassName} min-h-24 py-3`} name="notes" />
          </Field>
          <button className="focus-ring min-h-12 rounded-xl border border-border bg-surface-soft px-4 py-3 text-sm font-bold">
            Registrar contacto
          </button>
        </form>
      </section>

      <section className="grid gap-4 rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <h3 className="font-sora text-lg font-bold">Crear recordatorio</h3>
        <form action={createLeadReminderAction} className="grid gap-3">
          <input type="hidden" name="leadId" value={lead.id} />
          <Field label="Fecha y hora">
            <input className={internalInputClassName} name="dueAt" type="datetime-local" required />
          </Field>
          <Field label="Nota">
            <input className={internalInputClassName} name="note" />
          </Field>
          <button className="focus-ring min-h-12 rounded-xl border border-border bg-surface-soft px-4 py-3 text-sm font-bold">
            Crear recordatorio
          </button>
        </form>
      </section>

      <Timeline title="Historial comercial">
        {lead.statusHistory.map((item) => (
          <TimelineItem
            key={item.id}
            title={`Estado: ${leadStatusLabels[item.toStatus]}`}
            meta={item.createdAt.toLocaleString("es-BO")}
            body={item.note ?? undefined}
          />
        ))}
        {lead.contactAttempts.map((item) => (
          <TimelineItem
            key={item.id}
            title={`${contactMethodLabels[item.method]} · ${contactResultLabels[item.result]}`}
            meta={item.contactedAt.toLocaleString("es-BO")}
            body={item.notes ?? undefined}
          />
        ))}
        {lead.reminders.map((item) => (
          <TimelineItem
            key={item.id}
            title={`Recordatorio ${item.status}`}
            meta={item.dueAt.toLocaleString("es-BO")}
            body={item.note ?? undefined}
          />
        ))}
      </Timeline>
    </div>
  );
}

function Timeline({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <h3 className="mb-4 font-sora text-lg font-bold">{title}</h3>
      <div className="grid gap-3">{children}</div>
    </section>
  );
}

function TimelineItem({
  title,
  meta,
  body
}: {
  title: string;
  meta: string;
  body?: string;
}) {
  return (
    <article className="rounded-xl border border-border bg-surface-soft/60 p-3">
      <p className="font-bold">{title}</p>
      <p className="text-xs font-semibold text-muted">{meta}</p>
      {body ? <p className="mt-2 text-sm text-muted">{body}</p> : null}
    </article>
  );
}
