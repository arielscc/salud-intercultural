import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { OperationalQueueRefresh } from "@/components/internal/OperationalQueueRefresh";
import { Card, CardHeader } from "@/components/internal/ui/Card";
import { Chip } from "@/components/internal/ui/Chip";
import { DesktopTableToolbar } from "@/components/internal/ui/DesktopTableToolbar";
import { PageHeader } from "@/components/internal/ui/PageHeader";
import {
  RecordItem,
  RecordList,
  RecordListEmpty,
  RecordTable
} from "@/components/internal/ui/RecordList";
import { Table, Td, Th, Tr } from "@/components/internal/ui/Table";
import { clinicalOrderTypeLabels } from "@/features/clinical-care/labels";
import {
  nursingWorkItemStatusLabels,
  nursingWorkItemStatusTone
} from "@/features/nursing/labels";
import { formatDateTime } from "@/lib/dates";
import { getNursingWorkItems } from "@/modules/database/queries/nursing";
import { autoAbandonExpiredNursingVisits } from "@/modules/database/queries/visit-discontinuations";
import { requirePermission } from "@/modules/permissions";
import { getBranchContext } from "@/features/branches/context";

const emptyNursingMessage = (
  <>
    <span className="block font-semibold text-text">
      No hay indicaciones activas para enfermería.
    </span>
    <span className="mt-1 block text-sm text-muted">
      Las indicaciones llegan desde la consulta médica.
    </span>
  </>
);

export default async function NursingWorkQueuePage() {
  const user = await requirePermission("nursing_read", { module: "enfermeria" });
  const { activeBranch } = await getBranchContext(user);
  // Barrido perezoso: cierra por abandono a quienes superaron 1 h en espera
  // antes de leer la bandeja, para que no aparezcan como "a atender".
  await autoAbandonExpiredNursingVisits({ branchCode: activeBranch.code });
  const workItems = await getNursingWorkItems({
    pageSize: 40,
    branchCode: activeBranch.code
  });

  // Pacientes recién derivados a Enfermería que todavía nadie tomó (en espera).
  // Ya vienen ordenados por llegada (los más recientes primero).
  const waitingArrivals = workItems.filter((item) => item.status === "pending");

  return (
    <div className="grid gap-4">
      <PageHeader title="Enfermería" description="Bandeja operativa" />

      <OperationalQueueRefresh
        queueKey="nursing"
        serverUpdatedAt={new Date().toISOString()}
      />

      {waitingArrivals.length > 0 ? (
        <section
          className="payment-weave overflow-hidden rounded-[8px] border border-primary/25 bg-surface-soft shadow-lg"
          aria-label="Pacientes derivados a Enfermería en espera"
        >
          <div className="grid gap-3 p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[11px] font-semibold uppercase text-primary-dark">
                Derivados a Enfermería
              </p>
              <span className="rounded-full bg-surface-soft px-2 py-0.5 text-[11px] font-semibold text-primary-dark">
                {waitingArrivals.length} en espera
              </span>
            </div>
            <div className="grid gap-2">
              {waitingArrivals.map((item) => (
                <Link
                  key={item.id}
                  href={`/sigeco/enfermeria/${item.id}`}
                  className="focus-ring flex flex-wrap items-center justify-between gap-3 rounded-[9px] border border-primary/20 bg-surface px-3 py-2.5 hover:border-primary/40"
                >
                  <div className="min-w-0">
                    <p className="truncate font-sora text-sm font-bold text-text">
                      {item.visit.patient.fullName}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {item.title}
                      <span className="px-1.5" aria-hidden="true">·</span>
                      <span className="tabular-nums">{item.visit.patient.internalCode}</span>
                    </p>
                    <p className="mt-0.5 text-[11px] tabular-nums text-muted">
                      Recibido {formatDateTime(item.createdAt)}
                    </p>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-primary-dark">
                    Atender
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <DesktopTableToolbar count={`${workItems.length} indicaciones activas`} />

      <Card className="p-0">
        <CardHeader
          className="mb-0 p-[18px] pb-3"
          title="Indicaciones activas"
          description="Tareas clínicas derivadas a Enfermería y pendientes de ejecución."
        />
        <RecordList>
          {workItems.map((item) => {
            const order = item.clinicalOrders[0];
            const nurse = item.assignedTo?.name ?? item.assignedTo?.email ?? null;

            return (
              <RecordItem
                key={item.id}
                href={`/sigeco/enfermeria/${item.id}`}
                title={item.visit.patient.fullName}
                status={
                  <Chip tone={nursingWorkItemStatusTone[item.status]} dot>
                    {nursingWorkItemStatusLabels[item.status]}
                  </Chip>
                }
              >
                <span className="tabular-nums">{item.visit.patient.internalCode}</span>
                <span className="min-w-0 truncate font-medium text-text">{item.title}</span>
                {item.description ? (
                  <span className="min-w-0 truncate">{item.description}</span>
                ) : null}
                {order ? (
                  <span>
                    {clinicalOrderTypeLabels[order.type]} ·{" "}
                    {order.doctor?.name ?? order.doctor?.email ?? "Médico"}
                  </span>
                ) : null}
                {nurse ? (
                  <span className="font-medium text-primary-dark">Atiende: {nurse}</span>
                ) : (
                  <span className="text-muted">Sin asignar</span>
                )}
              </RecordItem>
            );
          })}
          {workItems.length === 0 ? (
            <RecordListEmpty>{emptyNursingMessage}</RecordListEmpty>
          ) : null}
        </RecordList>
        <RecordTable>
          <Table caption="Indicaciones activas de enfermería">
            <thead>
              <tr>
                <Th>Paciente</Th>
                <Th>Tarea</Th>
                <Th>Indicación</Th>
                <Th>Atiende</Th>
                <Th>Estado</Th>
              </tr>
            </thead>
            <tbody>
              {workItems.map((item) => {
                const order = item.clinicalOrders[0];
                const nurse = item.assignedTo?.name ?? item.assignedTo?.email ?? null;

                return (
                  <Tr key={item.id}>
                    <Td className="font-semibold text-text">
                      <Link
                        href={`/sigeco/enfermeria/${item.id}`}
                        className="focus-ring rounded-[7px] hover:text-primary-dark hover:underline"
                      >
                        {item.visit.patient.fullName}
                      </Link>
                      <span className="block text-[11px] font-normal tabular-nums text-muted">
                        {item.visit.patient.internalCode}
                      </span>
                    </Td>
                    <Td className="max-w-[320px]">
                      <span className="block truncate font-medium text-text">{item.title}</span>
                      {item.description ? (
                        <span className="block truncate text-[11px] text-muted">{item.description}</span>
                      ) : null}
                    </Td>
                    <Td>
                      {order
                        ? `${clinicalOrderTypeLabels[order.type]} · ${order.doctor?.name ?? order.doctor?.email ?? "Médico"}`
                        : "—"}
                    </Td>
                    <Td>
                      {nurse ? (
                        <span className="font-medium text-primary-dark">{nurse}</span>
                      ) : (
                        <span className="text-muted">Sin asignar</span>
                      )}
                    </Td>
                    <Td>
                      <Chip tone={nursingWorkItemStatusTone[item.status]} dot>
                        {nursingWorkItemStatusLabels[item.status]}
                      </Chip>
                    </Td>
                  </Tr>
                );
              })}
              {workItems.length === 0 ? (
                <tr>
                  <Td className="py-8 text-center" colSpan={5}>
                    {emptyNursingMessage}
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
