import Link from "next/link";
import {
  BellRing,
  CalendarClock,
  MessageCircle,
  Phone,
  PhoneCall
} from "lucide-react";
import type {
  FollowUpStatus,
  FollowUpType
} from "@/generated/prisma/client";
import { Field, internalInputClassName } from "@/components/internal/Field";
import { Card, CardHeader } from "@/components/internal/ui/Card";
import { MobileTabs } from "@/components/internal/MobileTabs";
import { Chip } from "@/components/internal/ui/Chip";
import { DesktopTableToolbar } from "@/components/internal/ui/DesktopTableToolbar";
import { KpiCard } from "@/components/internal/ui/KpiCard";
import { PageHeader } from "@/components/internal/ui/PageHeader";
import { Pagination } from "@/components/internal/ui/Pagination";
import {
  RecordItem,
  RecordList,
  RecordListEmpty,
  RecordTable
} from "@/components/internal/ui/RecordList";
import { Table, Td, Th, Tr } from "@/components/internal/ui/Table";
import { buttonVariants } from "@/components/internal/ui/Button";
import {
  followUpPriorityLabels,
  followUpResultLabels,
  followUpStatusLabels,
  followUpTypeLabels
} from "@/features/follow-ups/labels";
import { canRoleWorkFollowUpType } from "@/features/follow-ups/policy";
import { canContactPatient } from "@/features/patient-consents/policy";
import {
  getFollowUpAssignees,
  getFollowUpTaskCount,
  getFollowUpTasks,
  getFollowUpWorkSummary
} from "@/modules/database/queries/follow-ups";
import { formatDateTime } from "@/lib/dates";
import { requirePermission } from "@/modules/permissions";
import { parsePage } from "@/modules/database/pagination";
import { cn } from "@/lib/cn";
import { createCallLink, createWhatsAppLink } from "@/lib/whatsapp";

type FollowUpsPageProps = {
  searchParams: Promise<{
    filtro?: string;
    tipo?: string;
    responsable?: string;
    estado?: string;
    page?: string;
  }>;
};

const emptyFollowUpsMessage = (
  <>
    <span className="block font-semibold text-text">No hay seguimientos para este filtro.</span>
    <span className="mt-1 block text-sm text-muted">
      Los seguimientos se crean desde la ficha del paciente o tras la atención.
    </span>
  </>
);

