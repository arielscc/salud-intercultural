import { notFound } from "next/navigation";
import { MessageCircle, Phone } from "lucide-react";
import type { FollowUpAttemptMethod } from "@/generated/prisma/client";
import { FollowUpAttemptForm } from "@/components/internal/follow-ups/FollowUpAttemptForm";
import { MobileBackLink } from "@/components/internal/MobileBackLink";
import { buttonVariants } from "@/components/internal/ui/Button";
import { Card, CardHeader } from "@/components/internal/ui/Card";
import { Chip } from "@/components/internal/ui/Chip";
import { DesktopDetailContext } from "@/components/internal/ui/DesktopDetailContext";
import { InfoRow } from "@/components/internal/ui/InfoRow";
import { TimelineItem } from "@/components/internal/ui/TimelineItem";
import {
  followUpAttemptMethodLabels,
  followUpDomainLabels,
  followUpPriorityLabels,
  followUpResultLabels,
  followUpStatusLabels,
  followUpTypeLabels
} from "@/features/follow-ups/labels";
import { canRoleWorkFollowUpType } from "@/features/follow-ups/policy";
import { canContactPatient } from "@/features/patient-consents/policy";
import { formatDateTime } from "@/lib/dates";
import { getFollowUpTaskById } from "@/modules/database/queries/follow-ups";
import { requirePermission } from "@/modules/permissions";
import { cn } from "@/lib/cn";
import { createCallLink, createWhatsAppLink } from "@/lib/whatsapp";

