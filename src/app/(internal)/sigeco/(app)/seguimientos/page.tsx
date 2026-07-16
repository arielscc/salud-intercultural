import Link from "next/link";
import { BellRing, CalendarClock, PhoneCall } from "lucide-react";
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
import { followUpStatusLabels } from "@/features/follow-ups/labels";
import {
  getFollowUpTasks,
  getFollowUpWorkSummary
} from "@/modules/database/queries/follow-ups";
import { formatDateTime } from "@/lib/dates";
import { requirePermission } from "@/modules/permissions";
import { parsePage } from "@/modules/database/pagination";
import { cn } from "@/lib/cn";

type FollowUpsPageProps = {
  searchParams: Promise<{ filtro?: string; page?: string }>;
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
  await requirePermission("followups_read");
  const { filtro, page: pageParam } = await searchParams;
  const filter = filtro === "vencidos" ? "overdue" : filtro === "proximos" ? "upcoming" : "today";
  const page = parsePage(pageParam);
  const pageSize = 60;
  const [tasks, summary] = await Promise.all([
    getFollowUpTasks({ filter, page, pageSize }),
    getFollowUpWorkSummary()
  ]);
  const totalTasks =
    filter === "overdue" ? summary.overdue : filter === "upcoming" ? summary.upcoming : summary.today;

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
            href: "/sigeco/seguimientos?filtro=vencidos",
            label: "Vencidos",
            active: filter === "overdue",
            count: summary.overdue
          },
          {
            href: "/sigeco/seguimientos",
            label: "Hoy",
            active: filter === "today",
            count: summary.today
          },
          {
            href: "/sigeco/seguimientos?filtro=proximos",
            label: "Próximos",
            active: filter === "upcoming",
            count: summary.upcoming
          }
        ]}
      />

      <nav className="hidden gap-2 overflow-x-auto sm:flex lg:hidden" aria-label="Filtro de seguimientos">
        <FilterTab href="/sigeco/seguimientos?filtro=vencidos" label="Vencidos" active={filter === "overdue"} />
        <FilterTab href="/sigeco/seguimientos" label="Hoy" active={filter === "today"} />
        <FilterTab href="/sigeco/seguimientos?filtro=proximos" label="Próximos" active={filter === "upcoming"} />
      </nav>

      <DesktopTableToolbar
        views={
          <>
            <FilterTab href="/sigeco/seguimientos?filtro=vencidos" label="Vencidos" active={filter === "overdue"} />
            <FilterTab href="/sigeco/seguimientos" label="Hoy" active={filter === "today"} />
            <FilterTab href="/sigeco/seguimientos?filtro=proximos" label="Próximos" active={filter === "upcoming"} />
          </>
        }
        count={`${tasks.length} de ${totalTasks} seguimientos`}
      />

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
            const declinedContact = task.patient?.followUpPreference === "no_contact";

            return (
              <RecordItem
                key={task.id}
                href={`/sigeco/seguimientos/${task.id}`}
                title={name}
                status={<Chip dot>{followUpStatusLabels[task.status]}</Chip>}
              >
                <span className={cn("tabular-nums", isOverdue && "font-semibold text-error")}>
                  Vence {formatDateTime(task.dueAt)}
                  {isOverdue ? " · vencido" : ""}
                </span>
                <span className="min-w-0 truncate">{task.title}</span>
                <span className="tabular-nums">
                  {task.patient?.internalCode ?? "Sin ficha"} · {phone ?? "—"}
                </span>
                {declinedContact ? (
                  <span className="font-semibold text-warning">Pidió no recibir seguimiento</span>
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
                <Th>Tarea</Th>
                <Th className="lg:hidden xl:table-cell">Teléfono</Th>
                <Th>Vence</Th>
                <Th>Estado</Th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => {
                const phone = task.patient?.phone ?? task.lead?.phone;
                const name = task.patient?.fullName ?? task.lead?.name ?? "Sin paciente";
                const isOverdue = task.dueAt < new Date() && task.status === "pending";
                const declinedContact = task.patient?.followUpPreference === "no_contact";

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
                    <Td className="max-w-[280px] truncate">{task.title}</Td>
                    <Td className="tabular-nums lg:hidden xl:table-cell">
                      {phone ?? "—"}
                      {declinedContact ? (
                        <span className="mt-0.5 block text-[11px] font-semibold text-warning">
                          Pidió no recibir seguimiento
                        </span>
                      ) : null}
                    </Td>
                    <Td className={cn("tabular-nums", isOverdue && "font-semibold text-error")}>
                      {formatDateTime(task.dueAt)}
                      {isOverdue ? " · vencido" : ""}
                    </Td>
                    <Td>
                      <Chip dot>{followUpStatusLabels[task.status]}</Chip>
                    </Td>
                  </Tr>
                );
              })}
              {tasks.length === 0 ? (
                <tr>
                  <Td className="py-8 text-center" colSpan={5}>
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
          searchParams={{ filtro }}
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
