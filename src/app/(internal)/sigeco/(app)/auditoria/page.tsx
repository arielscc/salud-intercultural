import Link from "next/link";
import { DateRangePickerField } from "@/components/internal/ui/DatePickerField";
import type { AuditResult } from "@/generated/prisma/client";
import { internalRoleLabels } from "@/features/internal-auth/permissions";
import { getAuditEventPage, type AuditEventFilters } from "@/modules/audit/queries";
import { requirePermission } from "@/modules/permissions";

type AuditPageProps = {
  searchParams: Promise<{
    desde?: string;
    hasta?: string;
    actor?: string;
    accion?: string;
    entidad?: string;
    pagina?: string;
  }>;
};

const resultLabels: Record<AuditResult, string> = {
  success: "Correcto",
  failure: "Falló",
  denied: "Acceso denegado"
};

const resultStyles: Record<AuditResult, string> = {
  success: "bg-emerald-50 text-emerald-800",
  failure: "bg-amber-50 text-amber-800",
  denied: "bg-red-50 text-red-800"
};

const actionLabels: Record<string, string> = {
  "audit.list": "Consultó la auditoría",
  "session.login": "Inició sesión",
  "session.logout": "Cerró sesión",
  "patient.search": "Buscó pacientes",
  "patient.view": "Consultó la ficha de un paciente",
  "patient.create": "Creó un paciente",
  "patient.update": "Actualizó un paciente",
  "reception.intake.create": "Registró una llegada",
  "visit.create": "Creó una visita",
  "visit.view": "Consultó una visita",
  "visit.flow.update": "Cambió el recorrido de una visita",
  "visit.status.update": "Cambió el estado de una visita",
  "clinical.consultation.save": "Guardó una consulta",
  "clinical.consultation.view": "Consultó una atención clínica",
  "treatment_proposal.outcome.record":
    "Registró el resultado de una propuesta de tratamiento",
  "clinical.order.create": "Creó una orden clínica",
  "clinical.paid_study_order.create": "Solicitó estudios desde consulta",
  "reception.paid_study_order.create": "Solicitó estudios desde recepción",
  "nursing.work_item.update": "Actualizó una tarea de enfermería",
  "nursing.work_item.view": "Consultó una tarea de enfermería",
  "nursing.vital_signs.create": "Registró signos vitales",
  "nursing.application.create": "Registró una aplicación",
  "nursing.note.create": "Registró una nota de enfermería",
  "nursing.studies.return_to_doctor": "Devolvió estudios al médico",
  "study.create": "Registró un estudio",
  "sale.create": "Registró una venta",
  "sale.view": "Consultó una venta",
  "cash.work_item.view": "Consultó una tarea de Caja",
  "payment.create": "Registró un pago",
  "sale.paid_studies.release": "Envió estudios pagados a enfermería",
  "follow_up.task.create": "Creó un seguimiento",
  "follow_up.task.view": "Consultó un seguimiento",
  "follow_up.attempt.create": "Registró un intento de seguimiento",
  "patient.consent.record": "Registró una decisión de consentimiento",
  "attribution.source.create": "Creó una fuente de captación",
  "attribution.source.update": "Actualizó una fuente de captación",
  "attribution.campaign.create": "Creó una campaña de atribución",
  "attribution.campaign.access.update": "Cambió el estado de una campaña",
  "patient.duplicate.dismiss": "Descartó un posible duplicado",
  "patient.duplicate.merge": "Fusionó dos fichas de paciente",
  "inventory.item.create": "Creó un producto",
  "inventory.item.view": "Consultó un producto",
  "inventory.entry.create": "Registró una entrada de inventario",
  "inventory.adjustment.create": "Ajustó el inventario",
  "user.create": "Creó un usuario",
  "user.access.update": "Cambió rol o estado de un usuario",
  "user.password_change.require": "Exigió cambio de contraseña",
  "user.unlock": "Desbloqueó un usuario",
  "user.sessions.revoke": "Cerró las sesiones de un usuario",
  "user.password.change": "Cambió su contraseña",
  "session.revoke": "Cerró una sesión"
};

