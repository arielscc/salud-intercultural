import Link from "next/link";
import { Card } from "@/components/internal/ui/Card";
import { PageHeader } from "@/components/internal/ui/PageHeader";
import { Table, Td, Th, Tr } from "@/components/internal/ui/Table";
import { clinicalOrderTypeLabels } from "@/features/clinical-care/labels";
import { nursingWorkItemStatusLabels } from "@/features/nursing/labels";
import { getNursingWorkItems } from "@/modules/database/queries/nursing";
import { requirePermission } from "@/modules/permissions";

export default async function NursingWorkQueuePage() {
  await requirePermission("nursing_read");
  const workItems = await getNursingWorkItems({ pageSize: 40 });

  return (
    <div className="grid gap-4">
      <PageHeader title="Enfermería" description="Bandeja operativa" />

      <Card className="p-0">
        <Table>
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
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-0.5 text-[11px] font-semibold text-muted">
                      {nursingWorkItemStatusLabels[item.status]}
                    </span>
                  </Td>
                </Tr>
              );
            })}
            {workItems.length === 0 ? (
              <tr>
                <Td className="py-8 text-center" colSpan={4}>
                  <span className="block font-semibold text-text">
                    No hay indicaciones activas para enfermería.
                  </span>
                  <span className="mt-1 block text-sm text-muted">
                    Las indicaciones llegan desde la consulta médica.
                  </span>
                </Td>
              </tr>
            ) : null}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