const methodOptions = Object.entries(followUpAttemptMethodLabels) as Array<[FollowUpAttemptMethod, string]>;
type FollowUpDetailPageProps = {
  params: Promise<{ taskId: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function FollowUpDetailPage({
  params,
  searchParams
}: FollowUpDetailPageProps) {
  const user = await requirePermission("followups_read");
  const [{ taskId }, query] = await Promise.all([params, searchParams]);
  const task = await getFollowUpTaskById(taskId, user.role);

  if (!task) notFound();

  const phone = task.patient?.phone ?? task.lead?.phone;
  const name = task.patient?.fullName ?? task.lead?.name ?? "Sin paciente";
  const followUpConsent = task.patient?.consents[0];
  const canCall = task.patient
    ? canContactPatient(followUpConsent, "follow_up", "call")
    : Boolean(phone);
  const canWhatsApp = task.patient
    ? canContactPatient(followUpConsent, "follow_up", "whatsapp")
    : Boolean(phone);
  const whatsappHref =
    phone && canWhatsApp ? createWhatsAppLink("", phone) : undefined;
  const availableMethods = methodOptions.filter(([method]) => {
    if (!task.patient) return true;
    if (method === "in_person") return true;
    if (method === "call") return canCall;
    if (method === "whatsapp") return canWhatsApp;
    return canCall || canWhatsApp;
  }).map(([method]) => method);
  const canRecord =
    task.status === "pending" &&
    canRoleWorkFollowUpType(user.role, task.type);
  const defaultNextDueAt = new Date();
  defaultNextDueAt.setDate(defaultNextDueAt.getDate() + 1);
  defaultNextDueAt.setHours(10, 0, 0, 0);

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[1.4fr_1fr]">
      <MobileBackLink href="/sigeco/seguimientos" label="Volver a Seguimiento" />
      <div className="grid gap-4 max-sm:contents">
        {query.error ? (
          <div
            className="rounded-[9px] border border-error/30 bg-error/10 px-4 py-3 text-sm text-error max-sm:order-1"
            role="alert"
          >
            {query.error === "role_not_allowed"
              ? "Esta tarea debe resolverla el responsable del área indicada."
              : query.error === "task_already_closed"
                ? "Esta tarea ya fue cerrada y no admite otro resultado."
                : "Revisa el resultado y la fecha del próximo intento."}
          </div>
        ) : null}
        <Card className="max-sm:order-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium tabular-nums text-muted">
                {task.patient?.internalCode ?? "Sin ficha"}
              </p>
              <h2 className="font-sora text-xl font-bold tracking-tight text-text">{name}</h2>
              <p className="mt-0.5 text-sm text-muted">{task.title}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Chip tone="primary">{followUpTypeLabels[task.type]}</Chip>
                <Chip
                  tone={
                    task.priority === "urgent"
                      ? "error"
                      : task.priority === "high"
                        ? "warning"
                        : "neutral"
                  }
                >
                  Prioridad {followUpPriorityLabels[task.priority].toLocaleLowerCase("es-BO")}
                </Chip>
              </div>
            </div>
            <Chip dot>{followUpStatusLabels[task.status]}</Chip>
          </div>
          <dl className="mt-4 grid gap-x-6 gap-y-2 border-t border-border pt-4 text-sm sm:grid-cols-2">
            <InfoRow label="Vence" value={formatDateTime(task.dueAt)} />
            {phone ? <InfoRow label="Teléfono" value={phone} /> : null}
            <InfoRow
              label="Responsable"
              value={
                task.assignedTo?.name ??
                task.assignedTo?.email ??
                "Sin asignar"
              }
            />
            <InfoRow
              label="Relación"
              value={followUpDomainLabels[task.domain]}
            />
            {task.result ? (
              <InfoRow
                label="Último resultado"
                value={followUpResultLabels[task.result]}
              />
            ) : null}
          </dl>
          {task.escalatedFromTask ? (
            <p className="mt-4 rounded-[9px] bg-surface-soft px-3 py-2 text-sm text-muted">
              Esta llamada fue escalada desde{" "}
              <a
                href={`/sigeco/seguimientos/${task.escalatedFromTask.id}`}
                className="font-semibold text-primary-dark hover:underline"
              >
                {task.escalatedFromTask.title}
              </a>
              .
            </p>
          ) : null}
          {task.escalatedToTask ? (
            <p className="mt-4 rounded-[9px] border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
              Se creó una{" "}
              <a
                href={`/sigeco/seguimientos/${task.escalatedToTask.id}`}
                className="font-semibold underline"
              >
                llamada médica
              </a>
              {task.escalatedToTask.assignedTo
                ? ` para ${task.escalatedToTask.assignedTo.name ?? task.escalatedToTask.assignedTo.email}`
                : " todavía sin médico asignado"}
              .
            </p>
          ) : null}
          {task.patient && (!canCall || !canWhatsApp) ? (
            <div className="mt-4 rounded-[9px] bg-warning/10 px-4 py-3 text-sm">
              <p className="flex items-center gap-1.5 font-semibold text-warning">
                <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
                Contacto limitado por la decisión del paciente
              </p>
              <p className="mt-1 text-muted">
                {canCall || canWhatsApp
                  ? `Solo está autorizado: ${[
                      canWhatsApp ? "WhatsApp" : null,
                      canCall ? "llamada" : null
                    ]
                      .filter(Boolean)
                      .join(" y ")}.`
                  : "No se permiten llamadas ni WhatsApp hasta registrar una autorización vigente."}
              </p>
            </div>
          ) : null}
          {phone ? (
            <div className="mt-4 flex gap-2">
              {canCall ? (
                <a href={createCallLink(phone)} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                  <Phone className="h-4 w-4" aria-hidden="true" />
                  Llamar
                </a>
              ) : null}
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
          <CardHeader
            title="Historial de intentos"
            description="Contactos realizados y resultados registrados para esta tarea."
          />
          <div className="grid gap-0">
            {task.attempts.map((attempt) => (
              <TimelineItem
                key={attempt.id}
                title={followUpResultLabels[attempt.result]}
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
          <CardHeader
            title="Registrar contacto"
            description="Documenta el canal utilizado, resultado y próximo paso del seguimiento."
          />
          {canRecord ? (
            <FollowUpAttemptForm
              taskId={task.id}
              type={task.type}
              availableMethods={availableMethods}
              defaultNextDueAt={defaultNextDueAt}
            />
          ) : task.status !== "pending" ? (
            <p className="text-sm text-muted">
              La tarea está cerrada. El historial conserva el resultado.
            </p>
          ) : task.type === "doctor_call" ? (
            <p className="rounded-[9px] border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
              Esta llamada debe registrarla el médico. No puede cerrarse como
              una gestión administrativa.
            </p>
          ) : (
            <p className="text-sm text-muted">
              Esta tarea corresponde a otro responsable.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
