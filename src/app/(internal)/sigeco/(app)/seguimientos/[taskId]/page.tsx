import { notFound } from "next/navigation";
import { MessageCircle, Phone } from "lucide-react";
import type { FollowUpAttemptMethod, FollowUpStatus } from "@/generated/prisma/client";
import { Field, internalInputClassName } from "@/components/internal/Field";
import { MobileBackLink } from "@/components/internal/MobileBackLink";
import { NoticeForm } from "@/components/internal/NoticeForm";
import { SubmitButton } from "@/components/internal/SubmitButton";
import { buttonVariants } from "@/components/internal/ui/Button";
import { Card, CardHeader } from "@/components/internal/ui/Card";
import { Chip } from "@/components/internal/ui/Chip";
import { DesktopDetailContext } from "@/components/internal/ui/DesktopDetailContext";
import { InfoRow } from "@/components/internal/ui/InfoRow";
import { TimelineItem } from "@/components/internal/ui/TimelineItem";
import { createFollowUpAttemptAction } from "@/features/follow-ups/actions";
import { followUpAttemptMethodLabels, followUpStatusLabels } from "@/features/follow-ups/labels";
import { formatDateTime } from "@/lib/dates";
import { getFollowUpTaskById } from "@/modules/database/queries/follow-ups";
import { requirePermission } from "@/modules/permissions";
import { cn } from "@/lib/cn";

const methodOptions = Object.entries(followUpAttemptMethodLabels) as Array<[FollowUpAttemptMethod, string]>;
const resultOptions = ([
  "done",
  "improved",
  "not_improved",
  "no_answer",
  "wants_return",
  "requires_new_visit",
  "requires_doctor_call",
  "cancelled"
] as FollowUpStatus[]).map((status) => [status, followUpStatusLabels[status]] as [FollowUpStatus, string]);

type FollowUpDetailPageProps = {
  params: Promise<{ taskId: string }>;
};

export default async function FollowUpDetailPage({ params }: FollowUpDetailPageProps) {
  await requirePermission("followups_read");
  const { taskId } = await params;
  const task = await getFollowUpTaskById(taskId);

  if (!task) notFound();

  const phone = task.patient?.phone ?? task.lead?.phone;
  const name = task.patient?.fullName ?? task.lead?.name ?? "Sin paciente";
  const whatsappHref = phone ? `https://wa.me/${phone.replace(/\D/g, "")}` : undefined;
  const patientDeclinedContact = task.patient?.followUpPreference === "no_contact";

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[1.4fr_1fr]">
      <MobileBackLink href="/sigeco/seguimientos" label="Volver a Seguimiento" />
      <div className="grid gap-4 max-sm:contents">
        <Card className="max-sm:order-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium tabular-nums text-muted">
                {task.patient?.internalCode ?? "Sin ficha"}
              </p>
              <h2 className="font-sora text-xl font-bold tracking-tight text-text">{name}</h2>
              <p className="mt-0.5 text-sm text-muted">{task.title}</p>
            </div>
            <Chip dot>{followUpStatusLabels[task.status]}</Chip>
          </div>
          <dl className="mt-4 grid gap-x-6 gap-y-2 border-t border-border pt-4 text-sm sm:grid-cols-2">
            <InfoRow label="Vence" value={formatDateTime(task.dueAt)} />
            {phone ? <InfoRow label="Teléfono" value={phone} /> : null}
          </dl>
          {patientDeclinedContact ? (
            <div className="mt-4 rounded-[9px] bg-warning/10 px-4 py-3 text-sm">
              <p className="flex items-center gap-1.5 font-semibold text-warning">
                <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
                El paciente pidió no recibir seguimiento
              </p>
              <p className="mt-1 text-muted">
                Contáctalo solo si es necesario por razones clínicas y regístralo en las notas.
              </p>
            </div>
          ) : null}
          {phone ? (
            <div className="mt-4 flex gap-2">
              <a href={`tel:${phone}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                <Phone className="h-4 w-4" aria-hidden="true" />
                Llamar
              </a>
              {whatsappHref ? (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(buttonVariants({ size: "sm" }))}
                >
                  <MessageCircle className="h-4 w-4" aria-hidden="true" />
                  WhatsApp
                </a>
              ) : null}
            </div>
          ) : null}
        </Card>

        <Card className="max-sm:order-3">
          <CardHeader title="Historial" />
          <div className="grid gap-0">
            {task.attempts.map((attempt) => (
              <TimelineItem
                key={attempt.id}
                title={followUpStatusLabels[attempt.result]}
                meta={`${followUpAttemptMethodLabels[attempt.method]} · ${formatDateTime(attempt.contactedAt)}`}
                body={attempt.notes ?? undefined}
              />
            ))}
            {task.attempts.length === 0 ? (
              <p className="py-2 text-sm text-muted">Sin intentos registrados.</p>
            ) : null}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 max-sm:contents xl:sticky xl:top-0 xl:max-h-[calc(100dvh-6.5rem)] xl:overflow-y-auto xl:overscroll-contain xl:pr-1">
        <DesktopDetailContext
          eyebrow={task.patient?.internalCode ?? "Sin ficha"}
          title={name}
          meta={phone}
          status={<Chip dot>{followUpStatusLabels[task.status]}</Chip>}
        />
        <Card className="max-sm:order-2">
          <CardHeader title="Registrar contacto" />
          <NoticeForm action={createFollowUpAttemptAction} notice="Contacto registrado" className="grid gap-3">
            <input type="hidden" name="taskId" value={task.id} />
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
              <select className={internalInputClassName} name="result" defaultValue="done">
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
            <SubmitButton>Guardar seguimiento</SubmitButton>
          </NoticeForm>
        </Card>
      </div>
    </div>
  );
}
