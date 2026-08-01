import Link from "next/link";
import {
  ArrowLeftRight,
  Bell,
  Boxes,
  Layers3,
  Plus,
  Search,
  ShoppingCart,
  TriangleAlert,
  Truck
} from "lucide-react";
import { internalInputClassName } from "@/components/internal/Field";
import { Card, CardHeader } from "@/components/internal/ui/Card";
import { Chip } from "@/components/internal/ui/Chip";
import { DesktopTableToolbar } from "@/components/internal/ui/DesktopTableToolbar";
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
import {
  formatInventoryMoney,
  inventoryItemUsageLabels
} from "@/features/inventory/labels";
import { roleHasPermission } from "@/features/internal-auth/permissions";
import {
  countInventoryItems,
  getInventoryCategories,
  getInventoryItems,
  getInventorySummary
} from "@/modules/database/queries/inventory";
import { parsePage } from "@/modules/database/pagination";
import { requirePermission } from "@/modules/permissions";
import { cn } from "@/lib/cn";
import { getBranchContext } from "@/features/branches/context";

type InventoryPageProps = {
  searchParams: Promise<{
    page?: string;
    q?: string;
    categoria?: string;
    uso?: "sale" | "internal_use" | "both" | "all";
    estado?: "active" | "inactive" | "all";
  }>;
};

const actionClassName =
  "focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-[9px] border border-border bg-surface px-3 text-sm font-semibold text-text transition hover:border-primary/40 hover:text-primary-dark";

