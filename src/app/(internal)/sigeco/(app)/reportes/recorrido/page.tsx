import { subDays } from "date-fns";
import Link from "next/link";
import {
  BadgeDollarSign,
  CalendarCheck,
  ClipboardCheck,
  HandCoins,
  ShoppingBag,
  UsersRound
} from "lucide-react";
import { DateRangePickerField } from "@/components/internal/ui/DatePickerField";
import { Field, internalInputClassName } from "@/components/internal/Field";
import { JourneyFunnel } from "@/components/internal/patient-journey/JourneyFunnel";
import { JourneyTrend } from "@/components/internal/patient-journey/JourneyTrend";
import { Card, CardHeader } from "@/components/internal/ui/Card";
import { Chip } from "@/components/internal/ui/Chip";
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
  conversionPercent,
  UNATTRIBUTED_SOURCE_CODE
} from "@/features/patient-journey/report";
import { formatMoney } from "@/features/sales/labels";
import {
  treatmentProposalOutcomeStatusLabels
} from "@/features/treatment-proposals/labels";
import {
  visitIntakeTypeLabels
} from "@/features/reception/labels";
import { visitStatusLabels } from "@/features/patients/labels";
import {
  dateOnlyRange,
  formatDateTime,
  todayDateOnly
} from "@/lib/dates";
import {
  getPatientJourneyFilterOptions,
  getPatientJourneyReport
} from "@/modules/database/queries/patient-journey";
import { requirePermission } from "@/modules/permissions";

const PAGE_SIZE = 25;
const periodOptions = [
  { value: "7", label: "Últimos 7 días" },
  { value: "30", label: "Últimos 30 días" },
  { value: "90", label: "Últimos 90 días" },
  { value: "custom", label: "Rango personalizado" },
  { value: "all", label: "Todo el historial" }
] as const;
type JourneyPeriod = (typeof periodOptions)[number]["value"];

type JourneySearchParams = {
  periodo?: string;
  desde?: string;
  hasta?: string;
  fuente?: string;
  ciudad?: string;
  medico?: string;
  sucursal?: string;
  page?: string;
};

function resolvedPeriod(params: JourneySearchParams) {
  const period = periodOptions.some((option) => option.value === params.periodo)
    ? (params.periodo as JourneyPeriod)
    : "30";
  if (period === "all") {
    return {
      period,
      fromValue: "",
      toValue: "",
      range: { start: undefined, end: undefined }
    };
  }
  if (period === "custom") {
    const range = dateOnlyRange(params.desde, params.hasta);
    if (range.start || range.end) {
      return {
        period,
        fromValue: params.desde ?? "",
        toValue: params.hasta ?? "",
        range
      };
    }
  }
  const days = period === "7" ? 7 : period === "90" ? 90 : 30;
  const today = todayDateOnly();
  const from = todayDateOnly(subDays(new Date(), days - 1));
  return {
    period: period === "custom" ? ("30" as const) : period,
    fromValue: from,
    toValue: today,
    range: dateOnlyRange(from, today)
  };
}

