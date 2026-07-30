import { subDays } from "date-fns";
import Link from "next/link";
import { Activity, AlarmClock, Clock3, TriangleAlert } from "lucide-react";
import { DateRangePickerField } from "@/components/internal/ui/DatePickerField";
import { Field, internalInputClassName } from "@/components/internal/Field";
import { Card, CardHeader } from "@/components/internal/ui/Card";
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
import { buttonVariants } from "@/components/internal/ui/Button";
import {
  AREA_WAIT_ALERT_MINUTES,
  formatDurationShort,
  measuredRouteAreas
} from "@/features/area-times/report";
import { routeAreaLabels } from "@/features/patients/labels";
import { dateOnlyRange, formatDateTime, todayDateOnly } from "@/lib/dates";
import {
  getAreaTimeReport,
  getAreaTimeReportBranches
} from "@/modules/database/queries/area-times";
import { requirePermission } from "@/modules/permissions";

const periodOptions = [
  { value: "7", label: "Últimos 7 días" },
  { value: "30", label: "Últimos 30 días" },
  { value: "90", label: "Últimos 90 días" },
  { value: "custom", label: "Rango personalizado" },
  { value: "all", label: "Todo el historial" }
] as const;
type Period = (typeof periodOptions)[number]["value"];

type SearchParams = {
  periodo?: string;
  desde?: string;
  hasta?: string;
  area?: string;
  sucursal?: string;
};

function resolvePeriod(params: SearchParams) {
  const selected = periodOptions.some(
    (option) => option.value === params.periodo
  )
    ? (params.periodo as Period)
    : "30";
  if (selected === "all") {
    return {
      selected,
      fromValue: "",
      toValue: "",
      range: { start: undefined, end: undefined }
    };
  }
  if (selected === "custom") {
    const range = dateOnlyRange(params.desde, params.hasta);
    if (range.start || range.end) {
      return {
        selected,
        fromValue: params.desde ?? "",
        toValue: params.hasta ?? "",
        range
      };
    }
  }
  const days = selected === "7" ? 7 : selected === "90" ? 90 : 30;
  const today = todayDateOnly();
  const from = todayDateOnly(subDays(new Date(), days - 1));
  return {
    selected: selected === "custom" ? ("30" as const) : selected,
    fromValue: from,
    toValue: today,
    range: dateOnlyRange(from, today)
  };
}

function branchLabel(value: string) {
  return value === "el-alto" ? "El Alto" : value.replaceAll("-", " ");
}

function currentPhaseElapsedMs(
  session: { currentPhaseStartedAt: Date | null },
  asOf: Date
) {
  return session.currentPhaseStartedAt
    ? Math.max(0, asOf.getTime() - session.currentPhaseStartedAt.getTime())
    : 0;
}

