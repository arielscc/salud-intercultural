import { notFound } from "next/navigation";
import type { SaleItemType } from "@/generated/prisma/client";
import { ConfirmForm } from "@/components/internal/ConfirmForm";
import { MobileBackLink } from "@/components/internal/MobileBackLink";
import { Field, internalInputClassName } from "@/components/internal/Field";
import { VisitStatusPill } from "@/components/internal/StatusPill";
import { SubmitButton } from "@/components/internal/SubmitButton";
import { Card, CardHeader } from "@/components/internal/ui/Card";
import { DesktopDetailContext } from "@/components/internal/ui/DesktopDetailContext";
import { TimelineItem } from "@/components/internal/ui/TimelineItem";
import { createSaleAction } from "@/features/sales/actions";
import {
  formatMoney,
  paymentMethodLabels,
  saleItemTypeLabels,
  saleStatusLabels
} from "@/features/sales/labels";
import { applyVisitFlowAction } from "@/features/visits/actions";
import { isActiveVisitStatus } from "@/features/visits/schemas/visit.schema";
import { getInventoryItems } from "@/modules/database/queries/inventory";
import { getAdministrationWorkItemById } from "@/modules/database/queries/sales";
import { requirePermission } from "@/modules/permissions";

const saleItemTypeOptions = Object.entries(saleItemTypeLabels) as Array<[SaleItemType, string]>;
const paymentMethodOptions = Object.entries(paymentMethodLabels);

type AdministrationWorkItemPageProps = {
  params: Promise<{ workItemId: string }>;
  searchParams: Promise<{
    error?: string;
    product?: string;
    available?: string;
    requested?: string;
  }>;
};