export default async function InventoryPage({ searchParams }: InventoryPageProps) {
  const user = await requirePermission("inventory_read");
  const { activeBranch } = await getBranchContext(user);
  const params = await searchParams;
  const page = parsePage(params.page);
  const pageSize = 40;
  const canWrite = roleHasPermission(user.role, "inventory_write");
  const canReadCosts = roleHasPermission(user.role, "inventory_cost_read");
  const canReadSuppliers = roleHasPermission(user.role, "suppliers_read");
  const canReadPurchases = roleHasPermission(user.role, "purchases_read");
  const selectedUsage =
    params.uso === "sale" ||
    params.uso === "internal_use" ||
    params.uso === "both" ||
    params.uso === "all"
      ? params.uso
      : "all";
  const selectedStatus =
    params.estado === "active" ||
    params.estado === "inactive" ||
    params.estado === "all"
      ? params.estado
      : "all";
  const filters = {
    search: params.q,
    category: params.categoria,
    usage: selectedUsage,
    status: canWrite || canReadCosts ? selectedStatus : ("active" as const),
    branchCode: activeBranch.code
  };
  const [items, summary, totalItems, categories] = await Promise.all([
    getInventoryItems({ ...filters, page, pageSize }),
    getInventorySummary(activeBranch.code),
    countInventoryItems(filters),
    getInventoryCategories()
  ]);

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Catálogo e inventario"
        description="Productos, disponibilidad, precios y reposición."
        actions={
          <>
            <Link className={actionClassName} href="/sigeco/inventario/lotes">
              <Layers3 size={16} aria-hidden="true" />
              Lotes y vencimientos
            </Link>
            {canWrite ? (
              <Link className={actionClassName} href="/sigeco/inventario/traslados">
                <ArrowLeftRight size={16} aria-hidden="true" />
                Traslados
              </Link>
            ) : null}
            {canReadPurchases ? (
              <Link className={actionClassName} href="/sigeco/compras">
                <ShoppingCart size={16} aria-hidden="true" />
                Compras
              </Link>
            ) : null}
            {canReadSuppliers ? (
              <Link className={actionClassName} href="/sigeco/inventario/proveedores">
                <Truck size={16} aria-hidden="true" />
                Proveedores
              </Link>
            ) : null}
            {canWrite ? (
              <Link
                className={`${actionClassName} border-primary bg-primary text-white hover:text-white`}
                href="/sigeco/inventario/nuevo"
              >
                <Plus size={16} aria-hidden="true" />
                Nuevo producto
              </Link>
            ) : null}
          </>
        }
      />

      <section className="grid gap-3 sm:grid-cols-3">
        <KpiCard icon={Boxes} label="Productos activos" value={summary.totalItems} />
        <KpiCard
          icon={TriangleAlert}
          label="Stock bajo"
          value={summary.lowStock}
          flag={summary.lowStock > 0 ? { tone: "warn", label: "Reponer" } : undefined}
        />
        <KpiCard
          icon={Bell}
          label="Alertas abiertas"
          value={summary.openAlerts}
          flag={summary.openAlerts > 0 ? { tone: "crit", label: "Revisar" } : undefined}
        />
      </section>

      <Card>
        <CardHeader
          title="Buscar y filtrar"
          description="Encuentra por nombre, código, SKU o categoría."
        />
        <form className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_180px_180px_150px_auto]">
          <label className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              size={16}
              aria-hidden="true"
            />
            <input
              className={`${internalInputClassName} pl-9`}
              name="q"
              defaultValue={params.q}
              placeholder="Nombre, código o SKU"
              aria-label="Buscar producto"
            />
          </label>
          <select
            className={internalInputClassName}
            name="categoria"
            defaultValue={params.categoria ?? "all"}
            aria-label="Categoría"
          >
            <option value="all">Todas las categorías</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <select
            className={internalInputClassName}
            name="uso"
            defaultValue={selectedUsage}
            aria-label="Uso"
          >
            <option value="all">Todos los usos</option>
            <option value="sale">Disponible para venta</option>
            <option value="internal_use">Disponible para uso interno</option>
            <option value="both">Solo uso mixto</option>
          </select>
          {canWrite || canReadCosts ? (
            <select
              className={internalInputClassName}
              name="estado"
              defaultValue={selectedStatus}
              aria-label="Estado"
            >
              <option value="all">Todos</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
          ) : (
            <input type="hidden" name="estado" value="active" />
          )}
          <button className={actionClassName} type="submit">
            Filtrar
          </button>
        </form>
      </Card>

      <DesktopTableToolbar count={`${items.length} de ${totalItems} productos`} />
      <Card className="p-0">
        <CardHeader
          className="mb-0 p-[18px] pb-3"
          title="Productos"
          description="El costo mostrado es referencial; las compras conservarán su propio costo."
        />
        <RecordList>
          {items.map((item) => {
            const lowStock = item.currentStock <= item.minimumStock;
            return (
              <RecordItem
                key={item.id}
                href={`/sigeco/inventario/${item.id}`}
                title={item.name}
                status={
                  !item.active ? (
                    <Chip>Inactivo</Chip>
                  ) : lowStock ? (
                    <Chip tone="warning" dot>
                      Stock bajo
                    </Chip>
                  ) : (
                    <Chip tone="success" dot>
                      Disponible
                    </Chip>
                  )
                }
              >
                <span>{item.category} · {inventoryItemUsageLabels[item.usage]}</span>
                <span className="tabular-nums">
                  {item.internalCode}{item.sku ? ` · ${item.sku}` : ""}
                </span>
                <span className="tabular-nums">
                  Stock <strong>{item.currentStock} {item.unit}</strong> · Venta{" "}
                  {formatInventoryMoney(item.salePriceCents)}
                </span>
                {canReadCosts ? (
                  <span>Costo referencial {formatInventoryMoney(item.referenceCostCents)}</span>
                ) : null}
              </RecordItem>
            );
          })}
          {items.length === 0 ? (
            <RecordListEmpty>Sin productos que coincidan con los filtros.</RecordListEmpty>
          ) : null}
        </RecordList>
        <RecordTable>
          <Table caption="Catálogo de productos">
            <thead>
              <tr>
                <Th>Producto</Th>
                <Th>Categoría y uso</Th>
                <Th className="text-right">Stock</Th>
                <Th className="text-right">Venta</Th>
                {canReadCosts ? <Th className="text-right">Costo ref.</Th> : null}
                <Th>Estado</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const lowStock = item.currentStock <= item.minimumStock;
                return (
                  <Tr key={item.id}>
                    <Td className="font-semibold text-text">
                      <Link className="hover:underline" href={`/sigeco/inventario/${item.id}`}>
                        {item.name}
                      </Link>
                      <span className="block text-[11px] font-normal text-muted">
                        {item.internalCode}{item.sku ? ` · ${item.sku}` : ""}
                      </span>
                    </Td>
                    <Td>
                      {item.category}
                      <span className="block text-[11px] text-muted">
                        {inventoryItemUsageLabels[item.usage]}
                      </span>
                    </Td>
                    <Td className={cn("text-right tabular-nums", lowStock && "text-warning")}>
                      {item.currentStock} {item.unit}
                    </Td>
                    <Td className="text-right tabular-nums">
                      {formatInventoryMoney(item.salePriceCents)}
                    </Td>
                    {canReadCosts ? (
                      <Td className="text-right tabular-nums">
                        {formatInventoryMoney(item.referenceCostCents)}
                      </Td>
                    ) : null}
                    <Td>
                      {!item.active ? (
                        <Chip>Inactivo</Chip>
                      ) : lowStock ? (
                        <Chip tone="warning">Stock bajo</Chip>
                      ) : (
                        <Chip tone="success">Activo</Chip>
                      )}
                    </Td>
                  </Tr>
                );
              })}
              {items.length === 0 ? (
                <tr>
                  <Td className="py-8 text-center" colSpan={canReadCosts ? 6 : 5}>
                    Sin productos que coincidan con los filtros.
                  </Td>
                </tr>
              ) : null}
            </tbody>
          </Table>
        </RecordTable>
        <Pagination
          page={page}
          pageSize={pageSize}
          totalItems={totalItems}
          pathname="/sigeco/inventario"
          searchParams={{
            q: params.q,
            categoria: params.categoria,
            uso: params.uso,
            estado: params.estado
          }}
        />
      </Card>
    </div>
  );
}
