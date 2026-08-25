import Link from "next/link";
import {
  AlertTriangle,
  Clock3,
  MessageSquareText,
  ShieldAlert,
  Star
} from "lucide-react";
import type {
  FeedbackCaseStatus,
  FeedbackSeverity
} from "@/generated/prisma/client";
import { CreateFeedbackRequestForm } from "@/components/internal/patient-feedback/CreateFeedbackRequestForm";
import { Field, internalInputClassName } from "@/components/internal/Field";
import { Button, buttonVariants } from "@/components/internal/ui/Button";
import { Card, CardHeader } from "@/components/internal/ui/Card";
import { Chip } from "@/components/internal/ui/Chip";
import { DateTimePickerField } from "@/components/internal/ui/DatePickerField";
import { KpiCard } from "@/components/internal/ui/KpiCard";
import { PageHeader } from "@/components/internal/ui/PageHeader";
import {
  cancelFeedbackRequestAction,
  updateFeedbackCaseAction
} from "@/features/patient-feedback/actions";
import {
  feedbackAreaLabels,
  feedbackClassificationLabels,
  feedbackKindLabels,
  feedbackSeverityLabels,
  feedbackStatusLabels,
  isFeedbackCaseOverdue
} from "@/features/patient-feedback/policy";
import { roleHasPermission } from "@/features/internal-auth/permissions";
import { formatDateTime } from "@/lib/dates";
import {
  getFeedbackEligibleVisits,
  getFeedbackOwners,
  getPatientFeedbackCases,
  getPatientFeedbackDashboard,
  getRecentPatientFeedbackRequests
} from "@/modules/database/queries/patient-feedback";
import { requirePermission } from "@/modules/permissions";
import { getModuleAccessState } from "@/modules/database/queries/modules";
import { canUse } from "@/features/modules/access";

type FeedbackPageProps = {
  searchParams: Promise<{
    estado?: string;
    prioridad?: string;
    aviso?: string;
    error?: string;
  }>;
};

const statuses: FeedbackCaseStatus[] = [
  "new",
  "reviewing",
  "awaiting_patient",
  "resolved",
  "closed"
];
const severities: FeedbackSeverity[] = ["standard", "priority", "critical"];

function severityTone(severity: FeedbackSeverity) {
  if (severity === "critical") return "error" as const;
  if (severity === "priority") return "warning" as const;
  return "neutral" as const;
}

