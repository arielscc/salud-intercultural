import Link from "next/link";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock3,
  MessageCircle,
  Phone,
  RefreshCw,
  Settings2
} from "lucide-react";
import type { SupervisedReminderCandidateStatus } from "@/generated/prisma/client";
import { ReminderRuleForm } from "@/components/internal/supervised-reminders/ReminderRuleForm";
import { DateTimePickerField } from "@/components/internal/ui/DatePickerField";
import { Button, buttonVariants } from "@/components/internal/ui/Button";
import { Card, CardHeader } from "@/components/internal/ui/Card";
import { Chip } from "@/components/internal/ui/Chip";
import { KpiCard } from "@/components/internal/ui/KpiCard";
import { PageHeader } from "@/components/internal/ui/PageHeader";
import {
  generateReminderCandidatesAction,
  reviewReminderCandidateAction
} from "@/features/supervised-reminders/actions";
import {
  minuteToTime,
  reminderChannelLabels,
  reminderEventLabels
} from "@/features/supervised-reminders/policy";
import { followUpTypeLabels } from "@/features/follow-ups/labels";
import { canContactPatient } from "@/features/patient-consents/policy";
import { roleHasPermission } from "@/features/internal-auth/permissions";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/dates";
import { createCallLink, createWhatsAppLink } from "@/lib/whatsapp";
import {
  getReminderRuleOwners,
  getSupervisedReminderCandidates,
  getSupervisedReminderRules,
  getSupervisedReminderSummary
} from "@/modules/database/queries/supervised-reminders";
import { requirePermission } from "@/modules/permissions";

type ReminderPageProps = {
  searchParams: Promise<{
    estado?: string;
    aviso?: string;
    error?: string;
    created?: string;
    blocked?: string;
  }>;
};

const statuses: SupervisedReminderCandidateStatus[] = [
  "pending_review",
  "failed",
  "blocked",
  "approved",
  "dismissed"
];

const statusLabels: Record<SupervisedReminderCandidateStatus, string> = {
  pending_review: "Por revisar",
  approved: "Aprobados",
  blocked: "Bloqueados",
  dismissed: "Descartados",
  failed: "Con fallo"
};

const blockReasonLabels: Record<string, string> = {
  legacy_no_contact: "El paciente indicó que no desea contacto.",
  call_not_consented: "No existe consentimiento vigente para llamadas.",
  whatsapp_not_consented: "No existe consentimiento vigente para WhatsApp."
};

function statusTone(status: SupervisedReminderCandidateStatus) {
  if (status === "approved") return "success" as const;
  if (status === "pending_review") return "warning" as const;
  if (status === "dismissed") return "neutral" as const;
  return "error" as const;
}

