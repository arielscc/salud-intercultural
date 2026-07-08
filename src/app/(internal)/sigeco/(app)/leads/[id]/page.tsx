import { notFound } from "next/navigation";
import Link from "next/link";
import type { InternalLeadContactMethod, InternalLeadContactResult, InternalLeadStatus } from "@/generated/prisma/client";
import { Field, internalInputClassName } from "@/components/internal/Field";
import { LeadStatusPill } from "@/components/internal/StatusPill";
import { Button, buttonVariants } from "@/components/internal/ui/Button";
import { Card, CardHeader } from "@/components/internal/ui/Card";
import { InfoRow } from "@/components/internal/ui/InfoRow";
import { TimelineItem } from "@/components/internal/ui/TimelineItem";
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
import { cn } from "@/lib/cn";

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
    <div className="grid items-start gap-4 xl:grid-cols-[1.4fr_1fr]">
      <div className="grid gap-4">
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-muted">{leadSourceLabels[lead.source]}</p>
              <h2 className="font-sora text-xl font-bold tracking-tight text-text">
                {lead.name || "Sin nombre"}
              </h2>
              <p className="mt-0.5 text-sm tabular-nums text-muted">{lead.phone}</p>
            </div>
            <LeadStatusPill status={lead.status} />
          </div>

          <dl className="mt-4 grid gap-x-6 gap-y-2 border-t border-border pt-4 text-sm sm:grid-cols-2">
            {lead.email ? <InfoRow label="Email" value={lead.email} /> : null}
            {lead.city ? <InfoRow label="Ciudad" value={lead.city} /> : null}
            {lead.symptoms ? <InfoRow label="Síntomas" value={lead.symptoms} wide /> : null}
            {lead.intentionToVisit ? <InfoRow label="Intención" value={lead.intentionToVisit} /> : null}
            {lead.commercialNotes ? <InfoRow label="Notas" value={lead.commercialNotes} wide /> : null}
          </dl>

          {lead.convertedPatientId ? (
            <p className="mt-4 inline-flex items-center gap-1.5 rounded-[7px] bg-success/10 px-3 py-2 text-sm font-semibold text-success">
              <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
              Lead convertido a paciente.
            </p>
          ) : (
            <Link
              href={`/sigeco/pacientes/nuevo?leadId=${lead.id}&name=${encodeURIComponent(lead.name ?? "")}&phone=${encodeURIComponent(lead.phone)}&city=${encodeURIComponent(lead.city ?? "")}`}
              className={cn(buttonVariants({ size: "sm" }), "mt-4")}
            >
              Convertir a paciente
            </Link>
          )}
        </Card>

        <Card>
          <CardHeader title="Historial comercial" />
          <div className="grid gap-0">
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
          </div>
        </Card>
      </div>

      <div className="grid gap-4">
        <Card>
          <CardHeader title="Actualizar estado" />
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
            <Button type="submit">Guardar estado</Button>
          </form>
        </Card>

        <Card>
          <CardHeader title="Registrar contacto" />
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
            <Button type="submit" variant="outline">
              Registrar contacto
            </Button>
          </form>
        </Card>

        <Card>
          <CardHeader title="Crear recordatorio" />
          <form action={createLeadReminderAction} className="grid gap-3">
            <input type="hidden" name="leadId" value={lead.id} />
            <Field label="Fecha y hora">
              <input className={internalInputClassName} name="dueAt" type="datetime-local" required />
            </Field>
            <Field label="Nota">
              <input className={internalInputClassName} name="note" />
            </Field>
            <Button type="submit" variant="outline">
              Crear recordatorio
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}