const entityLabels: Record<string, string> = {
  audit_event: "Auditoría",
  session: "Sesión",
  patient: "Paciente",
  patient_duplicate_candidate: "Posible duplicado",
  visit: "Visita",
  treatment_proposal_outcome: "Resultado de propuesta",
  clinical_order: "Orden clínica",
  work_item: "Tarea interna",
  vital_signs: "Signos vitales",
  nursing_application: "Aplicación de enfermería",
  nursing_note: "Nota de enfermería",
  study: "Estudio",
  sale: "Venta",
  follow_up_task: "Seguimiento",
  inventory_item: "Producto",
  internal_user: "Usuario interno",
  capture_source: "Fuente de captación",
  capture_campaign: "Campaña"
};

function buildPageHref(
  current: Awaited<AuditPageProps["searchParams"]>,
  page: number
) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(current)) {
    if (value && key !== "pagina") query.set(key, value);
  }
  query.set("pagina", String(page));
  return `/sigeco/auditoria?${query.toString()}`;
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("es-BO", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "America/La_Paz"
  }).format(value);
}

export default async function AuditPage({ searchParams }: AuditPageProps) {
  await requirePermission("audit_read");
  const params = await searchParams;
  const filters: AuditEventFilters = {
    from: params.desde,
    to: params.hasta,
    actorId: params.actor,
    action: params.accion,
    entityType: params.entidad,
    page: Number(params.pagina) || 1
  };
  const data = await getAuditEventPage(filters);

  return (
    <main className="space-y-5">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-primary-dark">
          Control interno
        </p>
        <h1 className="mt-1 text-2xl font-bold text-text">Auditoría de SIGECO</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted">
          Historial que no se puede editar ni borrar. Muestra quién realizó una acción,
          cuándo ocurrió y si terminó correctamente.
        </p>
      </header>

      <form
        method="get"
        className="grid gap-3 rounded-[10px] border border-border bg-surface p-4 md:grid-cols-2 lg:grid-cols-4"
      >
        <div>
          <p className="text-xs font-semibold text-muted">Período</p>
          <DateRangePickerField
            key={`${params.desde ?? ""}-${params.hasta ?? ""}`}
            fromName="desde"
            toName="hasta"
            defaultFrom={params.desde}
            defaultTo={params.hasta}
            placeholder="Cualquier fecha"
            className="mt-1"
          />
        </div>
        <label className="hidden text-xs font-semibold text-muted lg:block">
          Persona
          <select
            name="actor"
            defaultValue={params.actor}
            className="mt-1 w-full rounded-[7px] border border-border bg-white px-3 py-2 text-sm text-text"
          >
            <option value="">Todas</option>
            {data.actors.map((actor) => (
              <option key={actor.id} value={actor.id}>
                {actor.name ?? actor.email}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-muted">
          Acción
          <select
            name="accion"
            defaultValue={params.accion}
            className="mt-1 w-full rounded-[7px] border border-border bg-white px-3 py-2 text-sm text-text"
          >
            <option value="">Todas</option>
            {data.actions.map((action) => (
              <option key={action} value={action}>
                {actionLabels[action] ?? action}
              </option>
            ))}
          </select>
        </label>
        <label className="hidden text-xs font-semibold text-muted lg:block">
          Registro
          <select
            name="entidad"
            defaultValue={params.entidad}
            className="mt-1 w-full rounded-[7px] border border-border bg-white px-3 py-2 text-sm text-text"
          >
            <option value="">Todos</option>
            {data.entityTypes.map((entity) => (
              <option key={entity} value={entity}>
                {entityLabels[entity] ?? entity}
              </option>
            ))}
          </select>
        </label>
        <div className="flex gap-2 md:col-span-2 lg:col-span-4">
          <button
            type="submit"
            className="rounded-[7px] bg-primary px-4 py-2 text-sm font-semibold text-white"
          >
            Aplicar filtros
          </button>
          <Link
            href="/sigeco/auditoria"
            className="rounded-[7px] border border-border px-4 py-2 text-sm font-semibold text-text"
          >
            Limpiar
          </Link>
        </div>
        <p className="text-xs text-muted lg:hidden">
          Los filtros por persona y tipo de registro están disponibles en escritorio.
        </p>
      </form>

      <p className="text-sm text-muted">
        {data.total} evento{data.total === 1 ? "" : "s"} encontrado
        {data.total === 1 ? "" : "s"}.
      </p>

      <div className="space-y-3 lg:hidden">
        {data.events.map((event) => (
          <article key={event.id} className="rounded-[10px] border border-border bg-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-text">
                  {actionLabels[event.action] ?? event.action}
                </p>
                <p className="mt-1 text-xs text-muted">{formatDate(event.occurredAt)}</p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ${resultStyles[event.result]}`}
              >
                {resultLabels[event.result]}
              </span>
            </div>
            <dl className="mt-3 grid gap-1 text-xs">
              <div>
                <dt className="inline font-semibold text-muted">Persona: </dt>
                <dd className="inline text-text">
                  {event.actor?.name ?? event.actor?.email ?? "Sin sesión identificada"}
                </dd>
              </div>
              <div>
                <dt className="inline font-semibold text-muted">Registro: </dt>
                <dd className="inline text-text">
                  {entityLabels[event.entityType] ?? event.entityType}
                  {event.entityId ? ` · ${event.entityId}` : ""}
                </dd>
              </div>
            </dl>
          </article>
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-[10px] border border-border bg-surface lg:block">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="border-b border-border bg-surface-soft text-xs text-muted">
            <tr>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Persona y rol</th>
              <th className="px-4 py-3">Acción</th>
              <th className="px-4 py-3">Registro</th>
              <th className="px-4 py-3">Resultado</th>
              <th className="px-4 py-3">Solicitud</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.events.map((event) => (
              <tr key={event.id}>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-muted">
                  {formatDate(event.occurredAt)}
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-text">
                    {event.actor?.name ?? event.actor?.email ?? "Sin sesión identificada"}
                  </p>
                  <p className="text-xs text-muted">
                    {event.actorRole ? internalRoleLabels[event.actorRole] : "Sin rol"}
                  </p>
                </td>
                <td className="px-4 py-3 text-text">
                  {actionLabels[event.action] ?? event.action}
                </td>
                <td className="px-4 py-3 text-xs text-muted">
                  {entityLabels[event.entityType] ?? event.entityType}
                  {event.entityId ? <span className="block font-mono">{event.entityId}</span> : null}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-1 text-[11px] font-semibold ${resultStyles[event.result]}`}
                  >
                    {resultLabels[event.result]}
                  </span>
                </td>
                <td className="max-w-48 truncate px-4 py-3 font-mono text-[11px] text-muted">
                  {event.requestId}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.events.length === 0 ? (
        <p className="rounded-[10px] border border-dashed border-border p-8 text-center text-sm text-muted">
          No hay eventos para los filtros seleccionados.
        </p>
      ) : null}

      {data.pageCount > 1 ? (
        <nav className="flex items-center justify-between text-sm" aria-label="Páginas de auditoría">
          {data.page > 1 ? (
            <Link
              href={buildPageHref(params, data.page - 1)}
              className="rounded-[7px] border border-border px-3 py-2 font-semibold text-text"
            >
              Anterior
            </Link>
          ) : (
            <span />
          )}
          <span className="text-muted">
            Página {data.page} de {data.pageCount}
          </span>
          {data.page < data.pageCount ? (
            <Link
              href={buildPageHref(params, data.page + 1)}
              className="rounded-[7px] border border-border px-3 py-2 font-semibold text-text"
            >
              Siguiente
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </main>
  );
}
