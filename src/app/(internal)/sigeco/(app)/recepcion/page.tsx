import Link from "next/link";
import { UserRoundPlus } from "lucide-react";
import type { VisitStatus } from "@/generated/prisma/client";
import { VisitStatusPill } from "@/components/internal/StatusPill";
import { internalInputClassName } from "@/components/internal/Field";
import { Button, buttonVariants } from "@/components/internal/ui/Button";
import { Card } from "@/components/internal/ui/Card";
import { Chip } from "@/components/internal/ui/Chip";
import { PageHeader } from "@/components/internal/ui/PageHeader";
import {
  RecordItem,
  RecordList,
  RecordListEmpty,
  RecordTable
} from "@/components/internal/ui/RecordList";
import { Table, Td, Th, Tr } from "@/components/internal/ui/Table";
import { routeAreaLabels, visitStatusLabels } from "@/features/patients/labels";
import { applyVisitFlowAction } from "@/features/visits/actions";
import { isActiveVisitStatus } from "@/features/visits/schemas/visit.schema";
import { formatDateTime } from "@/lib/dates";
import { getPatients } from "@/modules/database/queries/patients";
import { getVisits } from "@/modules/database/queries/visits";
import { requirePermission } from "@/modules/permissions";
import { cn } from "@/lib/cn";

const statusOptions = Object.entries(visitStatusLabels) as Array<[VisitStatus, string]>;

type ReceptionPageProps = {
  searchParams: Promise<{
    vista?: string;
    status?: VisitStatus;
    search?: string;
  }>;
};

const emptyVisitsMessage = (
  <>
    <span className="block font-semibold text-text">No hay visitas con ese filtro.</span>
    <span className="mt-1 block text-sm text-muted">
      Registra la llegada de un paciente para abrir su visita.
    </span>
  </>
);

const emptyPatientsMessage = (
  <>
    <span className="block font-semibold text-text">No hay pacientes con esa búsqueda.</span>
    <span className="mt-1 block text-sm text-muted">Regístralo desde “Registrar llegada”.</span>
  </>
);

function VisitLeftForm({ visitId, buttonClassName }: { visitId: string; buttonClassName?: string }) {
  return (
    <form action={applyVisitFlowAction}>
      <input type="hidden" name="visitId" value={visitId} />
      <input type="hidden" name="flow" value="left" />
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        className={cn("text-error hover:bg-error/10 hover:text-error", buttonClassName)}
      >
        Se retiró
      </Button>
    </form>
  );
}

function ViewTab({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "focus-ring inline-flex min-h-9 items-center rounded-[9px] border px-3.5 text-[13px] font-semibold transition",
        active
          ? "border-primary/30 bg-surface-soft text-primary-dark"
          : "border-border bg-surface text-muted hover:border-primary/40 hover:text-text"
      )}
    >
      {children}
    </Link>
  );
}

export default async function ReceptionPage({ searchParams }: ReceptionPageProps) {
  const params = await searchParams;
  const vista = params.vista === "pacientes" ? "pacientes" : "hoy";

  if (vista === "pacientes") {
    await requirePermission("patients_read");
  } else {
    await requirePermission("visits_read");
  }

  const visits =
    vista === "hoy"
      ? await getVisits({ status: params.status, activeOnly: !params.status, pageSize: 30 })
      : [];
  const patients =
    vista === "pacientes" ? await getPatients({ search: params.search, pageSize: 30 }) : [];

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Recepción"
        description="Llegadas del día y padrón de pacientes"
        actions={
          <Link href="/sigeco/recepcion/nuevo" className={cn(buttonVariants({ size: "sm" }))}>
            <UserRoundPlus className="h-4 w-4" aria-hidden="true" />
            Registrar llegada
          </Link>
        }
      />

      <div className="flex flex-wrap gap-2">
        <ViewTab href="/sigeco/recepcion" active={vista === "hoy"}>
          Hoy
        </ViewTab>
        <ViewTab href="/sigeco/recepcion?vista=pacientes" active={vista === "pacientes"}>
          Pacientes
        </ViewTab>
      </div>

      {vista === "hoy" ? (
        <>
          <Card>
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

          <Card className="min-w-0 p-0">
            <RecordList>
              {visits.map((visit) => (
                <RecordItem
                  key={visit.id}
                  href={`/sigeco/recepcion/visitas/${visit.id}`}
                  title={visit.patient.fullName}
                  status={<VisitStatusPill status={visit.status} />}
                  action={
                    isActiveVisitStatus(visit.status) ? (
                      <VisitLeftForm visitId={visit.id} buttonClassName="min-h-10" />
                    ) : undefined
                  }
                >
                  <span className="tabular-nums">
                    {formatDateTime(visit.checkedInAt)} ·{" "}
                    {visit.route ? routeAreaLabels[visit.route.currentArea] : "Sin ruta"}
                  </span>
                  <span className="tabular-nums">{visit.patient.phone}</span>
                  {visit.workItems.length > 0 ? (
                    <span>
                      <Chip tone="primary">{visit.workItems.length} pendientes</Chip>
                    </span>
                  ) : null}
                </RecordItem>
              ))}
              {visits.length === 0 ? <RecordListEmpty>{emptyVisitsMessage}</RecordListEmpty> : null}
            </RecordList>
            <RecordTable>
              <Table>
                <thead>
                  <tr>
                    <Th>Paciente</Th>
                    <Th>Teléfono</Th>
                    <Th>Llegada</Th>
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
                      <Td className="tabular-nums">{visit.patient.phone}</Td>
                      <Td className="tabular-nums">{formatDateTime(visit.checkedInAt)}</Td>
                      <Td>{visit.route ? routeAreaLabels[visit.route.currentArea] : "Sin ruta"}</Td>
                      <Td className="tabular-nums">
                        {visit.workItems.length > 0 ? (
                          <Chip tone="primary">{visit.workItems.length} pendientes</Chip>
                        ) : (
                          "—"
                        )}
                      </Td>
                      <Td>
                        <VisitStatusPill status={visit.status} />
                      </Td>
                      <Td>
                        {isActiveVisitStatus(visit.status) ? (
                          <VisitLeftForm visitId={visit.id} />
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
        </>
      ) : (
        <>
          <Card>
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
              <Table>
                <thead>
                  <tr>
                    <Th>Nombre</Th>
                    <Th>Código</Th>
                    <Th>Teléfono</Th>
                    <Th>Ciudad</Th>
                    <Th>Visitas</Th>
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
                      <Td>{patient.city || "—"}</Td>
                      <Td className="tabular-nums">{patient._count.visits}</Td>
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
          </Card>
        </>
      )}
    </div>
  );
}
