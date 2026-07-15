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
  createInventoryAdjustmentAction
} from "@/features/inventory/actions";
import { inventoryMovementTypeLabels } from "@/features/inventory/labels";
import { formatDateTime } from "@/lib/dates";
import { getInventoryItemById } from "@/modules/database/queries/inventory";
import { requirePermission } from "@/modules/permissions";
import { cn } from "@/lib/cn";

type InventoryItemPageProps = {
  params: Promise<{ itemId: string }>;
};

export default async function InventoryItemPage({ params }: InventoryItemPageProps) {
  await requirePermission("inventory_read");
  const { itemId } = await params;
  const item = await getInventoryItemById(itemId);

  if (!item) notFound();

  const lowStock = item.currentStock <= item.minimumStock;

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[1.5fr_1fr]">
      <MobileBackLink href="/sigeco/inventario" label="Volver a Inventario" />
      <div className="grid gap-4 max-sm:contents">
        <Card className="max-sm:order-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium tabular-nums text-muted">{item.internalCode}</p>
              <h2 className="font-sora text-xl font-bold tracking-tight text-text">{item.name}</h2>
              <p className="mt-0.5 text-sm tabular-nums text-muted">{item.sku ?? "Sin SKU"}</p>
            </div>
            {lowStock ? (
              <Chip tone="warning" dot>
                Stock bajo
              </Chip>
            ) : (
              <Chip tone="success" dot>
                Stock normal
              </Chip>
            )}
          </div>
          <dl className="mt-4 grid gap-x-6 gap-y-2 border-t border-border pt-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                Stock actual
              </dt>
              <dd
                className={cn(
                  "m-0 mt-0.5 text-sm font-semibold tabular-nums",
                  lowStock ? "text-warning" : "text-text"
                )}
              >
                {item.currentStock} {item.unit}
              </dd>
            </div>
            <InfoRow label="Stock mínimo" value={`${item.minimumStock} ${item.unit}`} />
            <InfoRow label="Estado" value={item.active ? "Activo" : "Inactivo"} />
          </dl>
        </Card>

        <Card className="max-sm:order-4 p-0">
          <CardHeader className="mb-0 p-[18px] pb-3" title="Movimientos" />
          <RecordList>
            {item.movements.map((movement) => (
              <RecordItem
                key={movement.id}
                title={inventoryMovementTypeLabels[movement.type]}
                status={
                  <span
                    className={cn(
                      "text-sm font-bold tabular-nums",
                      movement.quantityDelta > 0 ? "text-success" : "text-error"
                    )}
                  >
                    {movement.quantityDelta > 0 ? "+" : ""}
                    {movement.quantityDelta}
                  </span>
                }
              >
                <span className="tabular-nums">
                  Stock después {movement.stockAfter} · {formatDateTime(movement.createdAt)}
                </span>
                <span className="min-w-0 truncate">{movement.reason}</span>
              </RecordItem>
            ))}
            {item.movements.length === 0 ? (
              <RecordListEmpty>
                <span className="text-sm text-muted">Sin movimientos registrados.</span>
              </RecordListEmpty>
            ) : null}
          </RecordList>
          <RecordTable>
            <Table>
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
                    <Td className="font-medium text-text">
                      {inventoryMovementTypeLabels[movement.type]}
                    </Td>
                    <Td
                      className={cn(
                        "text-right font-semibold tabular-nums",
                        movement.quantityDelta > 0 ? "text-success" : "text-error"
                      )}
                    >
                      {movement.quantityDelta > 0 ? "+" : ""}
                      {movement.quantityDelta}
                    </Td>
                    <Td className="text-right tabular-nums">{movement.stockAfter}</Td>
                    <Td className="tabular-nums">{formatDateTime(movement.createdAt)}</Td>
                    <Td className="max-w-[240px] truncate">{movement.reason}</Td>
                  </Tr>
                ))}
                {item.movements.length === 0 ? (
                  <tr>
                    <Td className="py-6 text-center" colSpan={5}>
                      Sin movimientos registrados.
                    </Td>
                  </tr>
                ) : null}
              </tbody>
            </Table>
          </RecordTable>
        </Card>
      </div>

      <div className="grid gap-4 max-sm:contents">
        <Card className="max-sm:order-2">
          <CardHeader title="Entrada de stock" />
          <NoticeForm action={addInventoryEntryAction} notice="Entrada registrada" className="grid gap-3">
            <input type="hidden" name="itemId" value={item.id} />
            <Field label="Cantidad">
              <input className={internalInputClassName} name="quantity" inputMode="numeric" required />
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

        <Card className="max-sm:order-3">
          <CardHeader title="Ajuste autorizado" />
          <NoticeForm action={createInventoryAdjustmentAction} notice="Ajuste registrado" className="grid gap-3">
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
      </div>
    </div>
  );
}