export default async function AdministrationWorkItemPage({
  params,
  searchParams
}: AdministrationWorkItemPageProps) {
  await requirePermission("sales_read");
  const { workItemId } = await params;
  const query = await searchParams;
  const [item, inventoryItems] = await Promise.all([
    getAdministrationWorkItemById(workItemId),
    getInventoryItems({ pageSize: 100 })
  ]);

  if (!item) notFound();

  const patient = item.visit.patient;
  const order = item.clinicalOrders[0];

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[1.5fr_1fr]">
      <MobileBackLink href="/sigeco/administracion" label="Volver a Caja" />
      <div className="grid gap-4 max-sm:contents">
        {query.error === "insufficient-stock" ? (
          <div
            className="rounded-[9px] border border-error/30 bg-error/10 px-4 py-3 text-sm text-error"
            role="alert"
          >
            <p className="font-semibold">No hay stock suficiente para completar la venta.</p>
            <p className="mt-1">
              {query.product ?? "Producto"}: disponible {query.available ?? "0"}, solicitado{" "}
              {query.requested ?? "-"}. La venta no fue creada ni se registró ningún cobro.
            </p>
          </div>
        ) : null}
        {query.error === "invalid-sale" ? (
          <div
            className="rounded-[9px] border border-error/30 bg-error/10 px-4 py-3 text-sm text-error"
            role="alert"
          >
            Revisa los datos de la venta. La descripción, cantidad y precio son obligatorios.
          </div>
        ) : null}
        <Card className="max-sm:order-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium tabular-nums text-muted">{patient.internalCode}</p>
              <h2 className="font-sora text-xl font-bold tracking-tight text-text">
                {patient.fullName}
              </h2>
              <p className="mt-0.5 text-sm tabular-nums text-muted">{patient.phone}</p>
            </div>
            <VisitStatusPill status={item.visit.status} />
          </div>
          <div className="mt-4 rounded-[9px] border border-border bg-background p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
              Pendiente administrativo
            </p>
            <p className="mt-0.5 text-sm font-semibold text-text">{order?.title ?? item.title}</p>
            {order?.details ?? item.description ? (
              <p className="mt-1 text-sm text-muted">{order?.details ?? item.description}</p>
            ) : null}
          </div>
        </Card>

        <Card className="max-sm:order-2">
          <CardHeader title="Registrar venta" />
          <form action={createSaleAction} className="grid gap-3">
            <input type="hidden" name="patientId" value={patient.id} />
            <input type="hidden" name="visitId" value={item.visit.id} />
            <input type="hidden" name="workItemId" value={item.id} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Tipo">
                <select
                  className={internalInputClassName}
                  name="itemType"
                  defaultValue={order?.type === "study" ? "study" : "service"}
                >
                  {saleItemTypeOptions.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Producto inventariable">
                <select className={internalInputClassName} name="inventoryItemId" defaultValue="">
                  <option value="">No descontar inventario</option>
                  {inventoryItems.map((inventoryItem) => (
                    <option key={inventoryItem.id} value={inventoryItem.id}>
                      {inventoryItem.name} · Stock {inventoryItem.currentStock}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Descripción">
              <input
                className={internalInputClassName}
                name="description"
                defaultValue={order?.title ?? item.title}
                required
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Cantidad">
                <input
                  className={internalInputClassName}
                  name="quantity"
                  inputMode="numeric"
                  defaultValue="1"
                  required
                />
              </Field>
              <Field label="Precio unitario Bs">
                <input
                  className={internalInputClassName}
                  name="unitPrice"
                  inputMode="decimal"
                  placeholder="0.00"
                  required
                />
              </Field>
              <Field label="Descuento Bs">
                <input
                  className={internalInputClassName}
                  name="discount"
                  inputMode="decimal"
                  placeholder="0.00"
                />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Cobro inicial Bs">
                <input
                  className={internalInputClassName}
                  name="initialPayment"
                  inputMode="decimal"
                  placeholder="0.00"
                />
              </Field>
              <Field label="Forma de pago">
                <select className={internalInputClassName} name="paymentMethodCode" defaultValue="cash">
                  {paymentMethodOptions.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Referencia">
              <input className={internalInputClassName} name="paymentReference" />
            </Field>
            <Field label="Notas">
              <textarea className={`${internalInputClassName} min-h-20 py-3`} name="notes" />
            </Field>
            <div className="flex justify-end border-t border-border pt-4">
              <SubmitButton>Crear venta</SubmitButton>
            </div>
          </form>
        </Card>
      </div>

      <div className="grid gap-4 max-sm:contents xl:sticky xl:top-0 xl:max-h-[calc(100dvh-6.5rem)] xl:overflow-y-auto xl:overscroll-contain xl:pr-1">
        <DesktopDetailContext
          eyebrow={patient.internalCode}
          title={patient.fullName}
          meta={patient.phone}
          status={<VisitStatusPill status={item.visit.status} />}
        />
        {isActiveVisitStatus(item.visit.status) ? (
          <Card className="max-sm:order-3">
            <CardHeader
              title="Salida del paciente"
              description="Cuando el paciente ya pagó o solo vino a comprar, cierra la visita aquí."
            />
            <div className="grid gap-2">
              <ConfirmForm
                action={applyVisitFlowAction}
                notice="Visita cerrada"
                confirmTitle="Cerrar visita"
                confirmDescription={`La visita de ${patient.fullName} quedará completada y saldrá de las bandejas activas. Esta acción no se puede deshacer.`}
                confirmLabel="Cerrar visita"
              >
                <input type="hidden" name="visitId" value={item.visit.id} />
                <input type="hidden" name="flow" value="complete" />
                <input type="hidden" name="note" value="Visita cerrada desde administración" />
                <SubmitButton variant="outline" className="w-full">
                  Cerrar visita
                </SubmitButton>
              </ConfirmForm>
              <ConfirmForm
                action={applyVisitFlowAction}
                notice="Retiro registrado"
                confirmTitle="Marcar retiro"
                confirmDescription={`La visita de ${patient.fullName} se cerrará como retiro sin atención completa. Esta acción no se puede deshacer.`}
                confirmLabel="Marcar retiro"
              >
                <input type="hidden" name="visitId" value={item.visit.id} />
                <input type="hidden" name="flow" value="left" />
                <SubmitButton
                  variant="outline"
                  className="w-full border-error/30 text-error hover:border-error/50 hover:text-error"
                >
                  Se retiró sin completar
                </SubmitButton>
              </ConfirmForm>
            </div>
          </Card>
        ) : null}

        <Card className="max-sm:order-4">
          <CardHeader title="Ventas de esta tarea" />
          <div className="grid gap-0">
            {item.sales.map((sale) => (
              <TimelineItem
                key={sale.id}
                title={
                  <a
                    href={`/sigeco/administracion/ventas/${sale.id}`}
                    className="focus-ring rounded-[7px] tabular-nums hover:text-primary-dark hover:underline"
                  >
                    {formatMoney(sale.totalCents)}
                  </a>
                }
                aside={saleStatusLabels[sale.status]}
                body={<span className="tabular-nums">Saldo: {formatMoney(sale.balanceCents)}</span>}
              />
            ))}
            {item.sales.length === 0 ? (
              <p className="py-2 text-sm text-muted">Sin ventas registradas para esta tarea.</p>
            ) : null}
          </div>
        </Card>
      </div>
    </div>
  );
}
