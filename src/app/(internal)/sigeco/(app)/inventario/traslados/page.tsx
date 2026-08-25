import { randomUUID } from "node:crypto";
import Link from "next/link";
import { ArrowLeftRight } from "lucide-react";
import { Field, internalInputClassName } from "@/components/internal/Field";
import { SubmitButton } from "@/components/internal/SubmitButton";
import { buttonVariants } from "@/components/internal/ui/Button";
import { Card, CardHeader } from "@/components/internal/ui/Card";
import { PageHeader } from "@/components/internal/ui/PageHeader";
import { Table, Td, Th, Tr } from "@/components/internal/ui/Table";
import { getBranchContext } from "@/features/branches/context";
import { createInventoryTransferAction } from "@/features/branches/transfer-actions";
import { roleHasPermission } from "@/features/internal-auth/permissions";
import { formatDateOnly, formatDateTime } from "@/lib/dates";
import {
  getInventoryItems,
  getInventoryTransfers
} from "@/modules/database/queries/inventory";
import { requirePermission } from "@/modules/permissions";

export default async function InventoryTransfersPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; aviso?: string }>;
}) {
  const user = await requirePermission("inventory_read", { module: "inventario" });
  const { activeBranch, branches } = await getBranchContext(user);
  const query = await searchParams;
  const canWrite = roleHasPermission(user.role, "inventory_write");
  const activeDestinations = branches.filter(
    (branch) =>
      branch.assigned && branch.status === "active" && branch.code !== activeBranch.code
  );
  const [items, transfers] = await Promise.all([
    getInventoryItems({
      branchCode: activeBranch.code,
      status: "active",
      pageSize: 200
    }),
    getInventoryTransfers(activeBranch.code)
  ]);

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Traslados entre sucursales"
        description={`La salida de ${activeBranch.name} y la entrada de destino se guardan juntas.`}
        actions={
          <Link href="/sigeco/inventario" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Volver al inventario
          </Link>
        }
      />

      {query.aviso === "transfer-created" ? (
        <div className="rounded-[9px] border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
          Traslado registrado con su salida y entrada enlazadas.
        </div>
      ) : null}
      {query.error ? (
        <div className="rounded-[9px] border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
          No se registró el traslado. Revisa la sucursal, el producto y la cantidad disponible.
        </div>
      ) : null}

      {canWrite && activeDestinations.length > 0 ? (
        <Card>
          <CardHeader
            title="Nuevo traslado"
            description="El stock se descuenta del origen y se suma al destino en una sola operación."
          />
          <form action={createInventoryTransferAction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <input type="hidden" name="sourceBranchCode" value={activeBranch.code} />
            <input type="hidden" name="idempotencyKey" value={randomUUID()} />
            <Field label="Producto">
              <select className={internalInputClassName} name="itemId" required>
                <option value="">Selecciona</option>
                {items.filter((item) => item.currentStock > 0).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} · disponible {item.currentStock}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Sucursal destino">
              <select className={internalInputClassName} name="destinationBranchCode" required>
                <option value="">Selecciona</option>
                {activeDestinations.map((branch) => (
                  <option key={branch.code} value={branch.code}>{branch.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Cantidad">
              <input className={internalInputClassName} name="quantity" type="number" min="1" inputMode="numeric" required />
            </Field>
            <Field label="Ubicación en destino">
              <input
                className={internalInputClassName}
                name="destinationLocationCode"
                placeholder="Ej.: Estante A"
                minLength={2}
                required
              />
            </Field>
            <Field label="Motivo">
              <input className={internalInputClassName} name="reason" minLength={3} required />
            </Field>
            <div className="sm:col-span-2 lg:col-span-5">
              <SubmitButton pendingLabel="Registrando traslado…">
                <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
                Registrar traslado
              </SubmitButton>
            </div>
          </form>
        </Card>
      ) : (
        <Card>
          <CardHeader
            title="Traslados todavía bloqueados"
            description="Cochabamba está en preparación. La opción se habilitará cuando Dirección active esa sede y asigne al personal correspondiente."
          />
        </Card>
      )}

      <Card className="overflow-hidden p-0">
        <CardHeader className="p-[18px] pb-3" title="Historial enlazado" description="Cada fila conserva origen, destino, responsable y las dos operaciones de stock." />
        <div className="overflow-x-auto">
          <Table caption="Traslados de inventario entre sucursales">
            <thead><tr><Th>Traslado</Th><Th>Producto</Th><Th>Ruta</Th><Th>Lotes trasladados</Th><Th>Cantidad</Th><Th>Responsable</Th><Th>Fecha</Th></tr></thead>
            <tbody>
              {transfers.map((transfer) => (
                <Tr key={transfer.id}>
                  <Td className="font-mono text-xs">{transfer.transferNumber}</Td>
                  <Td className="font-semibold text-text">{transfer.item.name}</Td>
                  <Td>{transfer.sourceBranch.name} → {transfer.destinationBranch.name}</Td>
                  <Td>
                    {transfer.lotAllocations.length > 0 ? (
                      <div className="grid gap-1 text-xs">
                        {transfer.lotAllocations.map((allocation) => (
                          <span key={allocation.id}>
                            {allocation.sourceLot.batchNumber ?? allocation.sourceLot.internalLotCode}
                            {allocation.destinationLot.expirationDate
                              ? ` · vence ${formatDateOnly(allocation.destinationLot.expirationDate)}`
                              : " · sin vencimiento"}
                            {` · ${allocation.quantity} a ${allocation.destinationLot.locationCode}`}
                          </span>
                        ))}
                        {transfer.quantity - transfer.lotAllocations.reduce(
                          (total, allocation) => total + allocation.quantity,
                          0
                        ) > 0 ? (
                          <span>
                            Stock anterior sin lote · {transfer.quantity - transfer.lotAllocations.reduce(
                              (total, allocation) => total + allocation.quantity,
                              0
                            )} a {transfer.lotAllocations[0]?.destinationLot.locationCode}
                          </span>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-xs text-muted">Stock anterior sin lote</span>
                    )}
                  </Td>
                  <Td className="tabular-nums">{transfer.quantity} {transfer.item.unit}</Td>
                  <Td>{transfer.createdBy.name ?? transfer.createdBy.email}</Td>
                  <Td>{formatDateTime(transfer.createdAt)}</Td>
                </Tr>
              ))}
              {transfers.length === 0 ? <tr><Td colSpan={7} className="py-8 text-center text-muted">Todavía no hay traslados.</Td></tr> : null}
            </tbody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
