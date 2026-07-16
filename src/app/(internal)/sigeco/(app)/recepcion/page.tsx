import { ConfirmForm } from "@/components/internal/ConfirmForm";
import { internalInputClassName } from "@/components/internal/Field";
import { MobileAutoSubmitSelect } from "@/components/internal/MobileAutoSubmitSelect";
import { MobileTabs } from "@/components/internal/MobileTabs";
import { VisitStatusPill } from "@/components/internal/StatusPill";
import { SubmitButton } from "@/components/internal/SubmitButton";
import { PatientAutocomplete } from "@/components/internal/reception/PatientAutocomplete";
import { DesktopPreviewDismiss } from "@/components/internal/reception/DesktopPreviewDismiss";
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
import { applyVisitFlowAction } from "@/features/visits/actions";
import { isActiveVisitStatus } from "@/features/visits/schemas/visit.schema";
import type { VisitStatus } from "@/generated/prisma/client";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/dates";
import { parsePage } from "@/modules/database/pagination";
import {
  countPatients,
  getPatients,
} from "@/modules/database/queries/patients";
import { getVisits } from "@/modules/database/queries/visits";
import { requirePermission } from "@/modules/permissions";
import { UserRoundPlus } from "lucide-react";
import Link from "next/link";

const statusOptions = Object.entries(visitStatusLabels) as Array<
  [VisitStatus, string]
>;

type ReceptionPageProps = {
  searchParams: Promise<{
    vista?: string;
    status?: VisitStatus;
    search?: string;
    page?: string;
    visita?: string;
  }>;
};

function receptionSelectionHref(status?: VisitStatus, visitId?: string) {
  const query = new URLSearchParams();
  if (status) query.set("status", status);
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
      No hay pacientes con esa búsqueda.
    </span>
    <span className="mt-1 block text-sm text-muted">
      Regístralo desde “Registrar llegada”.
    </span>
  </>
);

