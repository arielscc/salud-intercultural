import Link from "next/link";
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
import { nursingWorkItemStatusLabels } from "@/features/nursing/labels";
import { getNursingWorkItems } from "@/modules/database/queries/nursing";
import { requirePermission } from "@/modules/permissions";

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
  await requirePermission("nursing_read");
  const workItems = await getNursingWorkItems({ pageSize: 40 });

  return (
    <div className="grid gap-4">
      <PageHeader title="Enfermería" description="Bandeja operativa" />

      <OperationalQueueRefresh
        queueKey="nursing"
        serverUpdatedAt={new Date().toISOString()}
      />

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

            return (
              <RecordItem
                key={item.id}
                href={`/sigeco/enfermeria/${item.id}`}
                title={item.visit.patient.fullName}
                status={<Chip>{nursingWorkItemStatusLabels[item.status]}</Chip>}
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
                <Th>Estado</Th>
              </tr>
            </thead>
            <tbody>
              {workItems.map((item) => {
                const order = item.clinicalOrders[0];

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
                      <Chip>{nursingWorkItemStatusLabels[item.status]}</Chip>
                    </Td>
                  </Tr>
                );
              })}
              {workItems.length === 0 ? (
                <tr>
                  <Td className="py-8 text-center" colSpan={4}>
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
