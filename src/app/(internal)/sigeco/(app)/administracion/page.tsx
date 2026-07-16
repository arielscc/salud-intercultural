import Link from "next/link";
import { Banknote, CalendarDays, Clock } from "lucide-react";
import { Card, CardHeader } from "@/components/internal/ui/Card";
import { Chip } from "@/components/internal/ui/Chip";
import { DesktopTableToolbar } from "@/components/internal/ui/DesktopTableToolbar";
import { KpiCard } from "@/components/internal/ui/KpiCard";
import { PageHeader } from "@/components/internal/ui/PageHeader";
import { PriorityCollectionDialog } from "@/components/internal/PriorityCollectionDialog";
import {
  RecordItem,
  RecordList,
  RecordListEmpty,
  RecordTable
} from "@/components/internal/ui/RecordList";
import { Table, Td, Th, Tr } from "@/components/internal/ui/Table";
import { clinicalOrderTypeLabels } from "@/features/clinical-care/labels";
import { routeAreaLabels } from "@/features/patients/labels";
import { formatMoney, saleStatusLabels } from "@/features/sales/labels";
import {
  getAdministrationWorkItems,
  getSalesSummary
} from "@/modules/database/queries/sales";
import { requirePermission } from "@/modules/permissions";

const emptyAdministrationMessage = (
  <>
    <span className="block font-semibold text-text">No hay cobros ni entregas pendientes.</span>
    <span className="mt-1 block text-sm text-muted">
      Los pendientes llegan derivados desde consulta o enfermería.
    </span>
  </>
);

export default async function AdministrationPage() {
  const user = await requirePermission("sales_read");
  const [workItems, summary] = await Promise.all([
    getAdministrationWorkItems({ pageSize: 40 }),
    getSalesSummary()
  ]);

  const pendingBalance = summary.pendingSales._sum.balanceCents ?? 0;
  const isPersonalAdministrationAccount = user.role === "administracion";
  const priorityCollection = isPersonalAdministrationAccount
    ? workItems.find((item) => {
        const sale = item.sales[0];
        return !sale || sale.balanceCents > 0;
      })
    : undefined;

  return (
    <div className="grid gap-4">
      <PageHeader title="Ventas y cobros" description="Administración" />

      {priorityCollection ? (
        <PriorityCollectionDialog
          workItemId={priorityCollection.id}
          patientName={priorityCollection.visit.patient.fullName}
          patientCode={priorityCollection.visit.patient.internalCode}
          orderTitle={priorityCollection.title}
          orderDescription={priorityCollection.description}
          requestedBy={
            priorityCollection.clinicalOrders[0]?.doctor?.name ??
            priorityCollection.clinicalOrders[0]?.doctor?.email
          }
          amount={priorityCollection.sales[0] ? formatMoney(priorityCollection.sales[0].totalCents) : undefined}
          balance={priorityCollection.sales[0] ? formatMoney(priorityCollection.sales[0].balanceCents) : undefined}
        />
      ) : null}

      <section className={`grid gap-3 ${isPersonalAdministrationAccount ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
        <KpiCard
          icon={Banknote}
          label="Cobrado hoy"
          value={formatMoney(summary.todaySales._sum.paidCents ?? 0)}
        />
        {!isPersonalAdministrationAccount ? (
          <KpiCard
            icon={CalendarDays}
            label="Ventas del mes"
            value={formatMoney(summary.monthSales._sum.totalCents ?? 0)}
          />
        ) : null}
        <KpiCard
          icon={Clock}
          label="Saldo pendiente"
          value={formatMoney(pendingBalance)}
          flag={pendingBalance > 0 ? { tone: "warn", label: "Por cobrar" } : undefined}
        />
      </section>

      <DesktopTableToolbar count={`${workItems.length} pendientes derivados`} />

      <Card className="p-0">
        <CardHeader className="mb-0 p-[18px] pb-3" title="Pendientes derivados" />
        <RecordList>
          {workItems.map((item) => {
            const order = item.clinicalOrders[0];
            const sale = item.sales[0];

            return (
              <RecordItem
                key={item.id}
                href={`/sigeco/administracion/${item.id}`}
                title={item.visit.patient.fullName}
                status={
                  <Chip tone={sale ? (sale.balanceCents > 0 ? "warning" : "success") : "neutral"} dot>
                    {sale ? saleStatusLabels[sale.status] : routeAreaLabels[item.area]}
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
                {sale ? (
                  <span className="tabular-nums">
                    {formatMoney(sale.totalCents)} · Saldo {formatMoney(sale.balanceCents)}
                  </span>
                ) : null}
              </RecordItem>
            );
          })}
          {workItems.length === 0 ? (
            <RecordListEmpty>{emptyAdministrationMessage}</RecordListEmpty>
          ) : null}
        </RecordList>
        <RecordTable>
          <Table caption="Cobros y entregas pendientes">
            <thead>
              <tr>
                <Th>Paciente</Th>
                <Th>Tarea</Th>
                <Th className="lg:hidden xl:table-cell">Indicación</Th>
                <Th>Venta</Th>
                <Th>Estado</Th>
              </tr>
            </thead>
            <tbody>
              {workItems.map((item) => {
                const order = item.clinicalOrders[0];
                const sale = item.sales[0];

                return (
                  <Tr key={item.id}>
                    <Td className="font-semibold text-text">
                      <Link
                        href={`/sigeco/administracion/${item.id}`}
                        className="focus-ring rounded-[7px] hover:text-primary-dark hover:underline"
                      >
                        {item.visit.patient.fullName}
                      </Link>
                      <span className="block text-[11px] font-normal tabular-nums text-muted">
                        {item.visit.patient.internalCode}
                      </span>
                    </Td>
                    <Td className="max-w-[280px]">
                      <span className="block truncate font-medium text-text">{item.title}</span>
                      {item.description ? (
                        <span className="block truncate text-[11px] text-muted">{item.description}</span>
                      ) : null}
                    </Td>
                    <Td className="lg:hidden xl:table-cell">
                      {order
                        ? `${clinicalOrderTypeLabels[order.type]} · ${order.doctor?.name ?? order.doctor?.email ?? "Médico"}`
                        : "—"}
                    </Td>
                    <Td className="tabular-nums">
                      {sale
                        ? `${formatMoney(sale.totalCents)} · Saldo ${formatMoney(sale.balanceCents)}`
                        : "—"}
                    </Td>
                    <Td>
                      <Chip tone={sale ? (sale.balanceCents > 0 ? "warning" : "success") : "neutral"} dot>
                        {sale ? saleStatusLabels[sale.status] : routeAreaLabels[item.area]}
                      </Chip>
                    </Td>
                  </Tr>
                );
              })}
              {workItems.length === 0 ? (
                <tr>
                  <Td className="py-8 text-center" colSpan={5}>
                    {emptyAdministrationMessage}
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
