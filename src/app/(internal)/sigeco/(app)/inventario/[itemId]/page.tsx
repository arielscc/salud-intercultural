import Link from "next/link";
import { notFound } from "next/navigation";
import { Field, internalInputClassName } from "@/components/internal/Field";
import { MobileBackLink } from "@/components/internal/MobileBackLink";
import { NoticeForm } from "@/components/internal/NoticeForm";
import { SubmitButton } from "@/components/internal/SubmitButton";
import { Card, CardHeader } from "@/components/internal/ui/Card";
import { Chip } from "@/components/internal/ui/Chip";
import { InfoRow } from "@/components/internal/ui/InfoRow";
import {
  RecordItem,
  RecordList,
  RecordListEmpty,
  RecordTable
} from "@/components/internal/ui/RecordList";
import { Table, Td, Th, Tr } from "@/components/internal/ui/Table";
import {
  addInventoryEntryAction,
  createInventoryAdjustmentAction,
  setInventoryItemStatusAction,
  updateInventoryItemSuppliersAction
} from "@/features/inventory/actions";
import {
  formatInventoryMoney,
  inventoryItemUsageLabels,
  inventoryMovementTypeLabels
} from "@/features/inventory/labels";
import { roleHasPermission } from "@/features/internal-auth/permissions";
import { InventoryCatalogError } from "@/features/inventory/components/InventoryCatalogError";
import { formatDateTime } from "@/lib/dates";
import {
  getActiveSuppliers,
  getInventoryItemById
} from "@/modules/database/queries/inventory";
import { requirePermission } from "@/modules/permissions";
import { cn } from "@/lib/cn";

const linkClassName =
  "focus-ring inline-flex min-h-10 items-center justify-center rounded-[9px] border border-border px-3 text-sm font-semibold text-text hover:text-primary-dark";

