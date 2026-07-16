import Link from "next/link";
import { Bell, Boxes, TriangleAlert } from "lucide-react";
import { Field, internalInputClassName } from "@/components/internal/Field";
import { SubmitButton } from "@/components/internal/SubmitButton";
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
import { createInventoryItemAction } from "@/features/inventory/actions";
import {
  countInventoryItems,
  getInventoryItems,
  getInventorySummary
} from "@/modules/database/queries/inventory";
import { parsePage } from "@/modules/database/pagination";
import { requirePermission } from "@/modules/permissions";
import { cn } from "@/lib/cn";

const emptyInventoryMessage = (
  <>
    <span className="block font-semibold text-text">Sin productos registrados.</span>
    <span className="mt-1 block text-sm text-muted">Crea el primer producto con el formulario.</span>
  </>
);

type InventoryPageProps = {
  searchParams: Promise<{ page?: string }>;
};

export default async function InventoryPage({ searchParams }: InventoryPageProps) {
  await requirePermission("inventory_read");
  const { page: pageParam } = await searchParams;
  const page = parsePage(pageParam);
  const pageSize = 80;
  const [items, summary, totalItems] = await Promise.all([
    getInventoryItems({ page, pageSize }),
    getInventorySummary(),
    countInventoryItems()
  ]);

  return (
    <div className="grid gap-4">
      <PageHeader title="Inventario" description="Stock operativo" />

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

      <DesktopTableToolbar count={`${items.length} de ${totalItems} productos`} />

      <div className="grid items-start gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Card className="p-0">
          <CardHeader
            className="mb-0 p-[18px] pb-3"
            title="Productos en inventario"
            description="Existencias actuales, niveles mínimos y estado de reposición."
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
                    lowStock ? (
                      <Chip tone="warning" dot>
                        Stock bajo
                      </Chip>
                    ) : undefined
                  }
                >
                  <span className="tabular-nums">
                    {item.internalCode}
                    {item.sku ? ` · ${item.sku}` : ""}
                  </span>
                  <span className="tabular-nums">
                    Stock{" "}
                    <span className={cn("font-semibold", lowStock ? "text-warning" : "text-text")}>
                      {item.currentStock} {item.unit}
                    </span>{" "}
                    · Mínimo {item.minimumStock} {item.unit}
                  </span>
                  {item.alerts[0] ? (
                    <span className="min-w-0 truncate text-[11px] text-error">
                      {item.alerts[0].message}
                    </span>
                  ) : null}
                </RecordItem>
              );
            })}
            {items.length === 0 ? (
              <RecordListEmpty>{emptyInventoryMessage}</RecordListEmpty>
            ) : null}
          </RecordList>
          <RecordTable>
            <Table caption="Productos de inventario">
              <thead>
                <tr>
                  <Th>Producto</Th>
                  <Th className="lg:hidden xl:table-cell">SKU</Th>
                  <Th className="text-right">Stock</Th>
                  <Th className="text-right">Mínimo</Th>
                  <Th>Estado</Th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const lowStock = item.currentStock <= item.minimumStock;

                  return (
                    <Tr key={item.id}>
                      <Td className="font-semibold text-text">
                        <Link
                          href={`/sigeco/inventario/${item.id}`}
                          className="focus-ring rounded-[7px] hover:text-primary-dark hover:underline"
                        >
                          {item.name}
                        </Link>
                        <span className="block text-[11px] font-normal tabular-nums text-muted">
                          {item.internalCode}
                        </span>
                      </Td>
                      <Td className="tabular-nums lg:hidden xl:table-cell">{item.sku ?? "—"}</Td>
                      <Td
                        className={cn(
                          "text-right tabular-nums",
                          lowStock && "font-semibold text-warning"
                        )}
                      >
                        {item.currentStock} {item.unit}
                      </Td>
                      <Td className="text-right tabular-nums">
                        {item.minimumStock} {item.unit}
                      </Td>
                      <Td className="max-w-[220px]">
                        {lowStock ? (
                          <Chip tone="warning" dot>
                            Stock bajo
                          </Chip>
                        ) : (
                          "—"
                        )}
                        {item.alerts[0] ? (
                          <span className="mt-1 block truncate text-[11px] text-error">
                            {item.alerts[0].message}
                          </span>
                        ) : null}
                      </Td>
                    </Tr>
                  );
                })}
                {items.length === 0 ? (
                  <tr>
                    <Td className="py-8 text-center" colSpan={5}>
                      {emptyInventoryMessage}
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
          />
        </Card>

        <Card>
          <CardHeader
            title="Nuevo producto"
            description="Registra un artículo y define su unidad y nivel mínimo de stock."
          />
          <form action={createInventoryItemAction} className="grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Código interno">
                <input className={internalInputClassName} name="internalCode" required />
              </Field>
              <Field label="SKU">
                <input className={internalInputClassName} name="sku" />
              </Field>
            </div>
            <Field label="Nombre">
              <input className={internalInputClassName} name="name" required />
            </Field>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Unidad">
                <input className={internalInputClassName} name="unit" defaultValue="unidad" required />
              </Field>
              <Field label="Stock mínimo">
                <input
                  className={internalInputClassName}
                  name="minimumStock"
                  inputMode="numeric"
                  defaultValue="0"
                />
              </Field>
              <Field label="Stock inicial">
                <input
                  className={internalInputClassName}
                  name="initialStock"
                  inputMode="numeric"
                  defaultValue="0"
                />
              </Field>
            </div>
            <Field label="Descripción">
              <textarea className={`${internalInputClassName} min-h-20 py-3`} name="description" />
            </Field>
            <SubmitButton>Crear producto</SubmitButton>
          </form>
        </Card>
      </div>
    </div>
  );
}
