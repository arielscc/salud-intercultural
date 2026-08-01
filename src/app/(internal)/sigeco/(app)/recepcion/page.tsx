import { internalInputClassName } from "@/components/internal/Field";
import { MobileTabs } from "@/components/internal/MobileTabs";
import { OperationalQueueRefresh } from "@/components/internal/OperationalQueueRefresh";
import { VisitStatusPill } from "@/components/internal/StatusPill";
import { PatientAutocomplete } from "@/components/internal/reception/PatientAutocomplete";
import { DesktopPreviewDismiss } from "@/components/internal/reception/DesktopPreviewDismiss";
import { DateRangePickerField } from "@/components/internal/ui/DatePickerField";
import { Button, buttonVariants } from "@/components/internal/ui/Button";
import { Card, CardHeader } from "@/components/internal/ui/Card";
import { Chip } from "@/components/internal/ui/Chip";
import { DesktopRowActions } from "@/components/internal/ui/DesktopRowActions";
import { DesktopTableToolbar } from "@/components/internal/ui/DesktopTableToolbar";
import { PageHeader } from "@/components/internal/ui/PageHeader";
import { Pagination } from "@/components/internal/ui/Pagination";
import {
  RecordItem,
  RecordList,
  RecordListEmpty,
  RecordTable,
} from "@/components/internal/ui/RecordList";
import { Table, Td, Th, Tr } from "@/components/internal/ui/Table";
import { routeAreaLabels, visitStatusLabels } from "@/features/patients/labels";
import {
  boliviaDepartments,
  geographicOriginLabel
} from "@/features/geography/origin";
import { visitAttributionSummary } from "@/features/attribution/catalog";
import { roleHasPermission } from "@/features/internal-auth/permissions";
import { isActiveVisitStatus } from "@/features/visits/schemas/visit.schema";
import type { VisitStatus } from "@/generated/prisma/client";
import { cn } from "@/lib/cn";
import { dateOnlyRange, dayRange, formatDateTime } from "@/lib/dates";
import { parsePage } from "@/modules/database/pagination";
import {
  countPatients,
  getPatients,
} from "@/modules/database/queries/patients";
import { countVisits, getVisits } from "@/modules/database/queries/visits";
import { requirePermission } from "@/modules/permissions";
import { getBranchContext } from "@/features/branches/context";
import { CircleOff, ScanSearch, UserRoundPlus } from "lucide-react";
import Link from "next/link";

const statusOptions = Object.entries(visitStatusLabels) as Array<
  [VisitStatus, string]
>;

type ReceptionPageProps = {
  searchParams: Promise<{
    vista?: string;
    status?: VisitStatus | "all";
    page?: string;
    visita?: string;
    periodo?: string;
    desde?: string;
    hasta?: string;
    ciudad?: string;
    departamento?: string;
  }>;
};

type VisitPeriod = "all" | "today" | "7days" | "30days" | "custom";

const periodOptions: Array<{ value: VisitPeriod; label: string }> = [
  { value: "all", label: "Cualquier fecha" },
  { value: "today", label: "Hoy" },
  { value: "7days", label: "Últimos 7 días" },
  { value: "30days", label: "Últimos 30 días" },
  { value: "custom", label: "Rango personalizado" },
];

function visitDateRange(
  period: VisitPeriod,
  from?: string,
  to?: string,
): { start?: Date; end?: Date } {
  if (period === "custom") return dateOnlyRange(from, to);
  if (period === "all") return {};
  const today = dayRange();
  const days = period === "today" ? 1 : period === "7days" ? 7 : 30;
  return {
    start: new Date(today.start.getTime() - (days - 1) * 24 * 60 * 60 * 1000),
    end: today.end,
  };
}

function receptionSelectionHref(
  filters: {
    status?: VisitStatus | "all";
    periodo?: string;
    desde?: string;
    hasta?: string;
    ciudad?: string;
    departamento?: string;
  },
  visitId?: string,
) {
  const query = new URLSearchParams();
  if (filters.status) query.set("status", filters.status);
  if (filters.periodo && filters.periodo !== "all") query.set("periodo", filters.periodo);
  if (filters.desde) query.set("desde", filters.desde);
  if (filters.hasta) query.set("hasta", filters.hasta);
  if (filters.ciudad) query.set("ciudad", filters.ciudad);
  if (filters.departamento) query.set("departamento", filters.departamento);
  if (visitId) query.set("visita", visitId);
  const search = query.toString();
  return search ? `/sigeco/recepcion?${search}` : "/sigeco/recepcion";
}

