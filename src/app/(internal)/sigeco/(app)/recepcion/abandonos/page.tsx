import Link from "next/link";
import { CircleOff, ClipboardList, PhoneCall } from "lucide-react";
import type { VisitDiscontinuationReason } from "@/generated/prisma/client";
import { MobileBackLink } from "@/components/internal/MobileBackLink";
import { DateRangePickerField } from "@/components/internal/ui/DatePickerField";
import { Button } from "@/components/internal/ui/Button";
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
import {
  visitDiscontinuationReasonLabels,
  visitDiscontinuationReasonOptions,
  visitPendingTypeLabels
} from "@/features/visit-discontinuations/labels";
import { routeAreaLabels, visitStatusLabels } from "@/features/patients/labels";
import { dateOnlyRange, formatDateTime } from "@/lib/dates";
import { getVisitDiscontinuationReport } from "@/modules/database/queries/visit-discontinuations";
import { requirePermission } from "@/modules/permissions";

type VisitDiscontinuationReportPageProps = {
  searchParams: Promise<{
    motivo?: string;
    desde?: string;
    hasta?: string;
  }>;
};

export default async function VisitDiscontinuationReportPage({
  searchParams
}: VisitDiscontinuationReportPageProps) {
  await requirePermission("visit_discontinuations_read");
  const params = await searchParams;
  const reason = visitDiscontinuationReasonOptions.some(
    ([value]) => value === params.motivo
  )
    ? (params.motivo as VisitDiscontinuationReason)
    : undefined;
  const range = dateOnlyRange(params.desde, params.hasta);
  const report = await getVisitDiscontinuationReport({
    reason,
    occurredFrom: range.start,
    occurredTo: range.end
  });

  return (
    <div className="grid gap-4">
      <MobileBackLink href="/sigeco/recepcion" label="Volver a Recepción" />
      <PageHeader
        title="Abandonos y pendientes"
        description="Muestra dónde se detuvo cada visita y qué trabajo debe recuperarse."
      />

      <form className="grid gap-2 rounded-[9px] border border-border bg-surface p-3 sm:grid-cols-[minmax(12rem,0.7fr)_minmax(18rem,1fr)_auto] sm:items-end">
        <label className="grid gap-1 text-sm font-semibold text-text">
          Motivo
          <select
            className="focus-ring min-h-11 rounded-[9px] border border-border bg-surface px-3 text-sm font-normal"
            name="motivo"
            defaultValue={reason ?? ""}
          >
            <option value="">Todos los motivos</option>
            {visitDiscontinuationReasonOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-semibold text-text">
          Fecha del abandono
          <DateRangePickerField
            fromName="desde"
            toName="hasta"
            defaultFrom={params.desde}
            defaultTo={params.hasta}
          />
        </label>
        <Button type="submit" variant="outline">
          Aplicar filtros
        </Button>
      </form>

      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <KpiCard
          label="Visitas detenidas"
          value={report.total}
          icon={CircleOff}
          compactMobile
        />
        <KpiCard
          label="Pendientes guardados"
          value={report.pendingCount}
          icon={ClipboardList}
          compactMobile
        />
        <KpiCard
          label="Con seguimiento"
          value={report.withFollowUp}
          icon={PhoneCall}
          compactMobile
        />
      </div>

      <Card>
        <CardHeader
          title="Motivos registrados"
          description="Ayuda a distinguir problemas de espera, costo, insumos y otras causas."
        />
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {report.byReason.map((item) => (
            <div
              key={item.reason}
              className="rounded-[9px] border border-border bg-surface-soft px-3 py-2.5"
            >
              <p className="text-xs font-semibold uppercase text-muted">
                {visitDiscontinuationReasonLabels[item.reason]}
              </p>
              <p className="mt-1 font-sora text-2xl font-bold text-text">
                {item.count}
              </p>
            </div>
          ))}
          {report.byReason.length === 0 ? (
            <p className="text-sm text-muted">
              No hay motivos registrados con estos filtros.
            </p>
          ) : null}
        </div>
      </Card>

      <Card className="p-0">
        <CardHeader
          title="Visitas que no continuaron"
          description="Los pendientes permanecen visibles aunque la visita esté cerrada."
          className="mb-0 p-[18px]"
        />
        <RecordList>
          {report.events.length === 0 ? (
            <RecordListEmpty>
              No hay abandonos registrados con estos filtros.
            </RecordListEmpty>
          ) : (
            report.events.map((event) => (
              <RecordItem
                key={event.id}
                href={`/sigeco/recepcion/visitas/${event.visitId}`}
                title={event.visit.patient.fullName}
                status={
                  <Chip>
                    {visitDiscontinuationReasonLabels[event.reason]}
                  </Chip>
                }
              >
                <span>
                  {routeAreaLabels[event.area]} ·{" "}
                  {visitStatusLabels[event.fromStatus]}
                </span>
                <span>{formatDateTime(event.occurredAt)}</span>
                <span>
                  {event.pendingTypes.length > 0
                    ? event.pendingTypes
                        .map((type) => visitPendingTypeLabels[type])
                        .join(" · ")
                    : "Sin pendientes registrados"}
                </span>
              </RecordItem>
            ))
          )}
        </RecordList>

        <RecordTable>
          <Table caption="Abandonos y pendientes por visita">
            <thead>
              <Tr>
                <Th>Paciente</Th>
                <Th>Punto</Th>
                <Th>Motivo</Th>
                <Th>Pendientes</Th>
                <Th>Registrado</Th>
                <Th>Seguimiento</Th>
              </Tr>
            </thead>
            <tbody>
              {report.events.map((event) => (
                <Tr key={event.id}>
                  <Td>
                    <Link
                      href={`/sigeco/recepcion/visitas/${event.visitId}`}
                      className="focus-ring rounded-[7px] font-semibold text-text hover:text-primary-dark hover:underline"
                    >
                      {event.visit.patient.fullName}
                    </Link>
                    <p className="text-xs text-muted">
                      {event.visit.patient.internalCode}
                    </p>
                  </Td>
                  <Td>
                    <p className="font-semibold text-text">
                      {routeAreaLabels[event.area]}
                    </p>
                    <p className="text-xs text-muted">
                      {visitStatusLabels[event.fromStatus]}
                    </p>
                  </Td>
                  <Td>{visitDiscontinuationReasonLabels[event.reason]}</Td>
                  <Td>
                    <div className="flex max-w-xs flex-wrap gap-1.5">
                      {event.pendingTypes.length > 0
                        ? event.pendingTypes.map((type) => (
                            <Chip key={type}>
                              {visitPendingTypeLabels[type]}
                            </Chip>
                          ))
                        : "—"}
                    </div>
                  </Td>
                  <Td>
                    <p>{formatDateTime(event.occurredAt)}</p>
                    <p className="text-xs text-muted">
                      {event.recordedBy?.name ??
                        event.recordedBy?.email ??
                        "Usuario no disponible"}
                    </p>
                  </Td>
                  <Td>
                    {event.followUpTask ? (
                      <Link
                        href={`/sigeco/seguimientos/${event.followUpTask.id}`}
                        className="focus-ring rounded-[7px] font-semibold text-primary-dark hover:underline"
                      >
                        {event.followUpTask.assignedTo?.name ??
                          event.followUpTask.assignedTo?.email ??
                          "Sin responsable"}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </RecordTable>
      </Card>
    </div>
  );
}
