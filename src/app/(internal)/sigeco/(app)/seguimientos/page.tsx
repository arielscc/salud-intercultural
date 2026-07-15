import Link from "next/link";
import { BellRing, CalendarClock, PhoneCall } from "lucide-react";
import { Card } from "@/components/internal/ui/Card";
import { Chip } from "@/components/internal/ui/Chip";
import { KpiCard } from "@/components/internal/ui/KpiCard";
import { PageHeader } from "@/components/internal/ui/PageHeader";
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
import { cn } from "@/lib/cn";

type FollowUpsPageProps = {
  searchParams: Promise<{ filtro?: string }>;
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
  const { filtro } = await searchParams;
  const filter = filtro === "vencidos" ? "overdue" : filtro === "proximos" ? "upcoming" : "today";
  const [tasks, summary] = await Promise.all([
    getFollowUpTasks({ filter, pageSize: 60 }),
    getFollowUpWorkSummary()
  ]);

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

      <nav className="flex gap-2 overflow-x-auto" aria-label="Filtro de seguimientos">
        <FilterTab href="/sigeco/seguimientos?filtro=vencidos" label="Vencidos" active={filter === "overdue"} />
        <FilterTab href="/sigeco/seguimientos" label="Hoy" active={filter === "today"} />
        <FilterTab href="/sigeco/seguimientos?filtro=proximos" label="Próximos" active={filter === "upcoming"} />
      </nav>

      <Card className="p-0">
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
          <Table>
            <thead>
              <tr>
                <Th>Paciente</Th>
                <Th>Tarea</Th>
                <Th>Teléfono</Th>
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
                    <Td className="tabular-nums">
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
