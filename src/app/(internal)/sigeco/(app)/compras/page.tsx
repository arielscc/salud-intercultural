import Link from "next/link";
import { Boxes, CircleDollarSign, ClipboardList, Clock3, Plus, Search } from "lucide-react";
import type { PurchaseStatus } from "@/generated/prisma/client";
import { Field, internalInputClassName } from "@/components/internal/Field";
import { buttonVariants } from "@/components/internal/ui/Button";
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
import { roleHasPermission } from "@/features/internal-auth/permissions";
import {
  purchaseStatusLabels
} from "@/features/purchases/labels";
import { formatMoney } from "@/features/sales/labels";
import { formatDateOnly } from "@/lib/dates";
import { getActiveSuppliers } from "@/modules/database/queries/inventory";
import {
  countPurchases,
  effectivePurchasePaymentCents,
  getPurchases,
  getPurchaseSummary
} from "@/modules/database/queries/purchases";
import { parsePage } from "@/modules/database/pagination";
import { requirePermission } from "@/modules/permissions";
import { getBranchContext } from "@/features/branches/context";

const statuses = [
  "draft",
  "confirmed",
  "partially_received",
  "received",
  "cancelled"
] as const satisfies readonly PurchaseStatus[];

function statusTone(status: PurchaseStatus) {
  if (status === "received") return "success" as const;
  if (status === "cancelled") return "error" as const;
  if (status === "partially_received") return "warning" as const;
  return status === "confirmed" ? ("primary" as const) : ("neutral" as const);
}