export default async function SupervisedRemindersPage({
  searchParams
}: ReminderPageProps) {
  const user = await requirePermission("followups_read");
  const query = await searchParams;
  const status = statuses.includes(query.estado as SupervisedReminderCandidateStatus)
    ? (query.estado as SupervisedReminderCandidateStatus)
    : "pending_review";
  const canReview = roleHasPermission(user.role, "reminders_review");
  const canManage = roleHasPermission(user.role, "reminder_rules_manage");
  const [candidates, summary, rules, owners] = await Promise.all([
    getSupervisedReminderCandidates({ status }),
    getSupervisedReminderSummary(),
    getSupervisedReminderRules(),
    getReminderRuleOwners()
  ]);

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Recordatorios supervisados"
        description="SIGECO prepara el trabajo; una persona revisa antes de contactar."
        actions={
          <Link
            href="/sigeco/seguimientos"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Volver a seguimientos
          </Link>
        }
      />

      {query.error ? (
        <p className="rounded-[9px] border border-error/30 bg-error/10 px-4 py-3 text-sm font-medium text-error">
          {query.error === "consent-blocked"
            ? "No se creó el seguimiento: el consentimiento cambió y ahora bloquea este contacto."
            : query.error === "invalid-rule"
              ? "La regla tiene datos incompletos o el tipo no corresponde al evento."
              : "No se pudo guardar la revisión. Verifica los datos e inténtalo otra vez."}
        </p>
      ) : null}
      {query.aviso ? (
        <p className="rounded-[9px] border border-success/30 bg-success/10 px-4 py-3 text-sm font-medium text-success">
          {query.aviso === "reviewed"
            ? `Revisión terminada: ${query.created ?? "0"} nuevos; ${query.blocked ?? "0"} bloqueados por consentimiento.`
            : "Cambio guardado correctamente."}
        </p>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={Clock3}
          label="Por revisar"
          value={summary.pending_review ?? 0}
        />
        <KpiCard
          icon={AlertTriangle}
          label="Con fallo"
          value={summary.failed ?? 0}
        />
        <KpiCard
          icon={Ban}
          label="Bloqueados"
          value={summary.blocked ?? 0}
        />
        <KpiCard
          icon={CheckCircle2}
          label="Aprobados"
          value={summary.approved ?? 0}
        />
      </section>

      <Card>
        <CardHeader
          title="Preparar pendientes"
          description="Busca visitas y tratamientos recientes. La operación es idempotente: repetirla no duplica candidatos ni tareas."
          action={
            canReview ? (
              <form action={generateReminderCandidatesAction}>
                <Button type="submit" size="sm">
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  Revisar eventos ahora
                </Button>
              </form>
            ) : null
          }
        />
        <p className="text-sm text-muted">
          Solo se consideran reglas activas, horarios permitidos y el consentimiento
          vigente. Esta pantalla no envía mensajes automáticamente.
        </p>
      </Card>

      <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="Estado de recordatorios">
        {statuses.map((value) => (
          <Link
            key={value}
            href={`/sigeco/seguimientos/recordatorios?estado=${value}`}
            className={cn(
              buttonVariants({ variant: value === status ? "primary" : "outline", size: "sm" }),
              "shrink-0"
            )}
          >
            {statusLabels[value]} ({summary[value] ?? 0})
          </Link>
        ))}
      </nav>

      <section className="grid gap-3">
        {candidates.length === 0 ? (
          <Card>
            <p className="font-semibold text-text">No hay recordatorios en “{statusLabels[status]}”.</p>
            <p className="mt-1 text-sm text-muted">
              Si existen reglas activas, usa “Revisar eventos ahora” para preparar nuevos pendientes.
            </p>
          </Card>
        ) : null}

        {candidates.map((candidate) => {
          const consent = candidate.patient.consents[0];
          const canCall = canContactPatient(consent, "follow_up", "call");
          const canWhatsApp = canContactPatient(
            consent,
            "follow_up",
            "whatsapp"
          );
          return (
            <Card key={candidate.id} className="grid gap-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-text">
                      {candidate.patient.fullName}
                    </h3>
                    <Chip tone={statusTone(candidate.status)} dot>
                      {statusLabels[candidate.status]}
                    </Chip>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {candidate.ruleVersion.name} · versión {candidate.ruleVersion.version} · responsable {candidate.ruleVersion.owner.name ?? candidate.ruleVersion.owner.email}
                  </p>
                </div>
                <div className="text-right text-xs text-muted">
                  <p>{reminderChannelLabels[candidate.channel]}</p>
                  <p className="font-medium text-text">{formatDateTime(candidate.scheduledFor)}</p>
                </div>
              </div>

              <div className="rounded-[9px] bg-surface-soft p-3 text-sm leading-6 text-text">
                {candidate.renderedBody}
              </div>

              {candidate.blockReason ? (
                <p className="rounded-[9px] bg-error/10 px-3 py-2 text-sm text-error">
                  {blockReasonLabels[candidate.blockReason] ?? candidate.blockReason}
                </p>
              ) : null}
              {candidate.lastErrorCode ? (
                <p className="rounded-[9px] bg-error/10 px-3 py-2 text-sm text-error">
                  Fallo registrado: {candidate.lastErrorCode}
                </p>
              ) : null}

              {canReview && candidate.status === "pending_review" ? (
                <div className="grid gap-3 border-t border-border pt-4 lg:grid-cols-[auto_1fr]">
                  <form action={reviewReminderCandidateAction}>
                    <input type="hidden" name="candidateId" value={candidate.id} />
                    <input type="hidden" name="action" value="approve" />
                    <Button type="submit">Aprobar y crear seguimiento</Button>
                  </form>
                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <form action={reviewReminderCandidateAction} className="flex gap-2">
                      <input type="hidden" name="candidateId" value={candidate.id} />
                      <input type="hidden" name="action" value="fail" />
                      <input
                        className="min-h-10 rounded-[9px] border border-border px-3 text-sm"
                        name="errorCode"
                        placeholder="Motivo del fallo"
                        required
                      />
                      <Button type="submit" variant="outline" size="sm">Registrar fallo</Button>
                    </form>
                    <form action={reviewReminderCandidateAction}>
                      <input type="hidden" name="candidateId" value={candidate.id} />
                      <input type="hidden" name="action" value="dismiss" />
                      <Button type="submit" variant="ghost" size="sm">Descartar</Button>
                    </form>
                  </div>
                </div>
              ) : null}

              {canReview && candidate.status === "failed" ? (
                <form
                  action={reviewReminderCandidateAction}
                  className="grid gap-3 border-t border-border pt-4 sm:grid-cols-[1fr_auto] sm:items-end"
                >
                  <input type="hidden" name="candidateId" value={candidate.id} />
                  <input type="hidden" name="action" value="retry" />
                  <label className="grid gap-1.5 text-[13px] font-medium text-text">
                    Nuevo momento para revisar
                    <DateTimePickerField
                      name="retryAt"
                      defaultDate={candidate.retryAt ?? candidate.scheduledFor}
                      required
                    />
                  </label>
                  <Button type="submit">
                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                    Programar reintento
                  </Button>
                </form>
              ) : null}

              {canReview && candidate.status === "blocked" ? (
                <form action={reviewReminderCandidateAction} className="border-t border-border pt-4">
                  <input type="hidden" name="candidateId" value={candidate.id} />
                  <input type="hidden" name="action" value="approve" />
                  <Button type="submit" variant="outline" size="sm">
                    Volver a comprobar consentimiento
                  </Button>
                </form>
              ) : null}

              {canReview && candidate.status === "approved" && candidate.task ? (
                <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                  {canCall ? (
                    <a
                      href={createCallLink(candidate.patient.phone)}
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      <Phone className="h-4 w-4" aria-hidden="true" /> Llamar
                    </a>
                  ) : null}
                  {canWhatsApp ? (
                    <a
                      href={createWhatsAppLink(candidate.renderedBody, candidate.patient.phone)}
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      <MessageCircle className="h-4 w-4" aria-hidden="true" /> WhatsApp
                    </a>
                  ) : null}
                  <Link
                    href={`/sigeco/seguimientos/${candidate.task.id}`}
                    className={buttonVariants({ size: "sm" })}
                  >
                    Registrar resultado
                  </Link>
                </div>
              ) : null}
            </Card>
          );
        })}
      </section>

      <Card>
        <CardHeader
          title="Reglas y plantillas versionadas"
          description="Cada cambio crea una nueva versión y conserva la anterior."
          action={<Settings2 className="h-5 w-5 text-muted" aria-hidden="true" />}
        />
        {rules.length === 0 ? (
          <p className="text-sm text-muted">Todavía no existen reglas.</p>
        ) : (
          <div className="grid gap-3">
            {rules.map((rule) => {
              const version = rule.activeVersion;
              if (!version) return null;
              return (
                <details key={rule.id} className="rounded-[9px] border border-border p-3">
                  <summary className="cursor-pointer list-none">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-text">{version.name}</p>
                        <p className="mt-0.5 text-xs text-muted">
                          {reminderEventLabels[version.event]} · {followUpTypeLabels[version.followUpType]} · {reminderChannelLabels[version.channel]}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Chip tone={version.enabled ? "success" : "neutral"}>
                          {version.enabled ? "Activa" : "Inactiva"}
                        </Chip>
                        <Chip>v{version.version} de {rule._count.versions}</Chip>
                      </div>
                    </div>
                  </summary>
                  <div className="mt-4 border-t border-border pt-4">
                    <p className="mb-4 text-sm text-muted">
                      Responsable: {version.owner.name ?? version.owner.email}. Horario: {minuteToTime(version.windowStartMinute)}–{minuteToTime(version.windowEndMinute)}.
                    </p>
                    {canManage ? (
                      <ReminderRuleForm
                        owners={owners}
                        defaults={{
                          ruleId: rule.id,
                          name: version.name,
                          event: version.event,
                          channel: version.channel,
                          templateBody: version.templateBody,
                          delayDays: version.delayDays,
                          lookbackDays: version.lookbackDays,
                          windowStartMinute: version.windowStartMinute,
                          windowEndMinute: version.windowEndMinute,
                          weekdays: version.weekdays,
                          ownerId: version.ownerId,
                          enabled: version.enabled
                        }}
                      />
                    ) : (
                      <div className="rounded-[9px] bg-surface-soft p-3 text-sm text-text">
                        {version.templateBody}
                      </div>
                    )}
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </Card>

      {canManage ? (
        <Card>
          <CardHeader
            title="Crear una regla"
            description="Empieza inactiva si todavía deseas revisar su configuración."
          />
          {owners.length > 0 ? (
            <ReminderRuleForm owners={owners} />
          ) : (
            <p className="rounded-[9px] bg-warning/10 p-3 text-sm text-warning">
              Primero debe existir una persona activa de Recepción, idealmente Marlen, para asignarle la revisión.
            </p>
          )}
        </Card>
      ) : null}
    </div>
  );
}