function VisitLeftForm({
  visitId,
  patientName,
  buttonClassName,
}: {
  visitId: string;
  patientName: string;
  buttonClassName?: string;
}) {
  return (
    <ConfirmForm
      action={applyVisitFlowAction}
      notice="Retiro registrado"
      confirmTitle="Marcar retiro"
      confirmDescription={`La visita de ${patientName} se cerrará como retiro sin atención completa. Esta acción no se puede deshacer.`}
      confirmLabel="Marcar retiro"
    >
      <input type="hidden" name="visitId" value={visitId} />
      <input type="hidden" name="flow" value="left" />
      <SubmitButton
        variant="ghost"
        size="sm"
        className={cn(
          "text-error hover:bg-error/10 hover:text-error",
          buttonClassName,
        )}
      >
        Se retiró
      </SubmitButton>
    </ConfirmForm>
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
  const vista = params.vista === "pacientes" ? "pacientes" : "hoy";
  const page = parsePage(params.page);
  const pageSize = 30;

  if (vista === "pacientes") {
    await requirePermission("patients_read");
  } else {
    await requirePermission("visits_read");
  }

  const visits =
    vista === "hoy"
      ? await getVisits({
          status: params.status,
          activeOnly: !params.status,
          pageSize: 30,
        })
      : [];
  const patientPage =
    vista === "pacientes"
      ? await Promise.all([
          getPatients({ search: params.search, page, pageSize }),
          countPatients({ search: params.search }),
        ])
      : null;
  const patients = patientPage?.[0] ?? [];
  const totalPatients = patientPage?.[1] ?? 0;
  const selectedVisit = visits.find((visit) => visit.id === params.visita);
  const clearSelectionHref = receptionSelectionHref(params.status);

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Recepción"
        description="Llegadas del día y padrón de pacientes"
        actionsClassName="lg:hidden"
        actions={
          <Link
            href="/sigeco/recepcion/nuevo"
            className={cn(buttonVariants({ size: "sm" }))}
          >
            <UserRoundPlus className="h-4 w-4" aria-hidden="true" />
            Registrar llegada
          </Link>
        }
      />

      <MobileTabs
        label="Vista de Recepción"
        items={[
          { href: "/sigeco/recepcion", label: "Hoy", active: vista === "hoy" },
          {
            href: "/sigeco/recepcion?vista=pacientes",
            label: "Pacientes",
            active: vista === "pacientes",
          },
        ]}
      />

      <div className="hidden flex-wrap gap-2 sm:flex lg:hidden">
        <ViewTab href="/sigeco/recepcion" active={vista === "hoy"}>
          Hoy
        </ViewTab>
        <ViewTab
          href="/sigeco/recepcion?vista=pacientes"
          active={vista === "pacientes"}
        >
          Pacientes
        </ViewTab>
      </div>

      <DesktopTableToolbar
        views={
          <>
            <ViewTab href="/sigeco/recepcion" active={vista === "hoy"}>
              Hoy
            </ViewTab>
            <ViewTab
              href="/sigeco/recepcion?vista=pacientes"
              active={vista === "pacientes"}
            >
              Pacientes
            </ViewTab>
          </>
        }
        filters={
          vista === "hoy" ? (
            <form className="flex min-w-0 flex-1 items-center gap-2">
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
                defaultValue={params.status ?? ""}
              >
                <option value="">Solo activas</option>
                {statusOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <Button type="submit" variant="outline" size="sm">
                Filtrar
              </Button>
            </form>
          ) : (
            <form className="flex min-w-0 flex-1 items-center gap-2">
              <input type="hidden" name="vista" value="pacientes" />
              <label className="sr-only" htmlFor="desktop-patient-search">
                Buscar pacientes
              </label>
              <input
                id="desktop-patient-search"
                className={cn(
                  internalInputClassName,
                  "h-9 min-h-9 min-w-0 max-w-sm py-1.5 text-[13px]",
                )}
                type="search"
                name="search"
                placeholder="Nombre, teléfono, código o ciudad"
                defaultValue={params.search}
              />
              <Button type="submit" variant="outline" size="sm">
                Buscar
              </Button>
            </form>
          )
        }
        count={
          vista === "hoy"
            ? `${visits.length} visitas`
            : `${patients.length} de ${totalPatients} pacientes`
        }
        actions={
          <Link
            href="/sigeco/recepcion/nuevo"
            className={cn(buttonVariants({ size: "sm" }))}
          >
            <UserRoundPlus className="h-4 w-4" aria-hidden="true" />
            Registrar llegada
          </Link>
        }
      />

      {vista === "hoy" ? (
        <>
          <Card className="sm:hidden">
            <MobileAutoSubmitSelect
              name="status"
              defaultValue={params.status ?? ""}
              label="Filtrar visitas por estado"
              options={[
                { value: "", label: "Solo activas" },
                ...statusOptions.map(([value, label]) => ({ value, label })),
              ]}
            />
          </Card>
          <Card className="hidden sm:block lg:hidden">
            <form className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <select
                className={internalInputClassName}
                name="status"
                defaultValue={params.status ?? ""}
              >
                <option value="">Solo activas</option>
                {statusOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <Button type="submit" variant="outline">
                Filtrar
              </Button>
            </form>
          </Card>

          <Card className="min-w-0 p-0 xl:hidden">
            <CardHeader
              className="mb-0 p-[18px] pb-3"
              title="Visitas registradas hoy"
              description="Pacientes que llegaron a recepción y su ubicación actual dentro del flujo."
            />
            <RecordList>
              {visits.map((visit) => (
                <RecordItem
                  key={visit.id}
                  href={`/sigeco/recepcion/visitas/${visit.id}`}
                  title={visit.patient.fullName}
                  status={<VisitStatusPill status={visit.status} />}
                  action={
                    isActiveVisitStatus(visit.status) ? (
                      <VisitLeftForm
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
                  {visit.workItems.length > 0 ? (
                    <span>
                      <Chip tone="primary">
                        {visit.workItems.length} pendientes
                      </Chip>
                    </span>
                  ) : null}
                </RecordItem>
              ))}
              {visits.length === 0 ? (
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
                    <Th>Área actual</Th>
                    <Th>Tareas</Th>
                    <Th>Estado</Th>
                    <Th>
                      <span className="sr-only">Acción rápida</span>
                    </Th>
                  </tr>
                </thead>
                <tbody>
                  {visits.map((visit) => (
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
                        {isActiveVisitStatus(visit.status) ? (
                          <>
                            <div className="lg:hidden">
                              <VisitLeftForm
                                visitId={visit.id}
                                patientName={visit.patient.fullName}
                              />
                            </div>
                            <DesktopRowActions label={`Acciones de ${visit.patient.fullName}`}>
                              <VisitLeftForm
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
                  {visits.length === 0 ? (
                    <tr>
                      <Td className="py-8 text-center" colSpan={7}>
                        {emptyVisitsMessage}
                      </Td>
                    </tr>
                  ) : null}
                </tbody>
              </Table>
            </RecordTable>
          </Card>

          <div className="hidden min-w-0 items-start gap-4 xl:grid xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
            <section
              className="min-w-0 overflow-hidden rounded-[9px] border border-border bg-surface"
              aria-label="Visitas de recepción"
            >
              <div className="flex min-h-14 items-center justify-between gap-4 border-b border-border px-4 py-2">
                <div>
                  <h3 className="text-sm font-semibold text-text">Visitas registradas hoy</h3>
                  <p className="text-xs text-muted">Pacientes activos y área actual de atención.</p>
                </div>
                <span className="text-xs tabular-nums text-muted">{visits.length}</span>
              </div>
              <div className="max-h-[calc(100dvh-15rem)] overflow-y-auto">
                {visits.map((visit) => {
                  const selected = selectedVisit?.id === visit.id;

                  return (
                    <Link
                      key={visit.id}
                      href={receptionSelectionHref(params.status, visit.id)}
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
                          {visit.patient.internalCode} · {formatDateTime(visit.checkedInAt)}
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
                    </Link>
                  );
                })}
                {visits.length === 0 ? (
                  <div className="px-4 py-8 text-center">{emptyVisitsMessage}</div>
                ) : null}
              </div>
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
                        Llegada
                      </dt>
                      <dd className="mt-0.5 tabular-nums text-text">
                        {formatDateTime(selectedVisit.checkedInAt)}
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
            <PatientAutocomplete mode="navigate" initialValue={params.search} />
          </Card>
          <Card className="hidden sm:block lg:hidden">
            <form className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <input type="hidden" name="vista" value="pacientes" />
              <input
                className={internalInputClassName}
                type="search"
                name="search"
                placeholder="Buscar por nombre, teléfono, código o ciudad"
                defaultValue={params.search}
              />
              <Button type="submit" variant="outline">
                Buscar
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
                  {patient.city ? <span>{patient.city}</span> : null}
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
                    <Th className="lg:hidden xl:table-cell">Ciudad</Th>
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
                      <Td className="lg:hidden xl:table-cell">{patient.city || "—"}</Td>
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
              searchParams={{ vista: "pacientes", search: params.search }}
            />
          </Card>
        </>
      )}
    </div>
  );
}