function positivePage(value?: string) {
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

function branchLabel(value: string) {
  if (value === "el-alto") return "El Alto";
  if (value === "cochabamba") return "Cochabamba";
  return value.replaceAll("-", " ");
}

export default async function PatientJourneyReportPage({
  searchParams
}: {
  searchParams: Promise<JourneySearchParams>;
}) {
  await requirePermission("reports_read");
  const params = await searchParams;
  const period = resolvedPeriod(params);
  const filters = {
    from: period.range.start,
    to: period.range.end,
    sourceCode: params.fuente || undefined,
    city: params.ciudad || undefined,
    doctorId: params.medico || undefined,
    branchCode: params.sucursal || undefined
  };
  const [report, options] = await Promise.all([
    getPatientJourneyReport(filters),
    getPatientJourneyFilterOptions()
  ]);
  const page = positivePage(params.page);
  const start = (page - 1) * PAGE_SIZE;
  const pageRows = report.rows.slice(start, start + PAGE_SIZE);
  const preservedParams = {
    periodo: period.period,
    desde: period.period === "custom" ? period.fromValue : undefined,
    hasta: period.period === "custom" ? period.toValue : undefined,
    fuente: params.fuente,
    ciudad: params.ciudad,
    medico: params.medico,
    sucursal: params.sucursal
  };

  return (
    <div className="grid gap-5">
      <PageHeader
        title="Recorrido completo del paciente"
        description="Llegada, consulta, propuesta, compra, cobro, seguimiento y retorno"
      />

      <Card>
        <form method="get" className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
          <Field label="Período">
            <select
              className={internalInputClassName}
              name="periodo"
              defaultValue={period.period}
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
          <Field label="Fuente">
            <select
              className={internalInputClassName}
              name="fuente"
              defaultValue={params.fuente ?? ""}
            >
              <option value="">Todas</option>
              <option value={UNATTRIBUTED_SOURCE_CODE}>
                Sin fuente registrada
              </option>
              {options.sources.map((source) => (
                <option key={source.code} value={source.code}>
                  {source.internalLabel}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Ciudad de procedencia">
            <select
              className={internalInputClassName}
              name="ciudad"
              defaultValue={params.ciudad ?? ""}
            >
              <option value="">Todas</option>
              {options.cities.map((city) => (
                <option key={city.value} value={city.value}>
                  {city.value} ({city.count})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Médico">
            <select
              className={internalInputClassName}
              name="medico"
              defaultValue={params.medico ?? ""}
            >
              <option value="">Todos</option>
              {options.doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.label}
                  {doctor.active ? "" : " (inactivo)"}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Sucursal de llegada">
            <select
              className={internalInputClassName}
              name="sucursal"
              defaultValue={params.sucursal ?? ""}
            >
              <option value="">Todas</option>
              {options.branches.map((branch) => (
                <option key={branch.value} value={branch.value}>
                  {branchLabel(branch.value)} ({branch.count})
                </option>
              ))}
            </select>
          </Field>
          <div className="flex items-end gap-2">
            <button className={buttonVariants()} type="submit">
              Aplicar filtros
            </button>
            <Link
              className={buttonVariants({ variant: "outline" })}
              href="/sigeco/reportes/recorrido"
            >
              Limpiar
            </Link>
          </div>
        </form>
      </Card>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          label="Llegadas"
          value={report.totals.arrivals}
          note={`${report.totals.uniquePatients} pacientes diferentes`}
          icon={UsersRound}
        />
        <KpiCard
          label="Consultas"
          value={report.totals.consultations}
          note={`${report.totals.finalizedConsultations} finalizadas`}
          icon={ClipboardCheck}
          tone="primary-dark"
        />
        <KpiCard
          label="Propuestas aceptadas"
          value={report.totals.accepted}
          note={`${conversionPercent(report.totals.accepted, report.totals.proposals).toFixed(1)}% de propuestas`}
          icon={CalendarCheck}
          tone="secondary"
        />
        <KpiCard
          label="Visitas con compra"
          value={report.totals.visitsWithSale}
          note={`${report.totals.sales} ventas registradas`}
          icon={ShoppingBag}
          tone="accent"
        />
        <KpiCard
          label="Dinero vendido"
          value={formatMoney(report.totals.soldCents)}
          note="Total de ventas no anuladas"
          icon={BadgeDollarSign}
          tone="primary"
        />
        <KpiCard
          label="Dinero cobrado"
          value={formatMoney(report.totals.collectedCents)}
          note={`${formatMoney(report.totals.pendingCents)} pendiente`}
          icon={HandCoins}
          tone="secondary"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1.4fr]">
        <Card>
          <CardHeader
            title="Dónde se pierde el recorrido"
            description="Cada barra cuenta visitas distintas, no cambios entre áreas"
          />
          <JourneyFunnel stages={report.funnel} />
        </Card>
        <Card>
          <CardHeader
            title="Tendencia diaria"
            description="Últimos 31 días visibles del período seleccionado"
          />
          <JourneyTrend points={report.trends} />
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card className="p-0">
          <CardHeader
            className="mb-0 p-[18px]"
            title="Fuentes y dinero"
            description="Ordenadas por dinero cobrado; “Sin fuente” permanece visible"
          />
          <Table caption="Resultado del recorrido por fuente de captación">
            <thead>
              <tr>
                <Th>Fuente</Th>
                <Th className="text-right">Llegadas</Th>
                <Th className="text-right">Aceptadas</Th>
                <Th className="text-right">Ventas</Th>
                <Th className="text-right">Vendido</Th>
                <Th className="text-right">Cobrado</Th>
                <Th className="text-right">Pendiente</Th>
              </tr>
            </thead>
            <tbody>
              {report.sources.map((source) => (
                <Tr key={source.code}>
                  <Td className="font-semibold text-text">{source.label}</Td>
                  <Td className="text-right tabular-nums">
                    {source.totals.arrivals}
                  </Td>
                  <Td className="text-right tabular-nums">
                    {source.totals.accepted}
                  </Td>
                  <Td className="text-right tabular-nums">
                    {source.totals.sales}
                  </Td>
                  <Td className="text-right tabular-nums">
                    {formatMoney(source.totals.soldCents)}
                  </Td>
                  <Td className="text-right font-semibold tabular-nums text-text">
                    {formatMoney(source.totals.collectedCents)}
                  </Td>
                  <Td className="text-right tabular-nums">
                    {formatMoney(source.totals.pendingCents)}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
          {report.sources.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted">
              Sin fuentes para este período.
            </p>
          ) : null}
        </Card>

        <Card>
          <CardHeader
            title="Continuidad y calidad"
            description="Indicadores que ayudan a interpretar el embudo"
          />
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <Metric label="Primeras visitas" value={report.totals.firstVisits} />
            <Metric label="Visitas de retorno" value={report.totals.returnVisits} />
            <Metric label="Visitas abandonadas" value={report.totals.abandoned} />
            <Metric label="Seguimientos creados" value={report.totals.followUps} />
            <Metric
              label="Sin fuente"
              value={report.quality.withoutSource}
              warning={report.quality.withoutSource > 0}
            />
            <Metric
              label="Venta sin aceptación vigente"
              value={report.quality.saleWithoutAcceptedProposal}
              warning={report.quality.saleWithoutAcceptedProposal > 0}
            />
          </dl>
          <details className="mt-4 rounded-[9px] border border-border">
            <summary className="focus-ring cursor-pointer rounded-[9px] px-3 py-2 text-sm font-semibold text-text">
              Fórmulas y exclusiones
            </summary>
            <div className="grid gap-2 border-t border-border px-3 py-3 text-xs leading-relaxed text-muted">
              <p>
                Propietario: Dirección. Zona horaria: America/La_Paz. El período
                se aplica a la fecha de llegada de la visita.
              </p>
              <p>
                Una visita se cuenta una sola vez. Consulta significa que existe
                un registro clínico; propuesta y aceptación usan únicamente la
                decisión vigente.
              </p>
              <p>
                Ventas excluye anuladas y ventas sin visita. Vendido suma el
                total; cobrado suma el pago neto registrado; pendiente suma el
                saldo.
              </p>
              <p>
                Retorno significa una visita clasificada como control, problema
                nuevo o revisión de resultados. Seguimientos cuentan tareas
                enlazadas a la visita.
              </p>
            </div>
          </details>
        </Card>
      </div>

      <Card className="p-0">
        <CardHeader
          className="mb-0 p-[18px]"
          title="Visitas que forman el reporte"
          description={`${report.rows.length} registros fuente para reconciliar las cifras`}
        />
        <RecordList>
          {pageRows.map((row) => (
            <RecordItem
              key={row.visitId}
              href={`/sigeco/recepcion/visitas/${row.visitId}`}
              title={row.patient.fullName}
              status={
                <Chip tone={row.saleCount > 0 ? "success" : "neutral"}>
                  {row.saleCount > 0 ? "Con compra" : "Sin compra"}
                </Chip>
              }
            >
              <span>
                {formatDateTime(row.checkedInAt)} · {row.source?.label ?? "Sin fuente"}
              </span>
              <span>
                {row.doctor?.label ?? "Sin médico"} · {row.city}
              </span>
              <span>
                Vendido {formatMoney(row.soldCents)} · Cobrado{" "}
                {formatMoney(row.collectedCents)}
              </span>
            </RecordItem>
          ))}
          {pageRows.length === 0 ? (
            <RecordListEmpty>Sin visitas para estos filtros.</RecordListEmpty>
          ) : null}
        </RecordList>
        <RecordTable>
          <Table caption="Visitas fuente del reporte de recorrido">
            <thead>
              <tr>
                <Th>Llegada y paciente</Th>
                <Th>Procedencia</Th>
                <Th>Fuente</Th>
                <Th>Médico</Th>
                <Th>Recorrido</Th>
                <Th className="text-right">Ventas</Th>
                <Th className="text-right">Vendido / cobrado</Th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => (
                <Tr key={row.visitId}>
                  <Td>
                    <Link
                      className="font-semibold text-primary-dark hover:underline"
                      href={`/sigeco/recepcion/visitas/${row.visitId}`}
                    >
                      {row.patient.fullName}
                    </Link>
                    <span className="mt-0.5 block text-xs tabular-nums">
                      {row.patient.internalCode} · {formatDateTime(row.checkedInAt)}
                    </span>
                  </Td>
                  <Td>
                    {row.city}
                    <span className="block text-xs">
                      {row.department ?? "Sin departamento"} ·{" "}
                      {branchLabel(row.branchCode)}
                    </span>
                  </Td>
                  <Td>{row.source?.label ?? "Sin fuente registrada"}</Td>
                  <Td>{row.doctor?.label ?? "Sin médico registrado"}</Td>
                  <Td>
                    <span className="font-medium text-text">
                      {row.consultationStatus
                        ? row.proposalStatus
                          ? treatmentProposalOutcomeStatusLabels[
                              row.proposalStatus
                            ]
                          : "Consulta sin propuesta"
                        : visitStatusLabels[row.visitStatus]}
                    </span>
                    <span className="block text-xs">
                      {visitIntakeTypeLabels[row.intakeType]}
                      {row.abandoned ? " · Abandonó" : ""}
                      {row.followUpCount > 0
                        ? ` · ${row.followUpCount} seguimiento(s)`
                        : ""}
                    </span>
                  </Td>
                  <Td className="text-right tabular-nums">{row.saleCount}</Td>
                  <Td className="text-right tabular-nums">
                    {formatMoney(row.soldCents)}
                    <span className="block text-xs">
                      {formatMoney(row.collectedCents)} cobrado
                    </span>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
          {pageRows.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted">
              Sin visitas para estos filtros.
            </p>
          ) : null}
        </RecordTable>
        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          totalItems={report.rows.length}
          pathname="/sigeco/reportes/recorrido"
          searchParams={preservedParams}
        />
      </Card>
    </div>
  );
}

function Metric({
  label,
  value,
  warning
}: {
  label: string;
  value: number;
  warning?: boolean;
}) {
  return (
    <div className="rounded-[9px] border border-border bg-background p-3">
      <dt className="text-xs text-muted">{label}</dt>
      <dd
        className={`mt-1 text-xl font-bold tabular-nums ${
          warning ? "text-warning" : "text-text"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
