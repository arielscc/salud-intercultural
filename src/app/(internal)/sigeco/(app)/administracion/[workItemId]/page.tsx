import { randomUUID } from "node:crypto";
import { notFound } from "next/navigation";
import { Printer } from "lucide-react";
import type { ClinicalOrderType, SaleItemType } from "@/generated/prisma/client";
import { AreaTimeInline } from "@/components/internal/area-times/AreaTimeInline";
import { ConfirmForm } from "@/components/internal/ConfirmForm";
import { NoticeForm } from "@/components/internal/NoticeForm";
import { MobileBackLink } from "@/components/internal/MobileBackLink";
import { PaymentMethodChips } from "@/components/internal/PaymentMethodChips";
import { Field, internalInputClassName } from "@/components/internal/Field";
import { VisitStatusPill } from "@/components/internal/StatusPill";
import { SubmitButton } from "@/components/internal/SubmitButton";
import { buttonVariants } from "@/components/internal/ui/Button";
import { Card, CardHeader } from "@/components/internal/ui/Card";
import { StaleCashSessionModal } from "@/components/internal/cash/StaleCashSessionModal";
import { Chip } from "@/components/internal/ui/Chip";
import { FormActions } from "@/components/internal/ui/FormActions";
import { VisitDiscontinuationForm } from "@/components/internal/visit-discontinuations/VisitDiscontinuationForm";
import {
  applySaleDiscountAction,
  confirmDoctorOrderSaleAction,
  createPaymentAction,
  createSaleAction,
  sendPaidStudiesToNursingAction
} from "@/features/sales/actions";
import { SaleDiscountForm } from "@/features/sales/components/SaleDiscountForm";
import { PatientSalesHistory } from "@/features/sales/components/PatientSalesHistory";
import {
  AdministrativeRequestSummary,
  type RequestedItem,
  type RequestSource
} from "@/features/sales/components/AdministrativeRequestSummary";
import { OpenCashSessionCallout } from "@/features/cash/components/OpenCashSessionCallout";
import { cashErrorMessages } from "@/features/cash/labels";
import { DoctorOrderConfirmPanel } from "@/features/doctor-orders/components/DoctorOrderConfirmPanel";
import { doctorOrderStatusLabels } from "@/features/doctor-orders/labels";
import { clinicalOrderTypeLabels } from "@/features/clinical-care/labels";
import { internalRoleLabels } from "@/features/internal-auth/permissions";
import {
  formatMoney,
  saleItemTypeLabels,
  saleStatusLabels
} from "@/features/sales/labels";
import { applyVisitFlowAction } from "@/features/visits/actions";
import { isActiveVisitStatus } from "@/features/visits/schemas/visit.schema";
import { roleHasPermission } from "@/features/internal-auth/permissions";
import { getInventoryItems } from "@/modules/database/queries/inventory";
import { getVisitAreaTimingState } from "@/modules/database/queries/area-times";
import {
  getAdministrationWorkItemById,
  getPatientSales
} from "@/modules/database/queries/sales";
import { requirePermission } from "@/modules/permissions";
import { getBranchContext } from "@/features/branches/context";

const saleItemTypeOptions = Object.entries(saleItemTypeLabels) as Array<[SaleItemType, string]>;

// Une el tipo de la orden clinica con las claves que usa el resumen para elegir
// su encabezado (las mismas que `SaleItemType`, que es la fuente preferida).
const clinicalOrderKindKeys: Record<ClinicalOrderType, string> = {
  study: "study",
  nursing_application: "service",
  serum: "serum",
  medication: "medication",
  vital_signs: "other",
  administration: "other",
  follow_up: "other",
  other: "other"
};