export default async function PurchasesPage({
  searchParams
}: {
  searchParams: Promise<{
    page?: string;
    q?: string;
    estado?: PurchaseStatus | "all";
    proveedor?: string;
  }>;
}) {
  const user = await requirePermission("purchases_read");
  const { activeBranch } = await getBranchContext(user);
  const params = await searchParams;
  const page = parsePage(params.page);
  const pageSize = 30;
  const status =
    params.estado === "all" || statuses.includes(params.estado as PurchaseStatus)
      ? params.estado
      : "all";
  const filters = {
    search: params.q,
    status,
    supplierId: params.proveedor,
    branchCode: activeBranch.code
  };
  const [purchases, total, summary, suppliers] = await Promise.all([
    getPurchases({ ...filters, page, pageSize }),
    countPurchases(filters),
    getPurchaseSummary(activeBranch.code),
    getActiveSuppliers()
  ]);
  const canWrite = roleHasPermission(user.role, "purchases_write");

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Compras y recepciones"
        description="Controla lo pedido, lo pagado, lo recibido y su ingreso real al stock."
        actions={
          canWrite ? (
            <Link href="/sigeco/compras/nueva" className={buttonVariants({ size: "sm" })}>
              <Plus size={16} aria-hidden="true" />
              Nueva compra
            </Link>
          ) : null
        }
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard icon={ClipboardList} label="Borradores" value={summary.drafts} />
        <KpiCard
          icon={Boxes}
          label="Por recibir"
          value={summary.pendingReceipts}
          flag={summary.pendingReceipts ? { tone: "warn", label: "Pendiente" } : undefined}
        />
        <KpiCard
          icon={CircleDollarSign}
          label="Saldo por pagar"
          value={formatMoney(summary.pendingPaymentCents)}
        />
        <KpiCard
          icon={Clock3}
          label="Vencidos o por vencer"
          value={summary.expiringLots}
          flag={summary.expiringLots ? { tone: "crit", label: "Revisar" } : undefined}
        />
      </section>

      <Card>
        <CardHeader
          title="Buscar compras"
          description="Busca por número de compra, documento o proveedor."
        />
        <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_190px_220px_auto]">
          <Field label="Buscar">
            <span className="relative block">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                size={16}
                aria-hidden="true"
              />
              <input
                className={`${internalInputClassName} pl-9`}
                name="q"
                defaultValue={params.q}
                placeholder="Compra, documento o proveedor"
              />
            </span>
          </Field>
          <Field label="Estado">
            <select className={internalInputClassName} name="estado" defaultValue={status}>
              <option value="all">Todos</option>
              {statuses.map((value) => (
                <option key={value} value={value}>{purchaseStatusLabels[value]}</option>
              ))}
            </select>
          </Field>
          <Field label="Proveedor">
            <select
              className={internalInputClassName}
              name="proveedor"
              defaultValue={params.proveedor ?? "all"}
            >
              <option value="all">Todos</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
              ))}
            </select>
          </Field>
          <button className={`${buttonVariants({ variant: "outline" })} self-end`} type="submit">
            Filtrar
          </button>
        </form>
      </Card>

      <Card className="p-0">
        <CardHeader
          className="mb-0 p-[18px] pb-3"
          title="Historial de compras"
          description={`${purchases.length} de ${total} registros`}
        />
        <RecordList>
          {purchases.map((purchase) => {
            const paid = purchase.payments.reduce(
              (sum, payment) => sum + effectivePurchasePaymentCents(payment),
              0
            );
            const ordered = purchase.lines.reduce(
              (sum, line) => sum + line.orderedQuantity,
              0
            );
            const received = purchase.lines.reduce(
              (sum, line) => sum + line.receivedQuantity,
              0
            );
            return (
              <RecordItem
                key={purchase.id}
                href={`/sigeco/compras/${purchase.id}`}
                title={purchase.supplier.name}
                status={
                  <Chip tone={statusTone(purchase.status)} dot>
                    {purchaseStatusLabels[purchase.status]}
                  </Chip>
                }
              >
                <span className="tabular-nums">
                  {purchase.purchaseNumber} · {formatDateOnly(purchase.purchaseDate)}
                </span>
                <span>
                  Pedido {ordered} · recibido {received} · {purchase._count.receipts} recepciones
                </span>
                <span>
                  Total {formatMoney(purchase.totalCents)} · pagado {formatMoney(paid)}
                </span>
              </RecordItem>
            );
          })}
          {purchases.length === 0 ? (
            <RecordListEmpty>No hay compras que coincidan con los filtros.</RecordListEmpty>
          ) : null}
        </RecordList>
        <RecordTable>
          <Table caption="Historial de compras">
            <thead>
              <tr>
                <Th>Compra</Th>
                <Th>Proveedor</Th>
                <Th>Estado</Th>
                <Th>Pedido / recibido</Th>
                <Th className="text-right">Total / pagado</Th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((purchase) => {
                const paid = purchase.payments.reduce(
                  (sum, payment) => sum + effectivePurchasePaymentCents(payment),
                  0
                );
                const ordered = purchase.lines.reduce(
                  (sum, line) => sum + line.orderedQuantity,
                  0
                );
                const received = purchase.lines.reduce(
                  (sum, line) => sum + line.receivedQuantity,
                  0
                );
                return (
                  <Tr key={purchase.id}>
                    <Td>
                      <Link
                        className="font-semibold text-primary-dark hover:underline"
                        href={`/sigeco/compras/${purchase.id}`}
                      >
                        {purchase.purchaseNumber}
                      </Link>
                      <span className="block text-xs text-muted">
                        {formatDateOnly(purchase.purchaseDate)}
                      </span>
                    </Td>
                    <Td>{purchase.supplier.name}</Td>
                    <Td>
                      <Chip tone={statusTone(purchase.status)}>
                        {purchaseStatusLabels[purchase.status]}
                      </Chip>
                    </Td>
                    <Td className="tabular-nums">{ordered} / {received}</Td>
                    <Td className="text-right tabular-nums">
                      {formatMoney(purchase.totalCents)}
                      <span className="block text-xs text-muted">
                        {formatMoney(paid)} pagado
                      </span>
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        </RecordTable>
        <Pagination
          page={page}
          pageSize={pageSize}
          totalItems={total}
          pathname="/sigeco/compras"
          searchParams={{
            q: params.q,
            estado: status === "all" ? undefined : status,
            proveedor: params.proveedor === "all" ? undefined : params.proveedor
          }}
        />
      </Card>
    </div>
  );
}