const emptyVisitsMessage = (
  <>
    <span className="block font-semibold text-text">
      No hay visitas con ese filtro.
    </span>
    <span className="mt-1 block text-sm text-muted">
      Registra la llegada de un paciente para abrir su visita.
    </span>
  </>
);

const emptyPatientsMessage = (
  <>
    <span className="block font-semibold text-text">
      Todavía no hay pacientes registrados.
    </span>
    <span className="mt-1 block text-sm text-muted">
      Regístralo desde “Registrar llegada”.
    </span>
  </>
);

function VisitDiscontinuationLink({
  visitId,
  patientName,
  buttonClassName,
}: {
  visitId: string;
  patientName: string;
  buttonClassName?: string;
}) {
  return (
    <Link
      href={`/sigeco/recepcion/visitas/${visitId}#no-continuara`}
      aria-label={`Registrar que ${patientName} no continuará`}
      className={cn(
        buttonVariants({ variant: "ghost", size: "sm" }),
        "text-error hover:bg-error/10 hover:text-error",
        buttonClassName
      )}
    >
      No continuará
    </Link>
  );
}

function ViewTab({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "focus-ring inline-flex min-h-9 items-center rounded-[9px] border px-3.5 text-[13px] font-semibold transition",
        active
          ? "border-primary/30 bg-surface-soft text-primary-dark"
          : "border-border bg-surface text-muted hover:border-primary/40 hover:text-text",
      )}
    >
      {children}
    </Link>
  );
}