type AdministrationWorkItemPageProps = {
  params: Promise<{ workItemId: string }>;
  searchParams: Promise<{
    error?: string;
    aviso?: string;
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

  const patient = item.visit.patient;
  const [patientSales, areaTiming] = await Promise.all([
    getPatientSales(patient.id),
    getVisitAreaTimingState(item.visit.id)
  ]);
  const administrationAreaTiming =
    areaTiming?.area === "administracion" &&
    roleHasPermission(user.role, "area_time_write")
      ? areaTiming
      : null;
  const order = item.clinicalOrders[0];
  const proposalOutcome = order?.treatmentProposalOutcome;
  const doctorOrder = item.visit.doctorOrder;
  // Total definido por el médico (base editable − descuento libre). Se calcula en
  // el servidor; a Administración solo le llega el total, no los costos por producto.
  const doctorOrderTotalCents = doctorOrder
    ? (() => {
        const lineSum = doctorOrder.lines.reduce(
          (sum, line) => sum + line.unitPriceCents * line.quantity,
          0
        );
        const base = doctorOrder.chargeBaseCents ?? lineSum;
        const discount = Math.min(Math.max(0, doctorOrder.orderDiscountCents), base);
        return Math.max(0, base - discount);
      })()
    : 0;
  const doctorOrderSale = doctorOrder
    ? item.sales.find((sale) => sale.doctorOrderId === doctorOrder.id)
    : undefined;
  const generatedSale = item.sales[0];
  const isPaidStudyOrder = Boolean(
    generatedSale &&
      item.clinicalOrders.some(
        (entry) => entry.type === "study" || entry.type === "nursing_application"
      )
  );
  const canRecordDiscontinuation = roleHasPermission(
    user.role,
    "visit_discontinuations_write"
  );
  // Lo que se le pidio cancelar al paciente, de la fuente mas precisa que exista:
  // la venta ya creada, el pedido del medico todavia sin confirmar o, si no hay
  // ninguna, las ordenes clinicas que originaron el pendiente.
  const requestedSource: RequestSource = generatedSale?.items.length
    ? "sale"
    : doctorOrder?.lines.length
      ? "doctor_order"
      : "clinical_order";
  const requestedItems: RequestedItem[] = generatedSale?.items.length
    ? generatedSale.items.map((saleItem) => ({
        id: saleItem.id,
        label: saleItem.description,
        typeLabel: saleItemTypeLabels[saleItem.type],
        kind: saleItem.type,
        quantity: saleItem.quantity
      }))
    : doctorOrder?.lines.length
      ? doctorOrder.lines.map((line) => ({
          id: line.id,
          label: line.description,
          typeLabel: saleItemTypeLabels[line.itemType],
          kind: line.itemType,
          quantity: line.quantity,
          detail: line.sessionCount ? `${line.sessionCount} sesiones` : line.notes
        }))
      : item.clinicalOrders.map((clinicalOrder) => ({
          id: clinicalOrder.id,
          label: clinicalOrder.title,
          typeLabel: clinicalOrderTypeLabels[clinicalOrder.type],
          kind: clinicalOrderKindKeys[clinicalOrder.type],
          quantity: 1
        }));
  // Errores de Caja: `cash-session-required` ya lo explica el aviso de apertura y
  // `cash-session-stale-open` tiene su propio modal; el resto viene del formulario
  // de apertura lanzado desde esta misma pantalla.
  const cashError = query.error && query.error in cashErrorMessages ? query.error : null;
  const cashOpenMessage =
    cashError && cashError !== "cash-session-required" && cashError !== "cash-session-stale-open"
      ? cashErrorMessages[cashError]
      : null;
  const requester = item.createdBy ?? order?.doctor ?? null;
  const requestedBy = requester
    ? {
        name: requester.name ?? requester.email,
        roleLabel: internalRoleLabels[requester.role]
      }
    : doctorOrder?.doctor
      ? {
          name: doctorOrder.doctor.name ?? doctorOrder.doctor.email,
          roleLabel: internalRoleLabels.medico
        }
      : null;

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[1.5fr_1fr]">
      <MobileBackLink href="/sigeco/administracion" label="Volver a Caja" />
      <div className="grid gap-4 max-sm:contents">
        {query.aviso === "venta-creada" ? (
          <div
            className="rounded-[9px] border border-success/30 bg-success/10 px-4 py-3 text-sm text-text max-sm:order-1"
            role="status"
          >
            Venta creada desde el pedido del médico. Si incluye suero o servicio, cóbralo y
            la visita se cerrará al quedar saldado.
          </div>
        ) : null}
        {query.aviso === "descuento-aplicado" ? (
          <div
            className="rounded-[9px] border border-success/30 bg-success/10 px-4 py-3 text-sm text-text max-sm:order-1"
            role="status"
          >
            Descuento aplicado. Revisa el nuevo total y saldo antes de cobrar.
          </div>
        ) : null}
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
        {query.aviso === "cash-session-opened" ? (
          <div
            className="rounded-[9px] border border-success/30 bg-success/10 px-4 py-3 text-sm text-text max-sm:order-1"
            role="status"
          >
            Caja abierta. Ya puedes registrar el cobro de este pendiente.
          </div>
        ) : null}
        {cashOpenMessage ? (
          <div
            className="rounded-[9px] border border-error/30 bg-error/10 px-4 py-3 text-sm text-error max-sm:order-1"
            role="alert"
          >
            <p className="font-semibold">No se pudo abrir la Caja.</p>
            <p className="mt-1">{cashOpenMessage}</p>
          </div>
        ) : null}
        <OpenCashSessionCallout
          user={user}
          branch={activeBranch}
          returnTo={`/sigeco/administracion/${item.id}`}
          blocked={Boolean(cashError) && cashError !== "cash-session-stale-open"}
          className="max-sm:order-1"
        />
        {query.error === "cash-session-stale-open" ? <StaleCashSessionModal /> : null}
        <Card className="max-sm:order-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium tabular-nums text-muted">{patient.internalCode}</p>
              <h2 className="font-sora text-xl font-bold tracking-tight text-text">
                {patient.fullName}
              </h2>
              <p className="mt-0.5 text-sm tabular-nums text-muted">{patient.phone}</p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <VisitStatusPill status={item.visit.status} />
              {administrationAreaTiming ? (
                <AreaTimeInline state={administrationAreaTiming} />
              ) : null}
            </div>
          </div>
          <AdministrativeRequestSummary
            items={requestedItems}
            source={requestedSource}
            requestedBy={requestedBy}
            requestedAt={item.createdAt}
            note={order?.details ?? doctorOrder?.indications ?? null}
            accepted={Boolean(proposalOutcome)}
            fallbackTitle={order?.title ?? item.title}
          />
          {proposalOutcome ? (
            <p className="mt-2 text-xs text-muted">
              Instrucción confirmada por el médico. La venta todavía debe
              registrarse en esta pantalla.
            </p>
          ) : null}
        </Card>

        {query.error === "pago-pendiente" ? (
          <div className="rounded-[9px] border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning" role="alert">
            Debes registrar el pago completo antes de cerrar esta atención.
          </div>
        ) : null}
        {query.error === "not-confirmed" ||
        query.error === "no-nursing-services" ||
        query.error === "invalid-order" ? (
          <div
            className="rounded-[9px] border border-error/30 bg-error/10 px-4 py-3 text-sm text-error"
            role="alert"
          >
            {query.error === "no-nursing-services"
              ? "Este pedido no tiene suero ni servicios que se ejecuten en Enfermería."
              : "El pedido todavía no está confirmado; primero crea y cobra la venta."}
          </div>
        ) : null}

        {isPaidStudyOrder && generatedSale ? (
          <Card className="max-sm:order-2">
            <CardHeader
              title="Cobro de estudios / servicios"
              description="Derivado a Enfermería (pago previo). Cobra el saldo y envía al paciente a Enfermería."
              action={
                <a
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                  href={`/sigeco/api/sales/${generatedSale.id}/recibo?purpose=print`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Printer className="h-4 w-4" aria-hidden="true" />
                  Imprimir recibo
                </a>
              }
            />

            <div className="rounded-[9px] border border-border bg-background p-3 text-sm">
              <dl className="grid gap-1.5 tabular-nums">
                <div className="flex justify-between gap-2">
                  <dt className="text-muted">Total</dt>
                  <dd className="text-text">{formatMoney(generatedSale.totalCents)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted">Pagado</dt>
                  <dd className="text-text">{formatMoney(generatedSale.paidCents)}</dd>
                </div>
                <div className="flex justify-between gap-2 border-t border-border pt-1.5 font-bold text-text">
                  <dt>Saldo</dt>
                  <dd>{formatMoney(generatedSale.balanceCents)}</dd>
                </div>
              </dl>
              <p className="mt-2 text-xs text-muted">
                El detalle de costos por producto es de uso exclusivo del médico.
              </p>
            </div>

            {generatedSale.balanceCents > 0 ? (
              <div className="mt-4 grid gap-4">
                <SaleDiscountForm
                  action={applySaleDiscountAction}
                  saleId={generatedSale.id}
                  workItemId={item.id}
                />
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
              </div>
            ) : (
              <NoticeForm
                action={sendPaidStudiesToNursingAction}
                notice="Paciente enviado a Enfermería"
                className="mt-4"
              >
                <input type="hidden" name="workItemId" value={item.id} />
                <SubmitButton className="w-full">Pago confirmado · Enviar a Enfermería</SubmitButton>
              </NoticeForm>
            )}
          </Card>
        ) : doctorOrder?.status === "submitted" ? (
          <Card className="max-sm:order-2">
            <CardHeader
              title="Confirmar pedido del médico"
              description="Revisa el detalle de lo que se entrega al paciente, aplica descuento si corresponde y crea la venta. No se cobra sin confirmar."
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
              totalCents={doctorOrderTotalCents}
              lines={doctorOrder.lines.map((line) => ({
                id: line.id,
                source: line.source,
                description: line.description,
                quantity: line.quantity
              }))}
            />
          </Card>
        ) : doctorOrder?.status === "confirmed" && doctorOrderSale ? (
          <Card className="max-sm:order-2">
            <CardHeader
              title="Pedido médico"
              description="Registra el cobro. Cuando quede saldado, la visita termina y el seguimiento pasa a Recepción."
              action={
                doctorOrderSale.balanceCents === 0 ? (
                  <Chip tone="success" dot>
                    Pagado
                  </Chip>
                ) : undefined
              }
            />
            {doctorOrderSale.balanceCents === 0 ? (
              <p className="text-sm text-muted">
                El tratamiento quedó pagado. La visita se cerró y los seguimientos pendientes
                quedaron para Recepción.
              </p>
            ) : doctorOrderSale && doctorOrderSale.balanceCents > 0 ? (
              <div className="grid gap-3">
                <p className="text-sm text-warning">
                  Cobra el saldo ({formatMoney(doctorOrderSale.balanceCents)}) para finalizar la
                  visita.
                </p>
                <NoticeForm
                  action={createPaymentAction}
                  notice="Cobro registrado"
                  className="grid gap-3"
                >
                  <input type="hidden" name="idempotencyKey" value={randomUUID()} />
                  <input type="hidden" name="saleId" value={doctorOrderSale.id} />
                  <input type="hidden" name="workItemId" value={item.id} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Monto Bs">
                      <input
                        className={internalInputClassName}
                        name="amount"
                        inputMode="decimal"
                        defaultValue={(doctorOrderSale.balanceCents / 100).toFixed(2)}
                        required
                      />
                    </Field>
                    <PaymentMethodChips />
                  </div>
                  <Field label="Referencia">
                    <input className={internalInputClassName} name="reference" />
                  </Field>
                  <SubmitButton>Registrar pago completo</SubmitButton>
                </NoticeForm>
              </div>
            ) : null}
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
        {isActiveVisitStatus(item.visit.status) && !isPaidStudyOrder ? (
          <Card className="max-sm:order-4">
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
            title="Historial de Compras del paciente"
            description="Historial resumido de tratamientos, sueros, servicios y productos vendidos."
          />
          <PatientSalesHistory
            sales={patientSales.map((sale) => ({
              id: sale.id,
              status: sale.status,
              totalCents: sale.totalCents,
              paidCents: sale.paidCents,
              balanceCents: sale.balanceCents,
              createdAt: sale.createdAt.toISOString(),
              items: sale.items.map((saleItem) => ({
                id: saleItem.id,
                type: saleItem.type,
                description: saleItem.description,
                quantity: saleItem.quantity,
                unitPriceCents: saleItem.unitPriceCents,
                totalCents: saleItem.totalCents
              })),
              payments: sale.payments.map((payment) => ({
                id: payment.id,
                amountCents: payment.amountCents,
                paidAt: payment.paidAt.toISOString(),
                reference: payment.reference,
                method: { name: payment.method.name }
              }))
            }))}
          />
        </Card>
      </div>
    </div>
  );
}