export default async function FeedbackPage({ searchParams }: FeedbackPageProps) {
  const user = await requirePermission("feedback_read");
  const moduleAccess = await getModuleAccessState();
  const query = await searchParams;
  const status = statuses.includes(query.estado as FeedbackCaseStatus)
    ? (query.estado as FeedbackCaseStatus)
    : undefined;
  const severity = severities.includes(query.prioridad as FeedbackSeverity)
    ? (query.prioridad as FeedbackSeverity)
    : undefined;
  const canManage = canUse(user.role, moduleAccess, "feedback_manage");
  const [cases, dashboard, visits, owners, requests] = await Promise.all([
    getPatientFeedbackCases({ status, severity }),
    getPatientFeedbackDashboard(),
    getFeedbackEligibleVisits(),
    getFeedbackOwners(),
    getRecentPatientFeedbackRequests()
  ]);

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Opiniones y reclamos"
        description="Piloto manual: encuestas privadas, plazos y revisión de Dirección."
      />

      {query.error ? (
        <p className="rounded-[9px] bg-error/10 px-4 py-3 text-sm font-medium text-error">
          No se pudo guardar el cambio. Revisa el responsable, plazo y nota interna.
        </p>
      ) : null}
      {query.aviso ? (
        <p className="rounded-[9px] bg-success/10 px-4 py-3 text-sm font-medium text-success">
          Cambio guardado correctamente.
        </p>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={MessageSquareText} label="Casos abiertos" value={dashboard.open} />
        <KpiCard
          icon={ShieldAlert}
          label="Críticos abiertos"
          value={dashboard.critical}
          flag={dashboard.critical ? { tone: "crit", label: "Revisar ahora" } : undefined}
        />
        <KpiCard
          icon={Clock3}
          label="Fuera de plazo"
          value={dashboard.overdue}
          flag={dashboard.overdue ? { tone: "warn", label: "Requiere respuesta" } : undefined}
        />
        <KpiCard icon={Star} label="Calificación 90 días" value={dashboard.averageRating.toFixed(1)} />
      </section>

      {canManage ? (
        <Card>
          <CardHeader
            title="Crear enlace del piloto"
            description="Se entrega manualmente. Todavía no se conecta a recordatorios automáticos."
          />
          <CreateFeedbackRequestForm visits={visits} owners={owners} />
        </Card>
      ) : null}

      <Card>
        <CardHeader
          title="Filtros de la bandeja"
          description={`${cases.length} casos visibles`}
        />
        <form method="get" className="grid gap-3 sm:grid-cols-3 sm:items-end">
          <Field label="Estado">
            <select className={internalInputClassName} name="estado" defaultValue={status ?? ""}>
              <option value="">Todos</option>
              {statuses.map((value) => <option key={value} value={value}>{feedbackStatusLabels[value]}</option>)}
            </select>
          </Field>
          <Field label="Prioridad">
            <select className={internalInputClassName} name="prioridad" defaultValue={severity ?? ""}>
              <option value="">Todas</option>
              {severities.map((value) => <option key={value} value={value}>{feedbackSeverityLabels[value]}</option>)}
            </select>
          </Field>
          <Button type="submit" variant="outline">Aplicar filtros</Button>
        </form>
      </Card>

      <section className="grid gap-3">
        {cases.length === 0 ? (
          <Card>
            <p className="font-semibold text-text">No hay casos para estos filtros.</p>
            <p className="mt-1 text-sm text-muted">Las encuestas positivas permanecen en tendencias aunque no abran trabajo.</p>
          </Card>
        ) : null}
        {cases.map((item) => {
          const overdue = isFeedbackCaseOverdue(item);
          return (
            <Card key={item.id} className="grid gap-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-text">{item.feedback.patient.fullName}</h3>
                    <Chip tone={severityTone(item.severity)}>{feedbackSeverityLabels[item.severity]}</Chip>
                    <Chip tone={overdue ? "error" : "primary"}>{feedbackStatusLabels[item.status]}</Chip>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {item.feedback.patient.internalCode} · visita {formatDateTime(item.feedback.visit.checkedInAt)} · responsable {item.owner.name ?? item.owner.email}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-text">{item.feedback.rating}/5</p>
                  <p className="text-xs text-muted">{feedbackKindLabels[item.feedback.kind]}</p>
                </div>
              </div>

              {item.feedback.healthRiskFlag ? (
                <div className="rounded-[9px] border border-error/30 bg-error/10 p-3 text-sm text-error">
                  <p className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4" /> Posible incidente clínico informado por el paciente</p>
                  <p className="mt-1 text-xs leading-5">Es una señal para revisión prioritaria; no confirma por sí sola que ocurrió un daño clínico.</p>
                </div>
              ) : null}

              <div className="grid gap-2 text-sm sm:grid-cols-3">
                <p><span className="text-muted">Área:</span> {feedbackAreaLabels[item.feedback.area]}</p>
                <p><span className="text-muted">Clasificación:</span> {feedbackClassificationLabels[item.classification]}</p>
                <p className={overdue ? "font-semibold text-error" : ""}>
                  <span className="text-muted">Plazo:</span> {item.responseDueAt ? formatDateTime(item.responseDueAt) : "No requiere respuesta"}
                </p>
              </div>
              <div className="rounded-[9px] bg-surface-soft p-3 text-sm leading-6 text-text">
                {item.feedback.comment ?? "El paciente no dejó comentario."}
              </div>
              <p className="text-xs font-medium text-muted">No autorizado para publicarse como testimonio.</p>

              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/sigeco/recepcion/pacientes/${item.feedback.patient.id}`}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  Ver ficha del paciente
                </Link>
                <Link
                  href={`/sigeco/recepcion/visitas/${item.feedback.visit.id}`}
                  className={buttonVariants({ variant: "ghost", size: "sm" })}
                >
                  Ver visita
                </Link>
              </div>

              {canManage ? (
                <details className="border-t border-border pt-4">
                  <summary className="cursor-pointer text-sm font-semibold text-primary-dark">Revisar y registrar respuesta interna</summary>
                  <form action={updateFeedbackCaseAction} className="mt-4 grid gap-3 md:grid-cols-2">
                    <input type="hidden" name="caseId" value={item.id} />
                    <Field label="Responsable">
                      <select className={internalInputClassName} name="ownerId" defaultValue={item.ownerId}>
                        {owners.map((owner) => <option key={owner.id} value={owner.id}>{owner.name ?? owner.email}</option>)}
                      </select>
                    </Field>
                    <Field label="Estado">
                      <select className={internalInputClassName} name="status" defaultValue={item.status}>
                        {statuses.map((value) => <option key={value} value={value}>{feedbackStatusLabels[value]}</option>)}
                      </select>
                    </Field>
                    <Field label="Clasificación">
                      <select className={internalInputClassName} name="classification" defaultValue={item.classification}>
                        {Object.entries(feedbackClassificationLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </Field>
                    <Field label="Prioridad">
                      <select className={internalInputClassName} name="severity" defaultValue={item.severity}>
                        {severities.map((value) => <option key={value} value={value}>{feedbackSeverityLabels[value]}</option>)}
                      </select>
                    </Field>
                    <Field label="Plazo de respuesta" className="md:col-span-2">
                      <DateTimePickerField name="responseDueAt" defaultDate={item.responseDueAt ?? new Date()} />
                    </Field>
                    <Field label="Nota interna obligatoria" className="md:col-span-2">
                      <textarea className={`${internalInputClassName} min-h-24 py-3`} name="note" maxLength={1000} required placeholder="Qué se revisó, qué se decidió o cuál es el siguiente paso." />
                    </Field>
                    <Button type="submit" className="md:col-span-2">Guardar revisión</Button>
                  </form>
                </details>
              ) : null}

              {item.events.length > 0 ? (
                <details className="border-t border-border pt-3">
                  <summary className="cursor-pointer text-xs font-semibold text-muted">Historial interno ({item.events.length} recientes)</summary>
                  <div className="mt-2 grid gap-2">
                    {item.events.map((event) => (
                      <div key={event.id} className="rounded-[9px] bg-surface-soft px-3 py-2 text-xs text-muted">
                        {formatDateTime(event.createdAt)} · {event.type} · {event.actor?.name ?? event.actor?.email ?? "Sistema"}
                        {event.note ? <p className="mt-1 text-text">{event.note}</p> : null}
                      </div>
                    ))}
                  </div>
                </details>
              ) : null}
            </Card>
          );
        })}
      </section>

      <Card>
        <CardHeader title="Tendencias de los últimos 90 días" description={`${dashboard.total90Days} respuestas; una opinión positiva no se convierte en testimonio.`} />
        <div className="grid gap-4 md:grid-cols-3">
          <Trend title="Por tipo" values={dashboard.byKind} labels={feedbackKindLabels} />
          <Trend title="Por área" values={dashboard.byArea} labels={feedbackAreaLabels} />
          <Trend title="Por calificación" values={dashboard.byRating} />
        </div>
      </Card>

      <Card>
        <CardHeader title="Enlaces recientes" description="El token original no puede recuperarse. Un enlace abierto puede cancelarse o reemplazarse." />
        <div className="grid gap-2">
          {requests.map((request) => (
            <div key={request.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[9px] border border-border px-3 py-2 text-sm">
              <div>
                <p className="font-semibold text-text">{request.patient.fullName} · {request.patient.internalCode}</p>
                <p className="text-xs text-muted">{request.deliveryChannel === "whatsapp" ? "WhatsApp" : "En persona"} · vence {formatDateTime(request.expiresAt)} · {request.status}</p>
              </div>
              {canManage && request.status === "open" ? (
                <form action={cancelFeedbackRequestAction}>
                  <input type="hidden" name="requestId" value={request.id} />
                  <Button type="submit" variant="ghost" size="sm">Cancelar enlace</Button>
                </form>
              ) : null}
            </div>
          ))}
          {requests.length === 0 ? <p className="text-sm text-muted">Todavía no se crearon enlaces.</p> : null}
        </div>
      </Card>
    </div>
  );
}

function Trend({
  title,
  values,
  labels
}: {
  title: string;
  values: Partial<Record<string, number>>;
  labels?: Record<string, string>;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-text">{title}</h3>
      <div className="mt-2 grid gap-1.5">
        {Object.entries(values).map(([key, value]) => (
          <div key={key} className="flex justify-between gap-2 text-sm">
            <span className="text-muted">{labels?.[key] ?? (title === "Por calificación" ? `${key}/5` : key)}</span>
            <strong className="text-text">{value}</strong>
          </div>
        ))}
        {Object.keys(values).length === 0 ? <p className="text-sm text-muted">Sin datos.</p> : null}
      </div>
    </div>
  );
}
