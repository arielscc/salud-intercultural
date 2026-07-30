import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { internalInputClassName } from "@/components/internal/Field";
import { Card, CardHeader } from "@/components/internal/ui/Card";
import { Chip } from "@/components/internal/ui/Chip";
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
import { countSuppliers, getSuppliers } from "@/modules/database/queries/inventory";
import { parsePage } from "@/modules/database/pagination";
import { requirePermission } from "@/modules/permissions";

const buttonClassName =
  "focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-[9px] border border-primary bg-primary px-3 text-sm font-semibold text-white";

export default async function SuppliersPage({
  searchParams
}: {
  searchParams: Promise<{
    page?: string;
    q?: string;
    estado?: "active" | "inactive" | "all";
  }>;
}) {
  const user = await requirePermission("suppliers_read");
  const params = await searchParams;
  const page = parsePage(params.page);
  const canWrite = roleHasPermission(user.role, "suppliers_write");
  const selectedStatus =
    params.estado === "active" ||
    params.estado === "inactive" ||
    params.estado === "all"
      ? params.estado
      : "all";
  const filters = { search: params.q, status: selectedStatus };
  const [suppliers, total] = await Promise.all([
    getSuppliers({ ...filters, page, pageSize: 40 }),
    countSuppliers(filters)
  ]);

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Proveedores"
        description="Contactos y productos asociados."
        actions={
          canWrite ? (
            <Link className={buttonClassName} href="/sigeco/inventario/proveedores/nuevo">
              <Plus size={16} aria-hidden="true" />
              Nuevo proveedor
            </Link>
          ) : null
        }
      />
      <Card>
        <CardHeader title="Buscar" description="Por empresa, contacto, teléfono o WhatsApp." />
        <form className="grid gap-3 sm:grid-cols-[1fr_180px_auto]">
          <label className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              size={16}
              aria-hidden="true"
            />
            <input
              className={`${internalInputClassName} pl-9`}
              name="q"
              defaultValue={params.q}
              placeholder="Buscar proveedor"
              aria-label="Buscar proveedor"
            />
          </label>
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
          <button className={buttonClassName} type="submit">
            Filtrar
          </button>
        </form>
      </Card>
      <Card className="p-0">
        <CardHeader
          className="mb-0 p-[18px] pb-3"
          title={`${total} proveedores`}
          description="Desactivar conserva asociaciones e historial."
        />
        <RecordList>
          {suppliers.map((supplier) => (
            <RecordItem
              key={supplier.id}
              href={`/sigeco/inventario/proveedores/${supplier.id}`}
              title={supplier.name}
              status={
                <Chip tone={supplier.active ? "success" : "neutral"}>
                  {supplier.active ? "Activo" : "Inactivo"}
                </Chip>
              }
            >
              <span>{supplier.contactName ?? "Sin persona de contacto"}</span>
              <span>{supplier.whatsapp ?? supplier.phone ?? "Sin teléfono"}</span>
              <span>{supplier._count.itemLinks} productos asociados</span>
            </RecordItem>
          ))}
          {suppliers.length === 0 ? (
            <RecordListEmpty>Sin proveedores que coincidan con los filtros.</RecordListEmpty>
          ) : null}
        </RecordList>
        <RecordTable>
          <Table caption="Proveedores registrados">
            <thead>
              <tr>
                <Th>Proveedor</Th>
                <Th>Contacto</Th>
                <Th>Teléfono</Th>
                <Th className="text-right">Productos</Th>
                <Th>Estado</Th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((supplier) => (
                <Tr key={supplier.id}>
                  <Td className="font-semibold text-text">
                    <Link
                      className="hover:underline"
                      href={`/sigeco/inventario/proveedores/${supplier.id}`}
                    >
                      {supplier.name}
                    </Link>
                  </Td>
                  <Td>{supplier.contactName ?? "—"}</Td>
                  <Td>{supplier.whatsapp ?? supplier.phone ?? "—"}</Td>
                  <Td className="text-right tabular-nums">{supplier._count.itemLinks}</Td>
                  <Td>
                    <Chip tone={supplier.active ? "success" : "neutral"}>
                      {supplier.active ? "Activo" : "Inactivo"}
                    </Chip>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </RecordTable>
        <Pagination
          page={page}
          pageSize={40}
          totalItems={total}
          pathname="/sigeco/inventario/proveedores"
          searchParams={{ q: params.q, estado: params.estado }}
        />
      </Card>
    </div>
  );
}