export default async function AreaTimeReportPage({
  searchParams
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requirePermission("reports_read");
  const params = await searchParams;
  const period = resolvePeriod(params);
  const area = measuredRouteAreas.includes(
    params.area as (typeof measuredRouteAreas)[number]
  )
    ? (params.area as (typeof measuredRouteAreas)[number])
    : undefined;
  const asOf = new Date();
  const [report, branches] = await Promise.all([
    getAreaTimeReport(
      {
        from: period.range.start,
        to: period.range.end,
        area,
        branchCode: params.sucursal || undefined
      },
      asOf
    ),
    getAreaTimeReportBranches()
  ]);
  const waitingAlerts = report.active.filter(
    (session) =>
      session.currentPhase === "waiting" &&
      currentPhaseElapsedMs(session, asOf) >=
        AREA_WAIT_ALERT_MINUTES * 60_000
  ).length;

  return (
    <div className="grid gap-5">
      <PageHeader
        title="Tiempo de atención por área"
        description="Espera, atención, bloqueos y duración total derivados de eventos"
      />

      <Card>
        <form method="get" className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <Field label="Período">
            <select
              className={internalInputClassName}
              name="periodo"
              defaultValue={period.selected}
            >
              {periodOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Desde y hasta">
            <DateRangePickerField
              fromName="desde"
              toName="hasta"
              defaultFrom={period.fromValue}
              defaultTo={period.toValue}
            />
          </Field>
          <Field label="Área">
            <select
              className={internalInputClassName}
              name="area"
              defaultValue={area ?? ""}
            >
              <option value="">Todas</option>
              {measuredRouteAreas.map((value) => (
                <option key={value} value={value}>
                  {routeAreaLabels[value]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Sucursal">
            <select
              className={internalInputClassName}
              name="sucursal"
              defaultValue={params.sucursal ?? ""}
            >
              <option value="">Todas</option>
              {branches.map((branch) => (
                <option key={branch.value} value={branch.value}>
                  {branchLabel(branch.value)} ({branch.count})
                </option>
              ))}
            </select>
          </Field>
          <div className="flex items-end gap-2">
            <button className={buttonVariants()} type="submit">
              Aplicar
            </button>
            <Link
              className={buttonVariants({ variant: "outline" })}
              href="/sigeco/reportes/tiempos"
            >
              Limpiar
            </Link>
          </div>
        </form>
      </Card>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <KpiCard
          label="Atenciones medidas"
          value={report.totals.sessions}
          note="Sesiones cerradas con eventos completos"
          icon={Activity}
        />
        <KpiCard
          label="Mediana de espera"
          value={formatDurationShort(report.totals.waiting.medianMs)}
          note={`Promedio ${formatDurationShort(report.totals.waiting.averageMs)}`}
          icon={Clock3}
          tone="secondary"
        />
        <KpiCard
          label="P90 de espera"
          value={formatDurationShort(report.totals.waiting.p90Ms)}
          note="9 de cada 10 esperas quedan debajo"
          icon={AlarmClock}
          tone="accent"
        />
        <KpiCard
          label="Esperas con aviso"
          value={waitingAlerts}
          note={`Umbral inicial: ${AREA_WAIT_ALERT_MINUTES} minutos`}
          icon={TriangleAlert}
          tone={waitingAlerts > 0 ? "error" : "muted"}
          flag={
            waitingAlerts > 0
              ? { tone: "warn", label: "Revisar ahora" }
              : undefined
          }
        />
      </div>

      <Card className="p-0">
        <CardHeader
          className="mb-0 p-[18px]"
          title="Comparación por área"
          description="Promedio, mediana, P75 y P90; el total incluye espera, atención y bloqueo"
        />
        <RecordList>
          {report.areas.map((row) => (
            <RecordItem
              key={row.area}
              title={routeAreaLabels[row.area]}
              status={<Chip>{row.sessions} sesiones</Chip>}
            >
              <span>
                Espera: mediana {formatDurationShort(row.waiting.medianMs)} · P90{" "}
                {formatDurationShort(row.waiting.p90Ms)}
              </span>
              <span>
                Atención promedio {formatDurationShort(row.attention.averageMs)}
              </span>
              <span>Total promedio {formatDurationShort(row.total.averageMs)}</span>
            </RecordItem>
          ))}
        </RecordList>
        <RecordTable>
          <Table caption="Tiempos estadísticos por área">
            <thead>
              <tr>
                <Th>Área</Th>
                <Th className="text-right">Sesiones</Th>
                <Th className="text-right">Espera promedio</Th>
                <Th className="text-right">Mediana</Th>
                <Th className="text-right">P75</Th>
                <Th className="text-right">P90</Th>
                <Th className="text-right">Atención promedio</Th>
                <Th className="text-right">Bloqueo promedio</Th>
                <Th className="text-right">Total promedio</Th>
              </tr>
            </thead>
            <tbody>
              {report.areas.map((row) => (
                <Tr key={row.area}>
                  <Td className="font-semibold text-text">
                    {routeAreaLabels[row.area]}
                  </Td>
                  <Td className="text-right tabular-nums">{row.sessions}</Td>
                  <Td className="text-right tabular-nums">
                    {formatDurationShort(row.waiting.averageMs)}
                  </Td>
                  <Td className="text-right tabular-nums">
                    {formatDurationShort(row.waiting.medianMs)}
                  </Td>
                  <Td className="text-right tabular-nums">
                    {formatDurationShort(row.waiting.p75Ms)}
                  </Td>
                  <Td className="text-right font-semibold tabular-nums text-text">
                    {formatDurationShort(row.waiting.p90Ms)}
                  </Td>
                  <Td className="text-right tabular-nums">
                    {formatDurationShort(row.attention.averageMs)}
                  </Td>
                  <Td className="text-right tabular-nums">
                    {formatDurationShort(row.blocked.averageMs)}
                  </Td>
                  <Td className="text-right tabular-nums">
                    {formatDurationShort(row.total.averageMs)}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </RecordTable>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <TrendTable
          title="Tendencia por día"
          description="Ayuda a encontrar días con esperas altas"
          rows={report.daily.slice(-124).map((row) => ({
            ...row,
            key: `${row.date}-${row.area}`,
            period: row.date,
            area: row.area
          }))}
        />
        <TrendTable
          title="Franjas por hora de llegada"
          description="La hora usa America/La_Paz"
          rows={report.hourly.map((row) => ({
            ...row,
            key: `${row.hour}-${row.area}`,
            period: `${String(row.hour).padStart(2, "0")}:00`,
            area: row.area
          }))}
        />
      </div>

      <Card className="p-0">
        <CardHeader
          className="mb-0 p-[18px]"
          title="Pacientes actualmente en un área"
          description="Vista móvil simple para revisar esperas y bloqueos"
        />
        <RecordList className="sm:block">
          {report.active.map((session) => (
            <RecordItem
              key={session.routeStepId}
              href={`/sigeco/recepcion/visitas/${session.visitId}`}
              title={session.patient.fullName}
              status={
                <Chip
                  tone={
                    session.currentPhase === "blocked"
                      ? "error"
                      : session.currentPhase === "waiting" &&
                          currentPhaseElapsedMs(session, asOf) >=
                            AREA_WAIT_ALERT_MINUTES * 60_000
                        ? "warning"
                        : "neutral"
                  }
                >
                  {formatDurationShort(session.totalMs)}
                </Chip>
              }
            >
              <span>
                {routeAreaLabels[session.area]} ·{" "}
                {session.currentPhase === "waiting"
                  ? "En espera"
                  : session.currentPhase === "attention"
                    ? "En atención"
                    : "Bloqueada"}
              </span>
              <span>Entró {formatDateTime(session.enteredAt)}</span>
            </RecordItem>
          ))}
          {report.active.length === 0 ? (
            <RecordListEmpty>
              No hay sesiones activas con estos filtros.
            </RecordListEmpty>
          ) : null}
        </RecordList>
      </Card>

      <Card>
        <CardHeader
          title="Calidad y reglas"
          description="Los avisos no cambian ni corrigen registros automáticamente"
        />
        <div className="grid gap-2 text-sm sm:grid-cols-3">
          <Quality label="Recorridos históricos" value={report.quality.inferredSessions} />
          <Quality label="Secuencias inválidas" value={report.quality.invalidSequences} />
          <Quality label="Cierres sin salida" value={report.quality.closedWithoutExit} />
        </div>
        <div className="mt-4 grid gap-2 text-xs leading-relaxed text-muted">
          <p>
            El período usa la entrada al área. Se excluyen visitas canceladas y
            registros marcados como prueba. Los abandonos sí se conservan hasta
            su evento de salida.
          </p>
          <p>
            Los recorridos anteriores a esta tarea solo muestran duración total:
            no se inventa cuánto fue espera o atención.
          </p>
        </div>
      </Card>
    </div>
  );
}

function TrendTable({
  title,
  description,
  rows
}: {
  title: string;
  description: string;
  rows: Array<{
    key: string;
    period: string;
    area: (typeof measuredRouteAreas)[number];
    sessions: number;
    averageWaitMs: number;
    p90WaitMs: number;
    averageTotalMs: number;
  }>;
}) {
  return (
    <Card className="p-0">
      <CardHeader className="mb-0 p-[18px]" title={title} description={description} />
      <Table caption={title}>
        <thead>
          <tr>
            <Th>Período</Th>
            <Th>Área</Th>
            <Th className="text-right">Sesiones</Th>
            <Th className="text-right">Espera promedio</Th>
            <Th className="text-right">P90</Th>
            <Th className="text-right">Total promedio</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <Tr key={row.key}>
              <Td className="tabular-nums">{row.period}</Td>
              <Td>{routeAreaLabels[row.area]}</Td>
              <Td className="text-right tabular-nums">{row.sessions}</Td>
              <Td className="text-right tabular-nums">
                {formatDurationShort(row.averageWaitMs)}
              </Td>
              <Td className="text-right tabular-nums">
                {formatDurationShort(row.p90WaitMs)}
              </Td>
              <Td className="text-right tabular-nums">
                {formatDurationShort(row.averageTotalMs)}
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
      {rows.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted">
          Todavía no hay sesiones medidas.
        </p>
      ) : null}
    </Card>
  );
}

function Quality({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[9px] border border-border bg-background p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums text-text">{value}</p>
    </div>
  );
}
