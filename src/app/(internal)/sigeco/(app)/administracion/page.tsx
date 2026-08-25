import { PriorityCollectionDialog } from "@/components/internal/PriorityCollectionDialog";
import { OperationalQueueRefresh } from "@/components/internal/OperationalQueueRefresh";
import { buttonVariants } from "@/components/internal/ui/Button";
import { Card, CardHeader } from "@/components/internal/ui/Card";
import { Chip } from "@/components/internal/ui/Chip";
import { DesktopTableToolbar } from "@/components/internal/ui/DesktopTableToolbar";
import { KpiCard } from "@/components/internal/ui/KpiCard";
import { PageHeader } from "@/components/internal/ui/PageHeader";
import { CashExpenseDialogs } from "@/features/cash/components/CashExpenseDialogs";
import {
  createOtherCashExpenseAction,
  createStaffCashExpenseAction,
  createUrgentPurchaseExpenseAction
} from "@/features/cash/actions";
import {
  RecordItem,
  RecordList,
  RecordListEmpty,
  RecordTable
} from "@/components/internal/ui/RecordList";
import { Table, Td, Th, Tr } from "@/components/internal/ui/Table";
import type { PatientRouteArea, VisitStatus } from "@/generated/prisma/client";
import { clinicalOrderTypeLabels } from "@/features/clinical-care/labels";
import { routeAreaLabels } from "@/features/patients/labels";
import { roleHasPermission } from "@/features/internal-auth/permissions";
import { formatMoney, saleStatusLabels } from "@/features/sales/labels";
import { visitStatusLabels, workItemStatusLabels } from "@/features/patients/labels";
import { attendAdministrationWorkItemAction } from "@/features/sales/actions";
import { cn } from "@/lib/cn";
import { formatDateTime, formatTime } from "@/lib/dates";
import {
  getAdministrationWorkItems,
  getLatestPendingAdministrationWorkItem,
  getSalesSummary,
  getTodayCollections,
  type TodayCollection
} from "@/modules/database/queries/sales";
import {
  getCashAuthorizers,
  getCashDashboard,
  getCashPersonnel
} from "@/modules/database/queries/cash";
import { OpenCashSessionCallout } from "@/features/cash/components/OpenCashSessionCallout";
import { requirePermission } from "@/modules/permissions";
import { getModuleAccessState } from "@/modules/database/queries/modules";
import { canUse } from "@/features/modules/access";
import { ArrowRight, Banknote, CalendarDays, Clock } from "lucide-react";
import Link from "next/link";
import { getBranchContext } from "@/features/branches/context";

const emptyCollectionsMessage = (
  <>
    <span className="block font-semibold text-text">Todavía no hay cobros hoy.</span>
    <span className="mt-1 block text-sm text-muted">
      Cada pago registrado aparece aquí con el monto, el área donde está el
      paciente y el estado de su venta.
    </span>
  </>
);

/** Resume los conceptos de la venta sin desbordar la fila. */
function collectionConcept(concept: string[]) {
  if (concept.length === 0) return "Venta sin detalle";
  const visible = concept.slice(0, 2).join(", ");
  return concept.length > 2 ? `${visible} +${concept.length - 2}` : visible;
}

/** Donde esta el paciente ahora y en que estado quedo su visita. */
function workItemLocation(workItem: {
  visit: { status: VisitStatus; route: { currentArea: PatientRouteArea } | null };
}) {
  const area = workItem.visit.route
    ? routeAreaLabels[workItem.visit.route.currentArea]
    : null;
  const status = visitStatusLabels[workItem.visit.status];
  return area ? `${area} · ${status}` : status;
}

function collectionLocation(entry: TodayCollection) {
  const area = entry.currentArea ? routeAreaLabels[entry.currentArea] : null;
  const status = entry.visitStatus
    ? visitStatusLabels[entry.visitStatus]
    : "Venta sin visita";
  return area ? `${area} · ${status}` : status;
}

const emptyAdministrationMessage = (
  <>
    <span className="block font-semibold text-text">No hay cobros ni entregas pendientes.</span>
    <span className="mt-1 block text-sm text-muted">
      Los pendientes llegan derivados desde consulta o enfermería.
    </span>
  </>
);

