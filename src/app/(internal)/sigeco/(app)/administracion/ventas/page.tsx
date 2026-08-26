import Link from "next/link";
import { Banknote, Receipt, Wallet } from "lucide-react";
import { MobileBackLink } from "@/components/internal/MobileBackLink";
import { internalInputClassName } from "@/components/internal/Field";
import { Button, buttonVariants } from "@/components/internal/ui/Button";
import { Card, CardHeader } from "@/components/internal/ui/Card";
import { Chip } from "@/components/internal/ui/Chip";
import { KpiCard } from "@/components/internal/ui/KpiCard";
import { PageHeader } from "@/components/internal/ui/PageHeader";
import { Pagination } from "@/components/internal/ui/Pagination";
import {
  RecordItem,
  RecordList,
  RecordListEmpty,
  RecordTable
} from "@/components/internal/ui/RecordList";
import { Table, Td, Th, Tr } from "@/components/internal/ui/Table";
import { canUse } from "@/features/modules/access";
import { getBranchContext } from "@/features/branches/context";
import { formatMoney, saleStatusLabels } from "@/features/sales/labels";
import type { SaleStatus } from "@/generated/prisma/client";
import { cn } from "@/lib/cn";
import { dayRange, formatDateTime } from "@/lib/dates";
import { parsePage } from "@/modules/database/pagination";
import { getModuleAccessState } from "@/modules/database/queries/modules";
import {
  countSales,
  getSalesPage,
  getSalesPageTotals
} from "@/modules/database/queries/sales";
import { requirePermission } from "@/modules/permissions";

type SalesPageProps = {
  searchParams: Promise<{
    buscar?: string;
    estado?: string;
    periodo?: string;
    page?: string;
  }>;
};

type SalePeriod = "hoy" | "7dias" | "30dias" | "todas";

const periodOptions: Array<{ value: SalePeriod; label: string }> = [
  { value: "hoy", label: "Hoy" },
  { value: "7dias", label: "Últimos 7 días" },
  { value: "30dias", label: "Últimos 30 días" },
  { value: "todas", label: "Cualquier fecha" }
];

/*
 * Los estados salen del modelo, no de una interpretación: "pendiente" es una
 * venta sin ningún cobro y "con saldo" es una cobrada a medias. Mezclarlos en
 * un solo filtro escondería justo la diferencia que Administración necesita.
 */
const statusOptions: Array<{ value: string; label: string; status?: SaleStatus }> = [
  { value: "todas", label: "Todas" },
  { value: "pendiente", label: "Sin cobrar", status: "pending" },
  { value: "saldo", label: "Con saldo", status: "partial" },
  { value: "pagada", label: "Pagadas", status: "paid" },
  { value: "anulada", label: "Anuladas", status: "cancelled" }
];

function periodRange(period: SalePeriod) {
  if (period === "todas") return {};
  const today = dayRange();
  const days = period === "hoy" ? 1 : period === "7dias" ? 7 : 30;

  return {
    from: new Date(today.start.getTime() - (days - 1) * 24 * 60 * 60 * 1000),
    to: today.end
  };
}

const statusTone: Record<SaleStatus, "success" | "warning" | "error" | "neutral"> = {
  pending: "warning",
  partial: "warning",
  paid: "success",
  cancelled: "error"
};

function saleConcept(
  items: Array<{ description: string }>,
  total: number
) {
  if (items.length === 0) return "Venta sin detalle";
  const visible = items.map((item) => item.description).join(", ");
  return total > items.length ? `${visible} +${total - items.length}` : visible;
}

const emptyMessage = (
  <>
    <span className="block font-semibold text-text">No hay ventas con esos filtros.</span>
    <span className="mt-1 block text-sm text-muted">
      Prueba con otra fecha o busca al cliente por su nombre o teléfono.
    </span>
  </>
);

