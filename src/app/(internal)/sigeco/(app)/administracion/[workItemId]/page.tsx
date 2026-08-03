import { randomUUID } from "node:crypto";
import { notFound } from "next/navigation";
import type { SaleItemType } from "@/generated/prisma/client";
import { ConfirmForm } from "@/components/internal/ConfirmForm";
import { NoticeForm } from "@/components/internal/NoticeForm";
import { MobileBackLink } from "@/components/internal/MobileBackLink";
import { PaymentMethodChips } from "@/components/internal/PaymentMethodChips";
import { Field, internalInputClassName } from "@/components/internal/Field";
import { VisitStatusPill } from "@/components/internal/StatusPill";
import { SubmitButton } from "@/components/internal/SubmitButton";
import { Card, CardHeader } from "@/components/internal/ui/Card";
import { AreaTimeControl } from "@/components/internal/area-times/AreaTimeControl";
import { Chip } from "@/components/internal/ui/Chip";
import { DesktopDetailContext } from "@/components/internal/ui/DesktopDetailContext";
import { FormActions } from "@/components/internal/ui/FormActions";
import { TimelineItem } from "@/components/internal/ui/TimelineItem";
import { VisitDiscontinuationForm } from "@/components/internal/visit-discontinuations/VisitDiscontinuationForm";
import {
  confirmDoctorOrderSaleAction,
  createPaymentAction,
  createSaleAction,
  sendPaidStudiesToNursingAction
} from "@/features/sales/actions";
import { DoctorOrderConfirmPanel } from "@/features/doctor-orders/components/DoctorOrderConfirmPanel";
import { doctorOrderStatusLabels } from "@/features/doctor-orders/labels";
import {
  formatMoney,
  saleItemTypeLabels,
  saleStatusLabels
} from "@/features/sales/labels";
import { applyVisitFlowAction } from "@/features/visits/actions";
import { isActiveVisitStatus } from "@/features/visits/schemas/visit.schema";
import { roleHasPermission } from "@/features/internal-auth/permissions";
import { getInventoryItems } from "@/modules/database/queries/inventory";
import { getAdministrationWorkItemById } from "@/modules/database/queries/sales";
import { getVisitAreaTimingState } from "@/modules/database/queries/area-times";
import { requirePermission } from "@/modules/permissions";
import { getBranchContext } from "@/features/branches/context";

const saleItemTypeOptions = Object.entries(saleItemTypeLabels) as Array<[SaleItemType, string]>;