function doctorOrderPendingCents(workItem: {
  visit: {
    doctorOrder?: {
      chargeBaseCents: number | null;
      orderDiscountCents: number;
      lines: Array<{ unitPriceCents: number; quantity: number }>;
    } | null;
  };
}) {
  const order = workItem.visit.doctorOrder;
  if (!order) return null;
  const lineSum = order.lines.reduce(
    (sum, line) => sum + line.unitPriceCents * line.quantity,
    0
  );
  const base = order.chargeBaseCents ?? lineSum;
  const discount = Math.min(Math.max(0, order.orderDiscountCents), base);
  return Math.max(0, base - discount);
}

export default async function AdministrationPage({
  searchParams
}: {
  searchParams: Promise<{ aviso?: string }>;
}) {
  const query = await searchParams;
  const user = await requirePermission("sales_read");
  const moduleAccess = await getModuleAccessState();
  // El padrón de Administración es propio: no depende de que Recepción esté
  // lanzada, porque en la Etapa 1 el cliente se registra desde acá.
  const canReadClients = canUse(user.role, moduleAccess, "patients_read", "administracion");
  // La venta de mostrador no espera la derivación del médico: Administración
  // la inicia por su cuenta.
  const canCreateSale = canUse(user.role, moduleAccess, "sales_write");
  const { activeBranch } = await getBranchContext(user);
  const isPersonalAdministrationAccount = user.role === "administracion";
  const isSuperAdmin = user.role === "super_admin";
  const [
    workItems,
    summary,
    priorityCollection,
    todayCollections,
    cashDashboard,
    cashPersonnel,
    cashAuthorizers
  ] = await Promise.all([
    getAdministrationWorkItems({ pageSize: 40, branchCode: activeBranch.code }),
    getSalesSummary(new Date(), activeBranch.code),
    getLatestPendingAdministrationWorkItem(activeBranch.code),
    getTodayCollections(activeBranch.code),
    getCashDashboard({ branchCode: activeBranch.code }),
    getCashPersonnel(activeBranch.code),
    getCashAuthorizers()
  ]);

  const pendingBalance = summary.pendingSales._sum.balanceCents ?? 0;
  const hasStaleOpenCashSession = Boolean(cashDashboard.staleOpenSession);
  const hasUsableCashSession =
    cashDashboard.activeSessionStatus === "open" && !hasStaleOpenCashSession;
  const activeCashCollectedCents = cashDashboard.breakdown
    ? cashDashboard.breakdown.cashIncomeCents +
      cashDashboard.breakdown.qrIncomeCents
    : 0;
  const collectionsDescription = `${todayCollections.patientCount} ${
    todayCollections.patientCount === 1 ? "paciente" : "pacientes"
  } · ${formatMoney(todayCollections.paidTodayCents)} cobrados hoy`;
  const priorityEstimatedBalance = priorityCollection
    ? doctorOrderPendingCents(priorityCollection)
    : null;

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Ventas y cobros"
        description="Administración"
        actions={
          <>
            {canCreateSale ? (
              <Link
                href="/sigeco/administracion/ventas/nueva"
                className={buttonVariants({ size: "sm" })}
              >
                Nueva venta
              </Link>
            ) : null}
            {canReadClients ? (
              <Link
                href="/sigeco/administracion/clientes"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Clientes
              </Link>
            ) : null}
            <Link
              href="/sigeco/administracion/caja"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Control de Caja
            </Link>
          </>
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
                      : priorityEstimatedBalance !== null
                        ? formatMoney(priorityEstimatedBalance)
                        : "Por registrar"}
                  </p>
                  <p className="mt-0.5 font-mono text-[11px] tabular-nums text-muted">
                    Orden #{priorityCollection.id.slice(-8).toUpperCase()}
                  </p>
                </div>
                <form action={attendAdministrationWorkItemAction} className="ml-auto shrink-0">
                  <input type="hidden" name="workItemId" value={priorityCollection.id} />
                  <button type="submit" className={cn(buttonVariants({ size: "sm" }))}>
                    Atender cobro
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </form>
            </div>
          </div>
        </section>
      ) : null}

      {priorityCollection && isPersonalAdministrationAccount ? (
        <PriorityCollectionDialog
          action={attendAdministrationWorkItemAction}
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
          amount={
            priorityCollection.sales[0]
              ? formatMoney(priorityCollection.sales[0].totalCents)
              : priorityEstimatedBalance !== null
                ? formatMoney(priorityEstimatedBalance)
                : undefined
          }
          balance={
            priorityCollection.sales[0]
              ? formatMoney(priorityCollection.sales[0].balanceCents)
              : priorityEstimatedBalance !== null
                ? formatMoney(priorityEstimatedBalance)
                : undefined
          }
        />
      ) : null}

      {query.aviso === "cash-session-opened" ? (
        <div
          className="rounded-[9px] border border-success/30 bg-success/10 px-4 py-3 text-sm text-text"
          role="status"
        >
          Caja abierta. Ya puedes registrar los cobros del día.
        </div>
      ) : null}

      <OpenCashSessionCallout
        user={user}
        moduleAccess={moduleAccess}
        branch={activeBranch}
        returnTo="/sigeco/administracion"
      />

      {canUse(user.role, moduleAccess, "cash_movements_create") ? (
        <CashExpenseDialogs
          cashSessionId={
            hasUsableCashSession
              ? cashDashboard.activeSessionId
              : null
          }
          personnel={cashPersonnel}
          authorizers={cashAuthorizers}
          currentUserId={user.id}
          disabled={!hasUsableCashSession}
          disabledReason="Abre o regulariza la Caja de hoy antes de registrar egresos."
          hasStaleOpenSession={hasStaleOpenCashSession}
          createStaffCashExpenseAction={createStaffCashExpenseAction}
          createUrgentPurchaseExpenseAction={createUrgentPurchaseExpenseAction}
          createOtherCashExpenseAction={createOtherCashExpenseAction}
        />
      ) : null}

      <section
        className={`grid gap-2 sm:gap-3 ${isSuperAdmin ? "grid-cols-3" : "grid-cols-2"}`}
      >
        <KpiCard
          icon={Banknote}
          label="Cobrado en Caja"
          value={formatMoney(activeCashCollectedCents)}
          compactMobile
        />
        {isSuperAdmin ? (
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

      <Card className="p-0">
        <CardHeader
          className="mb-0 p-[18px] pb-3"
          title="Pacientes que pagaron hoy"
          description={collectionsDescription}
          action={
            <Link
              href="/sigeco/administracion/caja"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Ver movimientos
            </Link>
          }
        />
        <RecordList>
          {todayCollections.collections.map((entry) => (
            <RecordItem
              key={entry.saleId}
              href={`/sigeco/administracion/ventas/${entry.saleId}`}
              title={entry.patient.fullName}
              status={
                <Chip tone={entry.balanceCents > 0 ? "warning" : "success"} dot>
                  {saleStatusLabels[entry.status]}
                </Chip>
              }
            >
              <span className="tabular-nums">{entry.patient.internalCode}</span>
              <span className="min-w-0 truncate font-medium text-text">
                {collectionConcept(entry.concept)}
              </span>
              <span className="font-semibold tabular-nums text-text">
                Pagó {formatMoney(entry.paidTodayCents)}
                {entry.balanceCents > 0
                  ? ` · Saldo ${formatMoney(entry.balanceCents)}`
                  : ""}
              </span>
              <span>
                {collectionLocation(entry)} · {formatTime(entry.lastPaidAt)} ·{" "}
                {entry.methods.join(", ")}
              </span>
            </RecordItem>
          ))}
          {todayCollections.collections.length === 0 ? (
            <RecordListEmpty>{emptyCollectionsMessage}</RecordListEmpty>
          ) : null}
        </RecordList>
        <RecordTable>
          <Table caption="Pacientes que pagaron hoy">
            <thead>
              <tr>
                <Th>Paciente</Th>
                <Th>Concepto</Th>
                <Th>Pagado hoy</Th>
                <Th>Saldo</Th>
                <Th>Área</Th>
                <Th>Estado</Th>
              </tr>
            </thead>
            <tbody>
              {todayCollections.collections.map((entry) => (
                <Tr key={entry.saleId}>
                  <Td className="font-semibold text-text">
                    <Link
                      href={`/sigeco/administracion/ventas/${entry.saleId}`}
                      className="focus-ring rounded-[7px] hover:text-primary-dark hover:underline"
                    >
                      {entry.patient.fullName}
                    </Link>
                    <span className="block text-[11px] font-normal tabular-nums text-muted">
                      {entry.patient.internalCode}
                    </span>
                  </Td>
                  <Td className="max-w-[260px]">
                    <span className="block truncate text-text">
                      {collectionConcept(entry.concept)}
                    </span>
                    <span className="block text-[11px] tabular-nums text-muted">
                      {formatTime(entry.lastPaidAt)} · {entry.methods.join(", ")}
                    </span>
                  </Td>
                  <Td className="font-semibold tabular-nums text-text">
                    {formatMoney(entry.paidTodayCents)}
                    {entry.paidCents !== entry.paidTodayCents ? (
                      <span className="block text-[11px] font-normal text-muted">
                        Total pagado {formatMoney(entry.paidCents)}
                      </span>
                    ) : null}
                  </Td>
                  <Td
                    className={cn(
                      "tabular-nums",
                      entry.balanceCents > 0 && "font-semibold text-warning"
                    )}
                  >
                    {formatMoney(entry.balanceCents)}
                  </Td>
                  <Td>
                    <span className="block text-text">
                      {entry.currentArea ? routeAreaLabels[entry.currentArea] : "—"}
                    </span>
                    <span className="block text-[11px] text-muted">
                      {entry.visitStatus
                        ? visitStatusLabels[entry.visitStatus]
                        : "Venta sin visita"}
                    </span>
                  </Td>
                  <Td>
                    <Chip tone={entry.balanceCents > 0 ? "warning" : "success"} dot>
                      {saleStatusLabels[entry.status]}
                    </Chip>
                  </Td>
                </Tr>
              ))}
              {todayCollections.collections.length === 0 ? (
                <tr>
                  <Td className="py-8 text-center" colSpan={6}>
                    {emptyCollectionsMessage}
                  </Td>
                </tr>
              ) : null}
            </tbody>
          </Table>
        </RecordTable>
      </Card>

      <DesktopTableToolbar count={`${workItems.length} registros del día`} />

      <Card className="p-0">
        <CardHeader
          className="mb-0 p-[18px] pb-3"
          title="Cobros y entregas del día"
          description="Pendientes derivados y tratamientos pagados hoy."
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
                    {sale ? saleStatusLabels[sale.status] : workItemStatusLabels[item.status]}
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
                    {formatMoney(sale.totalCents)} · Pagado {formatMoney(sale.paidCents)} ·
                    Saldo {formatMoney(sale.balanceCents)}
                  </span>
                ) : null}
                <span>{workItemLocation(item)}</span>
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
                <Th>Área</Th>
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
                      {sale ? (
                        <>
                          <span className="block text-text">
                            Pagado {formatMoney(sale.paidCents)}
                          </span>
                          <span className="block text-[11px] text-muted">
                            Total {formatMoney(sale.totalCents)} · Saldo{" "}
                            {formatMoney(sale.balanceCents)}
                          </span>
                        </>
                      ) : (
                        "—"
                      )}
                    </Td>
                    <Td>
                      <span className="block text-text">
                        {item.visit.route
                          ? routeAreaLabels[item.visit.route.currentArea]
                          : "—"}
                      </span>
                      <span className="block text-[11px] text-muted">
                        {visitStatusLabels[item.visit.status]}
                      </span>
                    </Td>
                    <Td>
                      <Chip tone={sale ? (sale.balanceCents > 0 ? "warning" : "success") : "neutral"} dot>
                        {sale ? saleStatusLabels[sale.status] : workItemStatusLabels[item.status]}
                      </Chip>
                    </Td>
                  </Tr>
                );
              })}
              {workItems.length === 0 ? (
                <tr>
                  <Td className="py-8 text-center" colSpan={6}>
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