export default async function FollowUpsPage({ searchParams }: FollowUpsPageProps) {
  const user = await requirePermission("followups_read");
  const {
    filtro,
    tipo,
    responsable,
    estado,
    page: pageParam
  } = await searchParams;
  const typeValues = Object.keys(followUpTypeLabels) as FollowUpType[];
  const type = typeValues.includes(tipo as FollowUpType)
    ? (tipo as FollowUpType)
    : undefined;
  const statusValues: FollowUpStatus[] = ["pending", "done", "cancelled"];
  const status = statusValues.includes(estado as FollowUpStatus)
    ? (estado as "pending" | "done" | "cancelled")
    : "pending";
  const filter =
    filtro === "vencidos"
      ? "overdue"
      : filtro === "proximos"
        ? "upcoming"
        : filtro === "hoy"
          ? "today"
          : status === "pending"
            ? "today"
            : "all";
  const page = parsePage(pageParam);
  const pageSize = 60;
  const taskFilters = {
    filter,
    status,
    type,
    assignedToId:
      responsable && responsable !== "sin-asignar"
        ? responsable
        : undefined,
    unassigned: responsable === "sin-asignar",
    viewerRole: user.role
  } as const;
  const [tasks, summary, totalTasks, assignees] = await Promise.all([
    getFollowUpTasks({ ...taskFilters, page, pageSize }),
    getFollowUpWorkSummary(undefined, user.role),
    getFollowUpTaskCount(taskFilters),
    getFollowUpAssignees(user.role)
  ]);
  const filterHref = (nextFilter: "vencidos" | "hoy" | "proximos") => {
    const query = new URLSearchParams();
    query.set("filtro", nextFilter);
    if (type) query.set("tipo", type);
    if (responsable) query.set("responsable", responsable);
    if (status !== "pending") query.set("estado", status);
    return `/sigeco/seguimientos?${query.toString()}`;
  };

  return (
    <div className="grid gap-4">
      <PageHeader title="Seguimientos" description="Bandeja diaria" />

      <section className="grid gap-3 sm:grid-cols-3">
        <KpiCard
          icon={BellRing}
          label="Vencidos"
          value={summary.overdue}
          flag={summary.overdue > 0 ? { tone: "crit", label: "Atender primero" } : undefined}
        />
        <KpiCard icon={PhoneCall} label="Hoy" value={summary.today} />
        <KpiCard icon={CalendarClock} label="Próximos" value={summary.upcoming} />
      </section>

      <MobileTabs
        label="Filtro de seguimientos"
        items={[
          {
            href: filterHref("vencidos"),
            label: "Vencidos",
            active: filter === "overdue",
            count: summary.overdue
          },
          {
            href: filterHref("hoy"),
            label: "Hoy",
            active: filter === "today",
            count: summary.today
          },
          {
            href: filterHref("proximos"),
            label: "Próximos",
            active: filter === "upcoming",
            count: summary.upcoming
          }
        ]}
      />

      <nav className="hidden gap-2 overflow-x-auto sm:flex lg:hidden" aria-label="Filtro de seguimientos">
        <FilterTab href={filterHref("vencidos")} label="Vencidos" active={filter === "overdue"} />
        <FilterTab href={filterHref("hoy")} label="Hoy" active={filter === "today"} />
        <FilterTab href={filterHref("proximos")} label="Próximos" active={filter === "upcoming"} />
      </nav>

      <DesktopTableToolbar
        views={
          <>
            <FilterTab href={filterHref("vencidos")} label="Vencidos" active={filter === "overdue"} />
            <FilterTab href={filterHref("hoy")} label="Hoy" active={filter === "today"} />
            <FilterTab href={filterHref("proximos")} label="Próximos" active={filter === "upcoming"} />
          </>
        }
        count={`${tasks.length} de ${totalTasks} seguimientos`}
      />

      <Card className="hidden sm:block">
        <form
          method="get"
          className="grid items-end gap-3 md:grid-cols-4"
        >
          {filtro ? <input type="hidden" name="filtro" value={filtro} /> : null}
          <Field label="Tipo">
            <select
              className={internalInputClassName}
              name="tipo"
              defaultValue={type ?? ""}
            >
              <option value="">Todos los tipos</option>
              {typeValues.map((value) => (
                <option key={value} value={value}>
                  {followUpTypeLabels[value]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Responsable">
            <select
              className={internalInputClassName}
              name="responsable"
              defaultValue={responsable ?? ""}
            >
              <option value="">Todos</option>
              <option value="sin-asignar">Sin asignar</option>
              {assignees.map((assignee) => (
                <option key={assignee.id} value={assignee.id}>
                  {assignee.name ?? assignee.email}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Estado">
            <select
              className={internalInputClassName}
              name="estado"
              defaultValue={status}
            >
              <option value="pending">Pendientes</option>
              <option value="done">Terminados</option>
              <option value="cancelled">Cancelados</option>
            </select>
          </Field>
          <button className={buttonVariants({ variant: "outline" })}>
            Aplicar filtros
          </button>
        </form>
      </Card>

      <Card className="p-0">
        <CardHeader
          className="mb-0 p-[18px] pb-3"
          title="Seguimientos programados"
          description="Contactos pendientes correspondientes al filtro y fecha seleccionados."
        />
        <RecordList>
          {tasks.map((task) => {
            const phone = task.patient?.phone ?? task.lead?.phone;
            const name = task.patient?.fullName ?? task.lead?.name ?? "Sin paciente";
            const isOverdue = task.dueAt < new Date() && task.status === "pending";
            const contactBlocked =
              Boolean(task.patient) &&
              task.patient?.consents[0]?.decision !== "granted";
            const canWork =
              task.status === "pending" &&
              canRoleWorkFollowUpType(user.role, task.type);
            const followUpConsent = task.patient?.consents[0];
            const canCall = task.patient
              ? canContactPatient(followUpConsent, "follow_up", "call")
              : Boolean(phone);
            const canWhatsApp = task.patient
              ? canContactPatient(
                  followUpConsent,
                  "follow_up",
                  "whatsapp"
                )
              : Boolean(phone);

            return (
              <RecordItem
                key={task.id}
                href={`/sigeco/seguimientos/${task.id}`}
                title={name}
                status={
                  <Chip
                    dot
                    tone={task.priority === "urgent" ? "error" : "neutral"}
                  >
                    {followUpTypeLabels[task.type]}
                  </Chip>
                }
                action={
                  canWork ? (
                    <div className="relative z-10 flex flex-wrap gap-2">
                      {phone && canCall ? (
                        <a
                          href={createCallLink(phone)}
                          className={buttonVariants({
                            variant: "outline",
                            size: "sm"
                          })}
                        >
                          <Phone className="h-4 w-4" aria-hidden="true" />
                          Llamar
                        </a>
                      ) : null}
                      {phone && canWhatsApp ? (
                        <a
                          href={createWhatsAppLink("", phone)}
                          target="_blank"
                          rel="noreferrer"
                          className={buttonVariants({ size: "sm" })}
                        >
                          <MessageCircle className="h-4 w-4" aria-hidden="true" />
                          WhatsApp
                        </a>
                      ) : null}
                      <Link
                        href={`/sigeco/seguimientos/${task.id}`}
                        className={buttonVariants({
                          variant: "outline",
                          size: "sm"
                        })}
                      >
                        Resultado
                      </Link>
                    </div>
                  ) : undefined
                }
              >
                <span className={cn("tabular-nums", isOverdue && "font-semibold text-error")}>
                  Vence {formatDateTime(task.dueAt)}
                  {isOverdue ? " · vencido" : ""}
                </span>
                <span className="min-w-0 truncate">{task.title}</span>
                <span>
                  {task.assignedTo?.name ??
                    task.assignedTo?.email ??
                    "Sin responsable"}{" "}
                  · prioridad{" "}
                  {followUpPriorityLabels[
                    task.priority
                  ].toLocaleLowerCase("es-BO")}
                </span>
                {task.result ? (
                  <span>Último resultado: {followUpResultLabels[task.result]}</span>
                ) : null}
                <span className="tabular-nums">
                  {task.patient?.internalCode ?? "Sin ficha"} · {phone ?? "—"}
                </span>
                {contactBlocked ? (
                  <span className="font-semibold text-warning">
                    Sin autorización vigente de seguimiento
                  </span>
                ) : null}
              </RecordItem>
            );
          })}
          {tasks.length === 0 ? <RecordListEmpty>{emptyFollowUpsMessage}</RecordListEmpty> : null}
        </RecordList>
        <RecordTable>
          <Table caption="Seguimientos del filtro activo">
            <thead>
              <tr>
                <Th>Paciente</Th>
                <Th>Tipo y tarea</Th>
                <Th>Responsable</Th>
                <Th className="lg:hidden xl:table-cell">Teléfono</Th>
                <Th>Prioridad</Th>
                <Th>Vence</Th>
                <Th>Estado / resultado</Th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => {
                const phone = task.patient?.phone ?? task.lead?.phone;
                const name = task.patient?.fullName ?? task.lead?.name ?? "Sin paciente";
                const isOverdue = task.dueAt < new Date() && task.status === "pending";
                const contactBlocked =
                  Boolean(task.patient) &&
                  task.patient?.consents[0]?.decision !== "granted";

                return (
                  <Tr key={task.id}>
                    <Td className="font-semibold text-text">
                      <Link
                        href={`/sigeco/seguimientos/${task.id}`}
                        className="focus-ring rounded-[7px] hover:text-primary-dark hover:underline"
                      >
                        {name}
                      </Link>
                      <span className="block text-[11px] font-normal tabular-nums text-muted">
                        {task.patient?.internalCode ?? "Sin ficha"}
                      </span>
                    </Td>
                    <Td className="max-w-[280px]">
                      <span className="block font-semibold text-text">
                        {followUpTypeLabels[task.type]}
                      </span>
                      <span className="block truncate text-xs text-muted">
                        {task.title}
                      </span>
                    </Td>
                    <Td>
                      {task.assignedTo?.name ??
                        task.assignedTo?.email ??
                        "Sin asignar"}
                    </Td>
                    <Td className="tabular-nums lg:hidden xl:table-cell">
                      {phone ?? "—"}
                      {contactBlocked ? (
                        <span className="mt-0.5 block text-[11px] font-semibold text-warning">
                          Sin autorización vigente
                        </span>
                      ) : null}
                    </Td>
                    <Td>
                      <Chip
                        tone={
                          task.priority === "urgent"
                            ? "error"
                            : task.priority === "high"
                              ? "warning"
                              : "neutral"
                        }
                      >
                        {followUpPriorityLabels[task.priority]}
                      </Chip>
                    </Td>
                    <Td className={cn("tabular-nums", isOverdue && "font-semibold text-error")}>
                      {formatDateTime(task.dueAt)}
                      {isOverdue ? " · vencido" : ""}
                    </Td>
                    <Td>
                      <Chip dot>{followUpStatusLabels[task.status]}</Chip>
                      {task.result ? (
                        <span className="mt-1 block text-xs text-muted">
                          {followUpResultLabels[task.result]}
                        </span>
                      ) : null}
                    </Td>
                  </Tr>
                );
              })}
              {tasks.length === 0 ? (
                <tr>
                  <Td className="py-8 text-center" colSpan={7}>
                    {emptyFollowUpsMessage}
                  </Td>
                </tr>
              ) : null}
            </tbody>
          </Table>
        </RecordTable>
        <Pagination
          page={page}
          pageSize={pageSize}
          totalItems={totalTasks}
          pathname="/sigeco/seguimientos"
          searchParams={{
            filtro,
            tipo: type,
            responsable,
            estado: status === "pending" ? undefined : status
          }}
        />
      </Card>
    </div>
  );
}

function FilterTab({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "focus-ring shrink-0 rounded-[9px] border px-4 py-2 text-[13px] font-semibold transition",
        active
          ? "border-transparent bg-surface-soft text-primary-dark"
          : "border-border bg-surface text-muted hover:text-text"
      )}
    >
      {label}
    </Link>
  );
}
