import { PriorityCollectionDialog } from "@/components/internal/PriorityCollectionDialog";
import { OperationalQueueRefresh } from "@/components/internal/OperationalQueueRefresh";
import { buttonVariants } from "@/components/internal/ui/Button";
import { Card, CardHeader } from "@/components/internal/ui/Card";
import { Chip } from "@/components/internal/ui/Chip";
import { DesktopTableToolbar } from "@/components/internal/ui/DesktopTableToolbar";
import { KpiCard } from "@/components/internal/ui/KpiCard";
import { PageHeader } from "@/components/internal/ui/PageHeader";
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
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/dates";
import {
  getAdministrationWorkItems,
  getLatestPendingAdministrationWorkItem,
  getSalesSummary
} from "@/modules/database/queries/sales";
import { requirePermission } from "@/modules/permissions";
import { ArrowRight, Banknote, CalendarDays, Clock } from "lucide-react";
import Link from "next/link";
import { getBranchContext } from "@/features/branches/context";

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
  const { activeBranch } = await getBranchContext(user);
  const isPersonalAdministrationAccount = user.role === "administracion";
  const [workItems, summary, priorityCollection] = await Promise.all([
    getAdministrationWorkItems({ pageSize: 40, branchCode: activeBranch.code }),
    getSalesSummary(new Date(), activeBranch.code),
    getLatestPendingAdministrationWorkItem(activeBranch.code)
  ]);

  const pendingBalance = summary.pendingSales._sum.balanceCents ?? 0;

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Ventas y cobros"
        description="Administración"
        actions={
          <Link
            href="/sigeco/administracion/caja"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Control de Caja
          </Link>
        }
      />

      <OperationalQueueRefresh
        queueKey="administration"
        serverUpdatedAt={new Date().toISOString()}
      />

      {priorityCollection ? (
        <section
          className="payment-weave overflow-hidden rounded-[8px] border border-primary/25 bg-surface-soft shadow-lg"
          aria-label="Orden de cobro prioritaria"
        >
          <div className="relative grid w-full gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_minmax(19rem,auto)] sm:items-center sm:p-5">
            <div className="relative min-w-0 pr-14">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[11px] font-semibold uppercase text-primary-dark">
                    Solicitud de cobro
                  </p>
                  <span className="rounded-full bg-surface-soft px-2 py-0.5 text-[11px] font-semibold text-primary-dark">
                    Requiere atención
                  </span>
                </div>
                <p className="mt-1 truncate font-sora text-lg font-bold text-text">
                  {priorityCollection.visit.patient.fullName}
                </p>
                <p className="truncate text-sm text-muted">
                  {priorityCollection.title}
                  <span className="px-1.5" aria-hidden="true">·</span>
                  {priorityCollection.visit.patient.internalCode}
                </p>
                <p className="mt-1 text-xs tabular-nums text-muted">
                  Recibida {formatDateTime(priorityCollection.createdAt)}
                </p>
              </div>

            <div className="flex flex-wrap justify-between w-full items-center gap-3 border-t border-border pt-3 sm:flex-nowrap sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
                <div className="sm:text-right">
                  <p className="text-[11px] font-semibold uppercase text-muted">Saldo pendiente</p>
                  <p className="mt-0.5 font-sora text-2xl font-bold tabular-nums text-primary-dark">
                    {priorityCollection.sales[0]
                      ? formatMoney(priorityCollection.sales[0].balanceCents)
                      : "Por registrar"}
                  </p>
                  <p className="mt-0.5 font-mono text-[11px] tabular-nums text-muted">
                    Orden #{priorityCollection.id.slice(-8).toUpperCase()}
                  </p>
                </div>
                <Link
                  href={`/sigeco/administracion/${priorityCollection.id}`}
                  className={cn(buttonVariants({ size: "sm" }), "ml-auto shrink-0")}
                >
                  Atender cobro
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
            </div>
          </div>
        </section>
      ) : null}

      {priorityCollection && isPersonalAdministrationAccount ? (
        <PriorityCollectionDialog
          workItemId={priorityCollection.id}
          patientName={priorityCollection.visit.patient.fullName}
          patientCode={priorityCollection.visit.patient.internalCode}
          orderTitle={priorityCollection.title}
          orderDescription={priorityCollection.description}
          requestedBy={
            priorityCollection.clinicalOrders[0]?.doctor?.name ??
            priorityCollection.clinicalOrders[0]?.doctor?.email ??
            priorityCollection.createdBy?.name ??
            priorityCollection.createdBy?.email
          }
          requestedAt={formatDateTime(priorityCollection.createdAt)}
          amount={priorityCollection.sales[0] ? formatMoney(priorityCollection.sales[0].totalCents) : undefined}
          balance={priorityCollection.sales[0] ? formatMoney(priorityCollection.sales[0].balanceCents) : undefined}
        />
      ) : null}

      <section
        className={`grid gap-2 sm:gap-3 ${isPersonalAdministrationAccount ? "grid-cols-2" : "grid-cols-3"}`}
      >
        <KpiCard
          icon={Banknote}
          label="Cobrado hoy"
          value={formatMoney(summary.todaySales._sum.paidCents ?? 0)}
          compactMobile
        />
        {!isPersonalAdministrationAccount ? (
          <KpiCard
            icon={CalendarDays}
            label="Ventas del mes"
            value={formatMoney(summary.monthSales._sum.totalCents ?? 0)}
            compactMobile
          />
        ) : null}
        <KpiCard
          icon={Clock}
          label="Saldo pendiente"
          value={formatMoney(pendingBalance)}
          flag={pendingBalance > 0 ? { tone: "warn", label: "Por cobrar" } : undefined}
          compactMobile
        />
      </section>

      <DesktopTableToolbar count={`${workItems.length} pendientes derivados`} />

      <Card className="p-0">
        <CardHeader
          className="mb-0 p-[18px] pb-3"
          title="Cobros y entregas pendientes"
          description="Órdenes derivadas a Administración que todavía requieren una acción."
        />
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
                {item.visit.doctorOrder?.status === "submitted" && !sale ? (
                  <Chip tone="primary">Pedido del médico por confirmar</Chip>
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
                      {item.visit.doctorOrder?.status === "submitted" && !sale ? (
                        <span className="mt-0.5 block text-[11px] font-semibold text-primary-dark">
                          Pedido del médico por confirmar
                        </span>
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