export default async function ReceptionPage({
  searchParams,
}: ReceptionPageProps) {
  const params = await searchParams;
  const vista = params.vista === "pacientes" ? "pacientes" : "visitas";
  const page = parsePage(params.page);
  const pageSize = 30;
  const period: VisitPeriod = periodOptions.some((option) => option.value === params.periodo)
    ? (params.periodo as VisitPeriod)
    : "all";
  const dateRange = visitDateRange(period, params.desde, params.hasta);
  const selectedStatus =
    params.status === "all" || statusOptions.some(([status]) => status === params.status)
      ? params.status
      : undefined;
  const statusFilter = selectedStatus === "all" ? undefined : selectedStatus;
  const activeOnly = !selectedStatus;
  const cityFilter = params.ciudad?.trim().slice(0, 120) || undefined;
  const departmentFilter =
    params.departamento?.trim().slice(0, 120) || undefined;

  const user =
    vista === "pacientes"
      ? await requirePermission("patients_read")
      : await requirePermission("visits_read");
  const { activeBranch } = await getBranchContext(user);
  const canReadDuplicates = roleHasPermission(
    user.role,
    "patient_duplicates_read"
  );
  const canRecordDiscontinuation = roleHasPermission(
    user.role,
    "visit_discontinuations_write"
  );
  const canReadDiscontinuations = roleHasPermission(
    user.role,
    "visit_discontinuations_read"
  );

  const visitPage =
    vista === "visitas"
      ? await Promise.all([
        getVisits({
          status: statusFilter,
          activeOnly,
          page,
          pageSize,
          checkedInFrom: dateRange.start,
          checkedInTo: dateRange.end,
          originCity: cityFilter,
          originDepartment: departmentFilter,
          branchCode: activeBranch.code,
        }),
        countVisits({
          status: statusFilter,
          activeOnly,
          checkedInFrom: dateRange.start,
          checkedInTo: dateRange.end,
          originCity: cityFilter,
          originDepartment: departmentFilter,
          branchCode: activeBranch.code,
        }),
      ])
      : null;
  const patientPage =
    vista === "pacientes"
      ? await Promise.all([
          getPatients({
            page,
            pageSize,
            city: cityFilter,
            department: departmentFilter
          }),
          countPatients({
            city: cityFilter,
            department: departmentFilter
          }),
        ])
      : null;
  const patients = patientPage?.[0] ?? [];
  const totalPatients = patientPage?.[1] ?? 0;
  const visitRows = visitPage?.[0] ?? [];
  const totalVisits = visitPage?.[1] ?? 0;
  const selectedVisit = visitRows.find((visit) => visit.id === params.visita);
  const visitFilters = {
    status: selectedStatus,
    periodo: period,
    desde: period === "custom" ? params.desde : undefined,
    hasta: period === "custom" ? params.hasta : undefined,
    ciudad: cityFilter,
    departamento: departmentFilter,
  };
  const clearSelectionHref = receptionSelectionHref(visitFilters);

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Recepción"
        description="Visitas, rutas de atención y padrón de pacientes"
        actionsClassName="lg:hidden"
        actions={
          <>
            {canReadDiscontinuations ? (
              <Link
                href="/sigeco/recepcion/abandonos"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" })
                )}
              >
                <CircleOff className="h-4 w-4" aria-hidden="true" />
                Abandonos
              </Link>
            ) : null}
            {canReadDuplicates ? (
              <Link
                href="/sigeco/recepcion/duplicados"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" })
                )}
              >
                <ScanSearch className="h-4 w-4" aria-hidden="true" />
                Duplicados
              </Link>
            ) : null}
            <Link
              href="/sigeco/recepcion/nuevo"
              className={cn(buttonVariants({ size: "sm" }))}
            >
              <UserRoundPlus className="h-4 w-4" aria-hidden="true" />
              Registrar llegada
            </Link>
          </>
        }
      />

      <OperationalQueueRefresh
        queueKey="reception"
        serverUpdatedAt={new Date().toISOString()}
      />

      <MobileTabs
        label="Vista de Recepción"
        items={[
          { href: "/sigeco/recepcion", label: "Visitas", active: vista === "visitas" },
          {
            href: "/sigeco/recepcion?vista=pacientes",
            label: "Pacientes",
            active: vista === "pacientes",
          },
          ...(canReadDiscontinuations
            ? [
                {
                  href: "/sigeco/recepcion/abandonos",
                  label: "Abandonos",
                  active: false
                }
              ]
            : [])
        ]}
      />

      <div className="hidden flex-wrap gap-2 sm:flex lg:hidden">
        <ViewTab href="/sigeco/recepcion" active={vista === "visitas"}>
          Visitas
        </ViewTab>
        <ViewTab
          href="/sigeco/recepcion?vista=pacientes"
          active={vista === "pacientes"}
        >
          Pacientes
        </ViewTab>
        {canReadDiscontinuations ? (
          <ViewTab href="/sigeco/recepcion/abandonos" active={false}>
            Abandonos
          </ViewTab>
        ) : null}
      </div>

      <DesktopTableToolbar
        views={
          <>
            <ViewTab href="/sigeco/recepcion" active={vista === "visitas"}>
              Visitas
            </ViewTab>
            <ViewTab
              href="/sigeco/recepcion?vista=pacientes"
              active={vista === "pacientes"}
            >
              Pacientes
            </ViewTab>
            {canReadDiscontinuations ? (
              <ViewTab
                href="/sigeco/recepcion/abandonos"
                active={false}
              >
                Abandonos
              </ViewTab>
            ) : null}
          </>
        }
        filters={
          vista === "visitas" ? (
            <form className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <label className="sr-only" htmlFor="desktop-reception-status">
                Filtrar visitas por estado
              </label>
              <select
                id="desktop-reception-status"
                className={cn(
                  internalInputClassName,
                  "h-9 min-h-9 max-w-64 py-1.5 text-[13px]",
                )}
                name="status"
                defaultValue={selectedStatus ?? ""}
              >
                <option value="">Solo activas</option>
                <option value="all">Todos los estados</option>
                {statusOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <label className="sr-only" htmlFor="desktop-reception-period">
                Filtrar visitas por fecha
              </label>
              <select
                id="desktop-reception-period"
                className={cn(internalInputClassName, "h-9 min-h-9 max-w-48 py-1.5 text-[13px]")}
                name="periodo"
                defaultValue={period}
              >
                {periodOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <DateRangePickerField
                fromName="desde"
                toName="hasta"
                defaultFrom={params.desde}
                defaultTo={params.hasta}
                className="w-72"
                triggerClassName="h-9 min-h-9 py-1.5 text-[13px]"
              />
              <input
                className={cn(
                  internalInputClassName,
                  "h-9 min-h-9 max-w-40 py-1.5 text-[13px]"
                )}
                type="search"
                name="ciudad"
                defaultValue={cityFilter}
                placeholder="Ciudad de llegada"
                aria-label="Filtrar por ciudad de procedencia"
              />
              <select
                className={cn(
                  internalInputClassName,
                  "h-9 min-h-9 max-w-44 py-1.5 text-[13px]"
                )}
                name="departamento"
                defaultValue={departmentFilter ?? ""}
                aria-label="Filtrar por departamento de procedencia"
              >
                <option value="">Todos los departamentos</option>
                {boliviaDepartments.map((department) => (
                  <option key={department} value={department}>
                    {department}
                  </option>
                ))}
              </select>
              <Button type="submit" variant="outline" size="sm">
                Filtrar
              </Button>
            </form>
          ) : (
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <PatientAutocomplete
                mode="navigate"
                className="min-w-0 flex-1"
              />
              <form className="flex items-center gap-2">
                <input type="hidden" name="vista" value="pacientes" />
                <input
                  className={cn(
                    internalInputClassName,
                    "h-9 min-h-9 max-w-40 py-1.5 text-[13px]"
                  )}
                  type="search"
                  name="ciudad"
                  defaultValue={cityFilter}
                  placeholder="Ciudad"
                  aria-label="Filtrar pacientes por ciudad habitual"
                />
                <select
                  className={cn(
                    internalInputClassName,
                    "h-9 min-h-9 max-w-44 py-1.5 text-[13px]"
                  )}
                  name="departamento"
                  defaultValue={departmentFilter ?? ""}
                  aria-label="Filtrar pacientes por departamento habitual"
                >
                  <option value="">Todos los departamentos</option>
                  {boliviaDepartments.map((department) => (
                    <option key={department} value={department}>
                      {department}
                    </option>
                  ))}
                </select>
                <Button type="submit" variant="outline" size="sm">
                  Filtrar
                </Button>
              </form>
            </div>
          )
        }
        count={
          vista === "visitas"
            ? `${visitRows.length} de ${totalVisits} visitas`
            : `${patients.length} de ${totalPatients} pacientes`
        }
        actions={
          <>
            {canReadDuplicates ? (
              <Link
                href="/sigeco/recepcion/duplicados"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" })
                )}
              >
                <ScanSearch className="h-4 w-4" aria-hidden="true" />
                Duplicados
              </Link>
            ) : null}
            <Link
              href="/sigeco/recepcion/nuevo"
              className={cn(buttonVariants({ size: "sm" }))}
            >
              <UserRoundPlus className="h-4 w-4" aria-hidden="true" />
              Registrar llegada
            </Link>
          </>
        }
      />

      {vista === "visitas" ? (
        <>
          <Card className="sm:hidden">
            <form className="grid gap-3">
              <p className="text-sm font-semibold text-text">Filtrar visitas</p>
              <select className={internalInputClassName} name="status" defaultValue={selectedStatus ?? ""} aria-label="Estado">
                <option value="">Solo activas</option>
                <option value="all">Todos los estados</option>
                {statusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <select className={internalInputClassName} name="periodo" defaultValue={period} aria-label="Período">
                {periodOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <DateRangePickerField
                fromName="desde"
                toName="hasta"
                defaultFrom={params.desde}
                defaultTo={params.hasta}
              />
              <input
                className={internalInputClassName}
                type="search"
                name="ciudad"
                defaultValue={cityFilter}
                placeholder="Ciudad de procedencia"
              />
              <select
                className={internalInputClassName}
                name="departamento"
                defaultValue={departmentFilter ?? ""}
                aria-label="Departamento de procedencia"
              >
                <option value="">Todos los departamentos</option>
                {boliviaDepartments.map((department) => (
                  <option key={department} value={department}>
                    {department}
                  </option>
                ))}
              </select>
              <Button type="submit" variant="outline">Aplicar filtros</Button>
            </form>
          </Card>
          <Card className="hidden sm:block lg:hidden">
            <form className="grid gap-3 sm:grid-cols-2">
              <select
                className={internalInputClassName}
                name="status"
                defaultValue={selectedStatus ?? ""}
              >
                <option value="">Solo activas</option>
                <option value="all">Todos los estados</option>
                {statusOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <select className={internalInputClassName} name="periodo" defaultValue={period} aria-label="Período">
                {periodOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <DateRangePickerField
                fromName="desde"
                toName="hasta"
                defaultFrom={params.desde}
                defaultTo={params.hasta}
                className="sm:col-span-2"
              />
              <input
                className={internalInputClassName}
                type="search"
                name="ciudad"
                defaultValue={cityFilter}
                placeholder="Ciudad de procedencia"
              />
              <select
                className={internalInputClassName}
                name="departamento"
                defaultValue={departmentFilter ?? ""}
              >
                <option value="">Todos los departamentos</option>
                {boliviaDepartments.map((department) => (
                  <option key={department} value={department}>
                    {department}
                  </option>
                ))}
              </select>
              <Button type="submit" variant="outline" className="sm:col-span-2">Aplicar filtros</Button>
            </form>
          </Card>

          <Card className="min-w-0 p-0 xl:hidden">
            <CardHeader
              className="mb-0 p-[18px] pb-3"
              title="Visitas registradas"
              description="Episodios de atención que coinciden con los filtros seleccionados."
            />
            <RecordList>
              {visitRows.map((visit) => (
                <RecordItem
                  key={visit.id}
                  href={`/sigeco/recepcion/visitas/${visit.id}`}
                  title={visit.patient.fullName}
                  status={<VisitStatusPill status={visit.status} />}
                  action={
                    isActiveVisitStatus(visit.status) &&
                    canRecordDiscontinuation ? (
                      <VisitDiscontinuationLink
                        visitId={visit.id}
                        patientName={visit.patient.fullName}
                        buttonClassName="min-h-10"
                      />
                    ) : undefined
                  }
                >
                  <span className="tabular-nums">
                    {formatDateTime(visit.checkedInAt)} ·{" "}
                    {visit.route
                      ? routeAreaLabels[visit.route.currentArea]
                      : "Sin ruta"}
                  </span>
                  <span className="tabular-nums">{visit.patient.phone}</span>
                  <span>
                    Procedencia:{" "}
                    {geographicOriginLabel({
                      city: visit.originCity,
                      department: visit.originDepartment,
                      country: visit.originCountry
                    }) || "Sin registrar"}
                  </span>
                  <span>
                    Fuente: {visitAttributionSummary(visit.attribution)}
                  </span>
                  {visit.workItems.length > 0 ? (
                    <span>
                      <Chip tone="primary">
                        {visit.workItems.length} pendientes
                      </Chip>
                    </span>
                  ) : null}
                </RecordItem>
              ))}
              {visitRows.length === 0 ? (
                <RecordListEmpty>{emptyVisitsMessage}</RecordListEmpty>
              ) : null}
            </RecordList>
            <RecordTable>
              <Table caption="Visitas de recepción">
                <thead>
                  <tr>
                    <Th>Paciente</Th>
                    <Th className="lg:hidden xl:table-cell">Teléfono</Th>
                    <Th className="lg:hidden xl:table-cell">Llegada</Th>
                    <Th>Procedencia</Th>
                    <Th>Fuente</Th>
                    <Th>Área actual</Th>
                    <Th>Tareas</Th>
                    <Th>Estado</Th>
                    <Th>
                      <span className="sr-only">Acción rápida</span>
                    </Th>
                  </tr>
                </thead>
                <tbody>
                  {visitRows.map((visit) => (
                    <Tr key={visit.id}>
                      <Td className="font-semibold text-text">
                        <Link
                          href={`/sigeco/recepcion/visitas/${visit.id}`}
                          className="focus-ring rounded-[7px] hover:text-primary-dark hover:underline"
                        >
                          {visit.patient.fullName}
                        </Link>
                      </Td>
                      <Td className="tabular-nums lg:hidden xl:table-cell">
                        {visit.patient.phone}
                      </Td>
                      <Td className="tabular-nums lg:hidden xl:table-cell">
                        {formatDateTime(visit.checkedInAt)}
                      </Td>
                      <Td>
                        {geographicOriginLabel({
                          city: visit.originCity,
                          department: visit.originDepartment,
                          country: visit.originCountry
                        }) || "—"}
                      </Td>
                      <Td>{visitAttributionSummary(visit.attribution)}</Td>
                      <Td>
                        {visit.route
                          ? routeAreaLabels[visit.route.currentArea]
                          : "Sin ruta"}
                      </Td>
                      <Td className="tabular-nums">
                        {visit.workItems.length > 0 ? (
                          <Chip tone="primary">
                            {visit.workItems.length} pendientes
                          </Chip>
                        ) : (
                          "—"
                        )}
                      </Td>
                      <Td>
                        <VisitStatusPill status={visit.status} />
                      </Td>
                      <Td>
                        {isActiveVisitStatus(visit.status) &&
                        canRecordDiscontinuation ? (
                          <>
                            <div className="lg:hidden">
                              <VisitDiscontinuationLink
                                visitId={visit.id}
                                patientName={visit.patient.fullName}
                              />
                            </div>
                            <DesktopRowActions label={`Acciones de ${visit.patient.fullName}`}>
                              <VisitDiscontinuationLink
                                visitId={visit.id}
                                patientName={visit.patient.fullName}
                                buttonClassName="w-full justify-start"
                              />
                            </DesktopRowActions>
                          </>
                        ) : null}
                      </Td>
                    </Tr>
                  ))}
                  {visitRows.length === 0 ? (
                    <tr>
                      <Td className="py-8 text-center" colSpan={9}>
                        {emptyVisitsMessage}
                      </Td>
                    </tr>
                  ) : null}
                </tbody>
              </Table>
            </RecordTable>
            <Pagination
              page={page}
              pageSize={pageSize}
              totalItems={totalVisits}
              pathname="/sigeco/recepcion"
              searchParams={{
                status: selectedStatus,
                periodo: period === "all" ? undefined : period,
                desde: period === "custom" ? params.desde : undefined,
                hasta: period === "custom" ? params.hasta : undefined,
                ciudad: cityFilter,
                departamento: departmentFilter,
              }}
            />
          </Card>

          <div className="hidden min-w-0 items-start gap-4 xl:grid xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
            <section
              className="min-w-0 overflow-hidden rounded-[9px] border border-border bg-surface"
              aria-label="Visitas de recepción"
            >
              <div className="flex min-h-14 items-center justify-between gap-4 border-b border-border px-4 py-2">
                <div>
                  <h3 className="text-sm font-semibold text-text">Visitas registradas</h3>
                  <p className="text-xs text-muted">Resultados del estado y período seleccionados.</p>
                </div>
                <span className="text-xs tabular-nums text-muted">{totalVisits}</span>
              </div>
              <div className="max-h-[calc(100dvh-15rem)] overflow-y-auto">
                {visitRows.map((visit) => {
                  const selected = selectedVisit?.id === visit.id;

                  return (
                    <Link
                      key={visit.id}
                      href={receptionSelectionHref(visitFilters, visit.id)}
                      scroll={false}
                      aria-current={selected ? "true" : undefined}
                      className={cn(
                        "focus-ring grid min-h-[72px] grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 border-b border-border px-4 py-3 transition last:border-b-0 hover:bg-surface-soft/40",
                        selected &&
                          "bg-surface-soft/70 ring-1 ring-inset ring-primary/40 hover:bg-surface-soft/70",
                      )}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-text">
                          {visit.patient.fullName}
                        </span>
                        <span className="mt-0.5 block truncate text-xs tabular-nums text-muted">
                          {visit.patient.internalCode} ·{" "}
                          {formatDateTime(visit.checkedInAt)}
                        </span>
                      </span>
                      <VisitStatusPill status={visit.status} />
                      <span className="min-w-0 truncate text-xs text-muted">
                        {visit.route
                          ? routeAreaLabels[visit.route.currentArea]
                          : "Sin ruta"}
                        {visit.workItems.length > 0
                          ? ` · ${visit.workItems.length} pendientes`
                          : ""}
                      </span>
                      <span className="min-w-0 truncate text-xs text-muted">
                        {geographicOriginLabel({
                          city: visit.originCity,
                          department: visit.originDepartment,
                          country: visit.originCountry
                        }) || "Procedencia sin registrar"}
                      </span>
                      <span className="min-w-0 truncate text-xs text-muted">
                        {visitAttributionSummary(visit.attribution)}
                      </span>
                    </Link>
                  );
                })}
                {visitRows.length === 0 ? (
                  <div className="px-4 py-8 text-center">{emptyVisitsMessage}</div>
                ) : null}
              </div>
              <Pagination
                page={page}
                pageSize={pageSize}
                totalItems={totalVisits}
                pathname="/sigeco/recepcion"
                searchParams={{
                  status: selectedStatus,
                  periodo: period === "all" ? undefined : period,
                  desde: period === "custom" ? params.desde : undefined,
                  hasta: period === "custom" ? params.hasta : undefined,
                  ciudad: cityFilter,
                  departamento: departmentFilter,
                }}
              />
            </section>

            <aside className="sticky top-0 min-w-0" aria-label="Vista previa de la visita">
              {selectedVisit ? (
                <section className="rounded-[9px] border border-border bg-surface p-[18px]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold tabular-nums text-primary-dark">
                        {selectedVisit.patient.internalCode}
                      </p>
                      <h3 className="truncate font-sora text-lg font-bold text-text">
                        {selectedVisit.patient.fullName}
                      </h3>
                      <p className="mt-0.5 text-sm tabular-nums text-muted">
                        {selectedVisit.patient.phone}
                      </p>
                    </div>
                    <DesktopPreviewDismiss href={clearSelectionHref} />
                  </div>

                  <div className="mt-4">
                    <VisitStatusPill status={selectedVisit.status} />
                  </div>

                  <dl className="mt-4 grid gap-3 border-t border-border pt-4 text-sm">
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                        Área actual
                      </dt>
                      <dd className="mt-0.5 font-medium text-text">
                        {selectedVisit.route
                          ? routeAreaLabels[selectedVisit.route.currentArea]
                          : "Sin ruta"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                        Fuente
                      </dt>
                      <dd className="mt-0.5 text-text">
                        {visitAttributionSummary(selectedVisit.attribution)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                        Llegada
                      </dt>
                      <dd className="mt-0.5 tabular-nums text-text">
                        {formatDateTime(selectedVisit.checkedInAt)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                        Procedencia
                      </dt>
                      <dd className="mt-0.5 text-text">
                        {geographicOriginLabel({
                          city: selectedVisit.originCity,
                          department: selectedVisit.originDepartment,
                          country: selectedVisit.originCountry
                        }) || "Sin registrar"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                        Motivo
                      </dt>
                      <dd className="mt-0.5 text-text">
                        {selectedVisit.reason || "Sin motivo registrado"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                        Tareas
                      </dt>
                      <dd className="mt-0.5 tabular-nums text-text">
                        {selectedVisit.workItems.length} pendientes
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-5 grid gap-2 border-t border-border pt-4">
                    <Link
                      href={`/sigeco/recepcion/visitas/${selectedVisit.id}`}
                      className={cn(buttonVariants({ size: "sm" }), "w-full")}
                    >
                      Abrir visita
                    </Link>
                    <Link
                      href={`/sigeco/recepcion/pacientes/${selectedVisit.patientId}`}
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full")}
                    >
                      Ver ficha
                    </Link>
                  </div>
                </section>
              ) : (
                <section className="rounded-[9px] border border-border bg-surface px-5 py-10 text-center">
                  <p className="text-sm font-semibold text-text">Sin visita seleccionada</p>
                </section>
              )}
            </aside>
          </div>
        </>
      ) : (
        <>
          <Card className="sm:hidden">
            <PatientAutocomplete mode="navigate" />
            <form className="mt-3 grid gap-2 border-t border-border pt-3">
              <input type="hidden" name="vista" value="pacientes" />
              <input
                className={internalInputClassName}
                type="search"
                name="ciudad"
                defaultValue={cityFilter}
                placeholder="Ciudad habitual"
              />
              <select
                className={internalInputClassName}
                name="departamento"
                defaultValue={departmentFilter ?? ""}
                aria-label="Departamento habitual"
              >
                <option value="">Todos los departamentos</option>
                {boliviaDepartments.map((department) => (
                  <option key={department} value={department}>
                    {department}
                  </option>
                ))}
              </select>
              <Button type="submit" variant="outline">
                Filtrar procedencia
              </Button>
            </form>
          </Card>
          <Card className="hidden sm:block lg:hidden">
            <PatientAutocomplete mode="navigate" />
            <form className="mt-3 grid gap-2 border-t border-border pt-3 sm:grid-cols-[1fr_1fr_auto]">
              <input type="hidden" name="vista" value="pacientes" />
              <input
                className={internalInputClassName}
                type="search"
                name="ciudad"
                defaultValue={cityFilter}
                placeholder="Ciudad habitual"
              />
              <select
                className={internalInputClassName}
                name="departamento"
                defaultValue={departmentFilter ?? ""}
                aria-label="Departamento habitual"
              >
                <option value="">Todos los departamentos</option>
                {boliviaDepartments.map((department) => (
                  <option key={department} value={department}>
                    {department}
                  </option>
                ))}
              </select>
              <Button type="submit" variant="outline">
                Filtrar
              </Button>
            </form>
          </Card>

          <Card className="min-w-0 p-0">
            <CardHeader
              className="mb-0 p-[18px] pb-3"
              title="Padrón de pacientes"
              description="Personas registradas en el sistema y cantidad de visitas acumuladas."
            />
            <RecordList>
              {patients.map((patient) => (
                <RecordItem
                  key={patient.id}
                  href={`/sigeco/recepcion/pacientes/${patient.id}`}
                  title={patient.fullName}
                  status={<Chip>{patient._count.visits} visitas</Chip>}
                >
                  <span className="tabular-nums">
                    {patient.internalCode} · {patient.phone}
                  </span>
                  {patient.city ? (
                    <span>
                      {geographicOriginLabel(patient)}
                    </span>
                  ) : null}
                </RecordItem>
              ))}
              {patients.length === 0 ? (
                <RecordListEmpty>{emptyPatientsMessage}</RecordListEmpty>
              ) : null}
            </RecordList>
            <RecordTable>
              <Table caption="Padrón de pacientes">
                <thead>
                  <tr>
                    <Th>Nombre</Th>
                    <Th>Código</Th>
                    <Th>Teléfono</Th>
                    <Th className="lg:hidden xl:table-cell">Procedencia habitual</Th>
                    <Th className="text-right">Visitas</Th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map((patient) => (
                    <Tr key={patient.id}>
                      <Td className="font-semibold text-text">
                        <Link
                          href={`/sigeco/recepcion/pacientes/${patient.id}`}
                          className="focus-ring rounded-[7px] hover:text-primary-dark hover:underline"
                        >
                          {patient.fullName}
                        </Link>
                      </Td>
                      <Td className="tabular-nums">{patient.internalCode}</Td>
                      <Td className="tabular-nums">{patient.phone}</Td>
                      <Td className="lg:hidden xl:table-cell">
                        {geographicOriginLabel(patient) || "—"}
                      </Td>
                      <Td className="text-right tabular-nums">{patient._count.visits}</Td>
                    </Tr>
                  ))}
                  {patients.length === 0 ? (
                    <tr>
                      <Td className="py-8 text-center" colSpan={5}>
                        {emptyPatientsMessage}
                      </Td>
                    </tr>
                  ) : null}
                </tbody>
              </Table>
            </RecordTable>
            <Pagination
              page={page}
              pageSize={pageSize}
              totalItems={totalPatients}
              pathname="/sigeco/recepcion"
              searchParams={{
                vista: "pacientes",
                ciudad: cityFilter,
                departamento: departmentFilter
              }}
            />
          </Card>
        </>
      )}
    </div>
  );
}