export default async function InventoryItemPage({
  params,
  searchParams
}: {
  params: Promise<{ itemId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requirePermission("inventory_read");
  const { itemId } = await params;
  const query = await searchParams;
  const item = await getInventoryItemById(itemId);
  if (!item) notFound();

  const canWrite = roleHasPermission(user.role, "inventory_write");
  const canAdjust = roleHasPermission(user.role, "inventory_adjust");
  const canReadCosts = roleHasPermission(user.role, "inventory_cost_read");
  const canReadSuppliers = roleHasPermission(user.role, "suppliers_read");
  const canWriteSuppliers = roleHasPermission(user.role, "suppliers_write");
  if (!item.active && !canWrite && !canReadCosts) notFound();

  const suppliers = canWriteSuppliers ? await getActiveSuppliers() : [];
  const selectedSupplierIds = new Set(
    item.supplierLinks.filter((link) => link.active).map((link) => link.supplierId)
  );
  const preferredSupplierId = item.supplierLinks.find(
    (link) => link.active && link.preferred
  )?.supplierId;
  const lowStock = item.active && item.currentStock <= item.minimumStock;

  return (
    <div className="grid gap-4">
      <MobileBackLink href="/sigeco/inventario" label="Volver al catálogo" />
      <InventoryCatalogError code={query.error} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium tabular-nums text-muted">{item.internalCode}</p>
          <h2 className="font-sora text-xl font-bold tracking-tight text-text">{item.name}</h2>
          <p className="mt-0.5 text-sm text-muted">
            {item.category} · {inventoryItemUsageLabels[item.usage]}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!item.active ? (
            <Chip>Inactivo</Chip>
          ) : lowStock ? (
            <Chip tone="warning" dot>Stock bajo</Chip>
          ) : (
            <Chip tone="success" dot>Disponible</Chip>
          )}
          {canWrite ? (
            <Link className={linkClassName} href={`/sigeco/inventario/${item.id}/editar`}>
              Editar catálogo
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[1.35fr_1fr]">
        <div className="grid gap-4">
          <Card>
            <CardHeader title="Ficha del producto" description={item.description ?? undefined} />
            <dl className="grid gap-3 text-sm sm:grid-cols-3">
              <InfoRow label="SKU" value={item.sku ?? "Sin SKU"} />
              <InfoRow label="Unidad" value={item.unit} />
              <InfoRow label="Estado" value={item.active ? "Activo" : "Inactivo"} />
              <InfoRow
                label="Stock actual"
                value={`${item.currentStock} ${item.unit}`}
              />
              <InfoRow
                label="Stock mínimo"
                value={`${item.minimumStock} ${item.unit}`}
              />
              <InfoRow
                label="Precio de venta"
                value={formatInventoryMoney(item.salePriceCents)}
              />
              {canReadCosts ? (
                <InfoRow
                  label="Costo referencial"
                  value={formatInventoryMoney(item.referenceCostCents)}
                />
              ) : null}
            </dl>
          </Card>

          {canReadSuppliers ? (
            <Card>
              <CardHeader
                title="Proveedores asociados"
                description="El preferido es la primera opción de compra; no elimina las alternativas."
              />
              <div className="grid gap-2">
                {item.supplierLinks
                  .filter((link) => link.active && link.supplier.active)
                  .map((link) => (
                    <Link
                      key={link.id}
                      className="rounded-[9px] border border-border p-3 text-sm hover:border-primary/40"
                      href={`/sigeco/inventario/proveedores/${link.supplier.id}`}
                    >
                      <strong>{link.supplier.name}</strong>
                      {link.preferred ? (
                        <Chip className="ml-2" tone="primary">Preferido</Chip>
                      ) : null}
                      <span className="mt-1 block text-xs text-muted">
                        {link.supplier.whatsapp ?? link.supplier.phone ?? "Sin teléfono"}
                      </span>
                    </Link>
                  ))}
                {item.supplierLinks.filter((link) => link.active && link.supplier.active).length ===
                0 ? (
                  <p className="text-sm text-muted">Todavía no tiene proveedores activos.</p>
                ) : null}
              </div>
            </Card>
          ) : null}

          <Card className="p-0">
            <CardHeader
              className="mb-0 p-[18px] pb-3"
              title="Movimientos de inventario"
              description="Entradas, salidas y ajustes que modificaron la existencia."
            />
            <RecordList>
              {item.movements.map((movement) => (
                <RecordItem
                  key={movement.id}
                  title={inventoryMovementTypeLabels[movement.type]}
                  status={
                    <span
                      className={cn(
                        "font-bold tabular-nums",
                        movement.quantityDelta > 0 ? "text-success" : "text-error"
                      )}
                    >
                      {movement.quantityDelta > 0 ? "+" : ""}{movement.quantityDelta}
                    </span>
                  }
                >
                  <span>Stock después {movement.stockAfter}</span>
                  <span>{formatDateTime(movement.createdAt)} · {movement.reason}</span>
                </RecordItem>
              ))}
              {item.movements.length === 0 ? (
                <RecordListEmpty>Sin movimientos registrados.</RecordListEmpty>
              ) : null}
            </RecordList>
            <RecordTable>
              <Table caption="Movimientos del producto">
                <thead>
                  <tr>
                    <Th>Tipo</Th>
                    <Th className="text-right">Cantidad</Th>
                    <Th className="text-right">Stock después</Th>
                    <Th>Fecha</Th>
                    <Th>Motivo</Th>
                  </tr>
                </thead>
                <tbody>
                  {item.movements.map((movement) => (
                    <Tr key={movement.id}>
                      <Td>{inventoryMovementTypeLabels[movement.type]}</Td>
                      <Td className="text-right tabular-nums">
                        {movement.quantityDelta > 0 ? "+" : ""}{movement.quantityDelta}
                      </Td>
                      <Td className="text-right tabular-nums">{movement.stockAfter}</Td>
                      <Td>{formatDateTime(movement.createdAt)}</Td>
                      <Td>{movement.reason}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </RecordTable>
          </Card>

          {(canWrite || canReadCosts) ? (
            <Card>
              <CardHeader
                title="Historial del catálogo"
                description="Cada versión conserva quién cambió qué y por qué."
              />
              <div className="grid gap-3">
                {item.catalogVersions.map((version) => (
                  <article key={version.id} className="rounded-[9px] border border-border p-3 text-sm">
                    <div className="flex flex-wrap justify-between gap-2">
                      <strong>Versión {version.version} · {version.name}</strong>
                      <span className="text-muted">{formatDateTime(version.createdAt)}</span>
                    </div>
                    <p className="mt-1">{version.changeReason}</p>
                    <p className="mt-1 text-xs text-muted">
                      {version.category} · {inventoryItemUsageLabels[version.usage]} · Venta{" "}
                      {formatInventoryMoney(version.salePriceCents)}
                      {canReadCosts
                        ? ` · Costo ref. ${formatInventoryMoney(version.referenceCostCents)}`
                        : ""}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {version.changedBy?.name ??
                        version.changedBy?.email ??
                        "Migración del sistema"}
                    </p>
                  </article>
                ))}
              </div>
            </Card>
          ) : null}
        </div>

        <aside className="grid gap-4 lg:sticky lg:top-4">
          {canWrite && item.active ? (
            <Card>
              <CardHeader
                title="Entrada de stock"
                description="Suma unidades y documenta de dónde llegaron."
              />
              <NoticeForm
                action={addInventoryEntryAction}
                notice="Entrada registrada"
                className="grid gap-3"
              >
                <input type="hidden" name="itemId" value={item.id} />
                <Field label="Cantidad">
                  <input
                    className={internalInputClassName}
                    name="quantity"
                    type="number"
                    inputMode="numeric"
                    min="1"
                    required
                  />
                </Field>
                <Field label="Motivo">
                  <input
                    className={internalInputClassName}
                    name="reason"
                    defaultValue="Ingreso de stock"
                    required
                  />
                </Field>
                <SubmitButton>Registrar entrada</SubmitButton>
              </NoticeForm>
            </Card>
          ) : null}

          {canAdjust && item.active ? (
            <Card>
              <CardHeader
                title="Ajuste autorizado"
                description="Corrige la existencia sin borrar el movimiento anterior."
              />
              <NoticeForm
                action={createInventoryAdjustmentAction}
                notice="Ajuste registrado"
                className="grid gap-3"
              >
                <input type="hidden" name="itemId" value={item.id} />
                <Field label="Diferencia">
                  <input
                    className={internalInputClassName}
                    name="quantityDelta"
                    inputMode="numeric"
                    placeholder="-1 o 3"
                    required
                  />
                </Field>
                <Field label="Motivo">
                  <input className={internalInputClassName} name="reason" required />
                </Field>
                <SubmitButton variant="outline">Registrar ajuste</SubmitButton>
              </NoticeForm>
            </Card>
          ) : null}

          {canWriteSuppliers ? (
            <Card>
              <CardHeader
                title="Administrar proveedores"
                description="Selecciona varios y marca como máximo uno preferido."
              />
              <NoticeForm
                action={updateInventoryItemSuppliersAction}
                notice="Proveedores actualizados"
                className="grid gap-3"
              >
                <input type="hidden" name="itemId" value={item.id} />
                <input type="hidden" name="expectedRevision" value={item.revision} />
                <div className="grid max-h-52 gap-2 overflow-y-auto rounded-[9px] border border-border p-3">
                  {suppliers.map((supplier) => (
                    <label key={supplier.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        name="supplierIds"
                        value={supplier.id}
                        defaultChecked={selectedSupplierIds.has(supplier.id)}
                      />
                      {supplier.name}
                    </label>
                  ))}
                  {suppliers.length === 0 ? (
                    <p className="text-sm text-muted">
                      Primero registra un proveedor activo.
                    </p>
                  ) : null}
                </div>
                <Field label="Proveedor preferido">
                  <select
                    className={internalInputClassName}
                    name="preferredSupplierId"
                    defaultValue={preferredSupplierId ?? ""}
                  >
                    <option value="">Sin preferido</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Motivo">
                  <input
                    className={internalInputClassName}
                    name="changeReason"
                    placeholder="Ej. Se agregó una nueva alternativa"
                    required
                  />
                </Field>
                <SubmitButton variant="outline">Guardar proveedores</SubmitButton>
              </NoticeForm>
            </Card>
          ) : null}

          {canWrite ? (
            <Card>
              <CardHeader
                title={item.active ? "Desactivar producto" : "Reactivar producto"}
                description="Conserva ventas, movimientos, código e historial."
              />
              <NoticeForm
                action={setInventoryItemStatusAction}
                notice="Estado actualizado"
                className="grid gap-3"
              >
                <input type="hidden" name="itemId" value={item.id} />
                <input type="hidden" name="expectedRevision" value={item.revision} />
                <input type="hidden" name="active" value={item.active ? "false" : "true"} />
                <Field label="Motivo">
                  <input className={internalInputClassName} name="changeReason" required />
                </Field>
                <SubmitButton variant="outline">
                  {item.active ? "Desactivar" : "Reactivar"}
                </SubmitButton>
              </NoticeForm>
            </Card>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
