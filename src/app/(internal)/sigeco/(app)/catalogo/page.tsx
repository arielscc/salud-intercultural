import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { internalInputClassName } from "@/components/internal/Field";
import { Card, CardHeader } from "@/components/internal/ui/Card";
import { Chip } from "@/components/internal/ui/Chip";
import { DesktopTableToolbar } from "@/components/internal/ui/DesktopTableToolbar";
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
  formatServiceCatalogMoney,
  serviceCatalogKindLabels
} from "@/features/service-catalog/labels";
import {
  computeServiceCatalogMaxDiscountCents,
  countServiceCatalogItems,
  getServiceCatalogCategories,
  getServiceCatalogItems
} from "@/modules/database/queries/service-catalog";
import { parsePage } from "@/modules/database/pagination";
import { requirePermission } from "@/modules/permissions";

type CatalogPageProps = {
  searchParams: Promise<{
    page?: string;
    q?: string;
    categoria?: string;
    tipo?: "service" | "treatment" | "all";
    estado?: "active" | "inactive" | "all";
  }>;
};

const actionClassName =
  "focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-[9px] border border-border bg-surface px-3 text-sm font-semibold text-text transition hover:border-primary/40 hover:text-primary-dark";

export default async function ServiceCatalogPage({ searchParams }: CatalogPageProps) {
  const user = await requirePermission("service_catalog_read");
  const params = await searchParams;
  const page = parsePage(params.page);
  const pageSize = 40;
  const canWrite = roleHasPermission(user.role, "service_catalog_write");
  const selectedKind =
    params.tipo === "service" || params.tipo === "treatment" || params.tipo === "all"
      ? params.tipo
      : "all";
  const selectedStatus =
    params.estado === "active" || params.estado === "inactive" || params.estado === "all"
      ? params.estado
      : "all";
  const filters = {
    search: params.q,
    category: params.categoria,
    kind: selectedKind,
    status: canWrite ? selectedStatus : ("active" as const)
  };
  const [items, totalItems, categories] = await Promise.all([
    getServiceCatalogItems({ ...filters, page, pageSize }),
    countServiceCatalogItems(filters),
    getServiceCatalogCategories()
  ]);

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Catálogo de servicios y tratamientos"
        description="Ofertas vendibles que el médico puede elegir. Separado de Productos (insumos con stock)."
        actions={
          canWrite ? (
            <Link
              className={`${actionClassName} border-primary bg-primary text-white hover:text-white`}
              href="/sigeco/catalogo/nuevo"
            >
              <Plus size={16} aria-hidden="true" />
              Nueva oferta
            </Link>
          ) : null
        }
      />

      <Card>
        <CardHeader title="Buscar y filtrar" description="Encuentra por nombre, código o categoría." />
        <form className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_180px_160px_150px_auto]">
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
              placeholder="Nombre, código o categoría"
              aria-label="Buscar oferta"
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
            name="tipo"
            defaultValue={selectedKind}
            aria-label="Tipo"
          >
            <option value="all">Todos los tipos</option>
            <option value="service">Servicios</option>
            <option value="treatment">Tratamientos</option>
          </select>
          {canWrite ? (
            <select
              className={internalInputClassName}
              name="estado"
              defaultValue={selectedStatus}
              aria-label="Estado"
            >
              <option value="all">Todos</option>
              <option value="active">Activas</option>
              <option value="inactive">Inactivas</option>
            </select>
          ) : (
            <input type="hidden" name="estado" value="active" />
          )}
          <button className={actionClassName} type="submit">
            Filtrar
          </button>
        </form>
      </Card>

      <DesktopTableToolbar count={`${items.length} de ${totalItems} ofertas`} />
      <Card className="p-0">
        <CardHeader
          className="mb-0 p-[18px] pb-3"
          title="Ofertas"
          description="El tope de descuento de un tratamiento es la suma de los umbrales de sus productos."
        />
        <RecordList>
          {items.map((item) => {
            const cap = computeServiceCatalogMaxDiscountCents(item);
            return (
              <RecordItem
                key={item.id}
                href={`/sigeco/catalogo/${item.id}`}
                title={item.name}
                status={
                  item.active ? (
                    <Chip tone="success" dot>
                      Activa
                    </Chip>
                  ) : (
                    <Chip>Inactiva</Chip>
                  )
                }
              >
                <span>
                  {serviceCatalogKindLabels[item.kind]} · {item.category}
                </span>
                <span className="tabular-nums">{item.code}</span>
                <span className="tabular-nums">
                  Precio base <strong>{formatServiceCatalogMoney(item.basePriceCents)}</strong> ·
                  Tope descuento {formatServiceCatalogMoney(cap)}
                </span>
              </RecordItem>
            );
          })}
          {items.length === 0 ? (
            <RecordListEmpty>Sin ofertas que coincidan con los filtros.</RecordListEmpty>
          ) : null}
        </RecordList>
        <RecordTable>
          <Table caption="Catálogo de servicios y tratamientos">
            <thead>
              <tr>
                <Th>Oferta</Th>
                <Th>Tipo y categoría</Th>
                <Th className="text-right">Precio base</Th>
                <Th className="text-right">Tope descuento</Th>
                <Th>Estado</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const cap = computeServiceCatalogMaxDiscountCents(item);
                return (
                  <Tr key={item.id}>
                    <Td className="font-semibold text-text">
                      <Link className="hover:underline" href={`/sigeco/catalogo/${item.id}`}>
                        {item.name}
                      </Link>
                      <span className="block text-[11px] font-normal text-muted">{item.code}</span>
                    </Td>
                    <Td>
                      {serviceCatalogKindLabels[item.kind]}
                      <span className="block text-[11px] text-muted">{item.category}</span>
                    </Td>
                    <Td className="text-right tabular-nums">
                      {formatServiceCatalogMoney(item.basePriceCents)}
                    </Td>
                    <Td className="text-right tabular-nums">{formatServiceCatalogMoney(cap)}</Td>
                    <Td>
                      {item.active ? (
                        <Chip tone="success">Activa</Chip>
                      ) : (
                        <Chip>Inactiva</Chip>
                      )}
                    </Td>
                  </Tr>
                );
              })}
              {items.length === 0 ? (
                <tr>
                  <Td className="py-8 text-center" colSpan={5}>
                    Sin ofertas que coincidan con los filtros.
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
          pathname="/sigeco/catalogo"
          searchParams={{
            q: params.q,
            categoria: params.categoria,
            tipo: params.tipo,
            estado: params.estado
          }}
        />
      </Card>
    </div>
  );
}