export default async function SalesListPage({ searchParams }: SalesPageProps) {
  const user = await requirePermission("sales_read");
  const [moduleAccess, params] = await Promise.all([getModuleAccessState(), searchParams]);
  const { activeBranch } = await getBranchContext(user);

  const search = params.buscar?.trim() ?? "";
  const period: SalePeriod = periodOptions.some((option) => option.value === params.periodo)
    ? (params.periodo as SalePeriod)
    : "30dias";
  const statusOption =
    statusOptions.find((option) => option.value === params.estado) ?? statusOptions[0];
  const page = parsePage(params.page);
  const pageSize = 30;

  const filters = {
    search: search || undefined,
    status: statusOption.status,
    branchCode: activeBranch.code,
    ...periodRange(period)
  };

  const [sales, total, totals] = await Promise.all([
    getSalesPage({ ...filters, page, pageSize }),
    countSales(filters),
    getSalesPageTotals(filters)
  ]);
  const canCreateSale = canUse(user.role, moduleAccess, "sales_write");

  const activeFilters = {
    ...(search ? { buscar: search } : {}),
    ...(params.estado && params.estado !== "todas" ? { estado: params.estado } : {}),
    ...(period !== "30dias" ? { periodo: period } : {})
  };

  return (
    <div className="grid gap-4">
      <MobileBackLink href="/sigeco/administracion" label="Volver a Caja" />
      <PageHeader
        title="Ventas"
        description="Todo lo vendido, con su cobro y su saldo"
        actionsClassName="w-full sm:w-auto"
        actions={
          canCreateSale ? (
            <Link
              href="/sigeco/administracion/ventas/nueva"
              className={cn(buttonVariants({ size: "sm" }), "w-full sm:w-auto")}
            >
              Nueva venta
            </Link>
          ) : undefined
        }
      />

      <section className="grid grid-cols-3 gap-2 sm:gap-3">
        <KpiCard
          icon={Receipt}
          tone="primary"
          label="Vendido"
          value={formatMoney(totals.totalCents)}
          note={`${total} venta${total === 1 ? "" : "s"}`}
        />
        <KpiCard
          icon={Banknote}
          tone="accent"
          label="Cobrado"
          value={formatMoney(totals.paidCents)}
        />
        <KpiCard
          icon={Wallet}
          tone="muted"
          label="Saldo"
          value={formatMoney(totals.balanceCents)}
          flag={
            totals.balanceCents > 0 ? { tone: "crit", label: "Por cobrar" } : undefined
          }
        />
      </section>

      <Card className="p-0">
        <CardHeader
          className="mb-0 p-[18px] pb-3"
          title="Filtros"
          description="Por cliente, estado y fecha"
        />
        <form className="grid gap-2 border-t border-border p-[18px] sm:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
          <input
            name="buscar"
            defaultValue={search}
            placeholder="Nombre, teléfono o código del cliente"
            aria-label="Buscar cliente"
            className={cn(internalInputClassName, "min-w-0")}
          />
          <select
            name="estado"
            defaultValue={statusOption.value}
            aria-label="Estado de la venta"
            className={internalInputClassName}
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            name="periodo"
            defaultValue={period}
            aria-label="Fecha"
            className={internalInputClassName}
          >
            {periodOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <Button type="submit" variant="outline">
            Filtrar
          </Button>
        </form>
      </Card>

      <Card className="p-0">
        <CardHeader
          className="mb-0 p-[18px] pb-3"
          title={search ? "Resultados" : "Ventas registradas"}
          description={`${total} venta${total === 1 ? "" : "s"} en esta sucursal`}
        />

        <RecordList>
          {sales.map((sale) => (
            <RecordItem
              key={sale.id}
              href={`/sigeco/administracion/ventas/${sale.id}`}
              title={sale.patient.fullName}
              status={<Chip tone={statusTone[sale.status]}>{saleStatusLabels[sale.status]}</Chip>}
            >
              <span className="block">{saleConcept(sale.items, sale._count.items)}</span>
              <span className="block tabular-nums">
                {formatMoney(sale.totalCents)} · Saldo {formatMoney(sale.balanceCents)}
              </span>
              <span className="block text-xs text-muted">
                {formatDateTime(sale.createdAt)}
                {sale.visitId ? "" : " · Mostrador"}
              </span>
            </RecordItem>
          ))}
          {sales.length === 0 ? <RecordListEmpty>{emptyMessage}</RecordListEmpty> : null}
        </RecordList>

        <RecordTable>
          <Table>
            <thead>
              <tr>
                <Th>Fecha</Th>
                <Th>Cliente</Th>
                <Th>Conceptos</Th>
                <Th className="text-right">Total</Th>
                <Th className="text-right">Saldo</Th>
                <Th>Estado</Th>
                <Th>Registró</Th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <Tr key={sale.id}>
                  <Td className="whitespace-nowrap tabular-nums">
                    {formatDateTime(sale.createdAt)}
                  </Td>
                  <Td className="font-semibold text-text">
                    <Link
                      href={`/sigeco/administracion/ventas/${sale.id}`}
                      className="focus-ring rounded-[7px] hover:text-primary-dark hover:underline"
                    >
                      {sale.patient.fullName}
                    </Link>
                    <span className="block text-xs tabular-nums text-muted">
                      {sale.patient.internalCode}
                      {sale.visitId ? "" : " · Mostrador"}
                    </span>
                  </Td>
                  <Td>{saleConcept(sale.items, sale._count.items)}</Td>
                  <Td className="whitespace-nowrap text-right tabular-nums">
                    {formatMoney(sale.totalCents)}
                  </Td>
                  <Td className="whitespace-nowrap text-right tabular-nums">
                    {formatMoney(sale.balanceCents)}
                  </Td>
                  <Td>
                    <Chip tone={statusTone[sale.status]}>{saleStatusLabels[sale.status]}</Chip>
                  </Td>
                  <Td className="text-muted">
                    {sale.createdBy?.name ?? sale.createdBy?.email ?? "—"}
                  </Td>
                </Tr>
              ))}
              {sales.length === 0 ? (
                <tr>
                  <Td className="py-8 text-center" colSpan={7}>
                    {emptyMessage}
                  </Td>
                </tr>
              ) : null}
            </tbody>
          </Table>
        </RecordTable>
      </Card>

      <Pagination
        page={page}
        pageSize={pageSize}
        totalItems={total}
        pathname="/sigeco/administracion/ventas"
        searchParams={activeFilters}
      />
    </div>
  );
}