type AdministrationWorkItemPageProps = {
  params: Promise<{ workItemId: string }>;
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function AdministrationWorkItemPage({
  params,
  searchParams
}: AdministrationWorkItemPageProps) {
  const user = await requirePermission("sales_read");
  const { activeBranch } = await getBranchContext(user);
  const { workItemId } = await params;
  const query = await searchParams;
  const [item, inventoryItems] = await Promise.all([
    getAdministrationWorkItemById(workItemId),
    getInventoryItems({
      pageSize: 100,
      status: "active",
      usage: "sale",
      branchCode: activeBranch.code
    })
  ]);

  if (!item) notFound();
  if (item.visit.branchCode !== activeBranch.code) notFound();
  const areaTiming = await getVisitAreaTimingState(item.visit.id);

  const patient = item.visit.patient;
  const order = item.clinicalOrders[0];
  const proposalOutcome = order?.treatmentProposalOutcome;
  const doctorOrder = item.visit.doctorOrder;
  const generatedSale = item.sales[0];
  const isPaidStudyOrder = Boolean(generatedSale && item.clinicalOrders.some((entry) => entry.type === "study"));
  const canRecordDiscontinuation = roleHasPermission(
    user.role,
    "visit_discontinuations_write"
  );

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
              Revisa las existencias del producto. La venta no fue creada ni se registró
              ningún cobro.
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
        {query.error === "unavailable-product" ? (
          <div
            className="rounded-[9px] border border-error/30 bg-error/10 px-4 py-3 text-sm text-error"
            role="alert"
          >
            El producto ya no está activo o no está habilitado para venta. Elige otro producto.
          </div>
        ) : null}
        {query.error === "not-submitted" ||
        query.error === "empty-order" ||
        query.error === "discount-over-cap" ? (
          <div
            className="rounded-[9px] border border-error/30 bg-error/10 px-4 py-3 text-sm text-error"
            role="alert"
          >
            {query.error === "discount-over-cap"
              ? "El descuento del pedido supera el tope permitido. Pide al médico que lo ajuste."
              : query.error === "empty-order"
                ? "El pedido no tiene líneas. Pide al médico que lo complete."
                : "El pedido ya no está disponible para confirmar (revisa su estado)."}
          </div>
        ) : null}
        {query.error === "cash-session-required" ? (
          <div
            className="rounded-[9px] border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning"
            role="alert"
          >
            <p className="font-semibold">Primero debes abrir la Caja de hoy.</p>
            <p className="mt-1">
              No se registró ningún cobro. Abre una sesión en “Control de Caja” y vuelve a intentar.
            </p>
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
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                Pendiente administrativo
              </p>
              {proposalOutcome ? (
                <Chip tone="success" dot>
                  Aceptado por el paciente
                </Chip>
              ) : null}
            </div>
            <p className="mt-0.5 text-sm font-semibold text-text">{order?.title ?? item.title}</p>
            {order?.details ?? item.description ? (
              <p className="mt-1 text-sm text-muted">{order?.details ?? item.description}</p>
            ) : null}
            {proposalOutcome ? (
              <p className="mt-2 text-xs text-muted">
                Instrucción confirmada por el médico. La venta todavía debe
                registrarse en esta pantalla.
              </p>
            ) : null}
          </div>
        </Card>

        {query.error === "pago-pendiente" ? (
          <div className="rounded-[9px] border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning" role="alert">
            Debes registrar el pago completo antes de enviar al paciente a Enfermería.
          </div>
        ) : null}

        {isPaidStudyOrder && generatedSale ? (
          <Card className="max-sm:order-2">
            <CardHeader
              title="Cobro de estudios solicitados"
              description={`Cuenta generada desde Consulta · Total: ${formatMoney(generatedSale.totalCents)} · Saldo: ${formatMoney(generatedSale.balanceCents)}`}
            />
            {generatedSale.balanceCents > 0 ? (
              <NoticeForm action={createPaymentAction} notice="Cobro registrado" className="grid gap-3">
                <input type="hidden" name="idempotencyKey" value={randomUUID()} />
                <input type="hidden" name="saleId" value={generatedSale.id} />
                <input type="hidden" name="workItemId" value={item.id} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Monto Bs">
                    <input className={internalInputClassName} name="amount" inputMode="decimal" defaultValue={(generatedSale.balanceCents / 100).toFixed(2)} required />
                  </Field>
                  <PaymentMethodChips />
                </div>
                <Field label="Referencia"><input className={internalInputClassName} name="reference" /></Field>
                <SubmitButton>Registrar pago completo</SubmitButton>
              </NoticeForm>
            ) : (
              <NoticeForm action={sendPaidStudiesToNursingAction} notice="Paciente enviado a Enfermería">
                <input type="hidden" name="workItemId" value={item.id} />
                <SubmitButton className="w-full">Pago confirmado · Enviar a Enfermería</SubmitButton>
              </NoticeForm>
            )}
          </Card>
        ) : doctorOrder?.status === "submitted" ? (
          <Card className="max-sm:order-2">
            <CardHeader
              title="Confirmar pedido del médico"
              description="Revisa las líneas, valida el descuento pedido por el paciente y crea la venta. No se cobra sin confirmar."
              action={
                <Chip tone="primary" dot>
                  {doctorOrderStatusLabels[doctorOrder.status]}
                </Chip>
              }
            />
            <DoctorOrderConfirmPanel
              action={confirmDoctorOrderSaleAction}
              orderId={doctorOrder.id}
              workItemId={item.id}
              patientName={patient.fullName}
              doctorName={
                doctorOrder.doctor?.name ?? doctorOrder.doctor?.email ?? "Médico"
              }
              indications={doctorOrder.indications}
              lines={doctorOrder.lines.map((line) => ({
                id: line.id,
                source: line.source,
                description: line.description,
                quantity: line.quantity,
                unitPriceCents: line.unitPriceCents,
                discountCents: line.discountCents,
                maxDiscountCents: line.maxDiscountCents
              }))}
            />
          </Card>
        ) : (
        <Card className="max-sm:order-2">
          <CardHeader
            title="Registrar venta o servicio"
            description="Detalla el concepto, calcula el importe y registra el cobro inicial."
          />
          <form action={createSaleAction} className="grid gap-3">
            <input type="hidden" name="idempotencyKey" value={randomUUID()} />
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
                      {inventoryItem.name} · Stock {inventoryItem.currentStock} · Bs{" "}
                      {(inventoryItem.salePriceCents / 100).toFixed(2)}
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
              <PaymentMethodChips />
            </div>
            <Field label="Referencia">
              <input className={internalInputClassName} name="paymentReference" />
            </Field>
            <Field label="Notas">
              <textarea className={`${internalInputClassName} min-h-20 py-3`} name="notes" />
            </Field>
            <FormActions className="justify-end">
              <SubmitButton>Crear venta</SubmitButton>
            </FormActions>
          </form>
        </Card>
        )}
      </div>

      <div className="grid gap-4 max-sm:contents xl:sticky xl:top-0 xl:max-h-[calc(100dvh-6.5rem)] xl:overflow-y-auto xl:overscroll-contain xl:pr-1">
        <DesktopDetailContext
          eyebrow={patient.internalCode}
          title={patient.fullName}
          meta={patient.phone}
          status={<VisitStatusPill status={item.visit.status} />}
        />
        {areaTiming?.area === "administracion" &&
        roleHasPermission(user.role, "area_time_write") ? (
          <AreaTimeControl state={areaTiming} compact />
        ) : null}
        {isActiveVisitStatus(item.visit.status) && !isPaidStudyOrder ? (
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
              {canRecordDiscontinuation ? (
                <VisitDiscontinuationForm
                  visitId={item.visit.id}
                  patientName={patient.fullName}
                  defaultPendingTypes={[
                    ...(item.sales.some((sale) => sale.balanceCents > 0) ||
                    item.sales.length === 0
                      ? (["payment"] as const)
                      : []),
                    ...(item.sales.some((sale) =>
                      sale.items.some((saleItem) => !saleItem.delivered)
                    )
                      ? (["delivery"] as const)
                      : [])
                  ]}
                  compact
                />
              ) : null}
            </div>
          </Card>
        ) : null}

        <Card className="max-sm:order-4">
          <CardHeader
            title="Ventas asociadas a la tarea"
            description="Comprobantes, estado de pago y saldo pendiente de esta atención."
          />
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
