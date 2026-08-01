import { randomUUID } from "node:crypto";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Field, internalInputClassName } from "@/components/internal/Field";
import { MobileBackLink } from "@/components/internal/MobileBackLink";
import { NoticeForm } from "@/components/internal/NoticeForm";
import { PaymentMethodChips } from "@/components/internal/PaymentMethodChips";
import { SubmitButton } from "@/components/internal/SubmitButton";
import { Card, CardHeader } from "@/components/internal/ui/Card";
import { Chip } from "@/components/internal/ui/Chip";
import { DesktopDetailContext } from "@/components/internal/ui/DesktopDetailContext";
import {
  RecordItem,
  RecordList,
  RecordListEmpty,
  RecordTable
} from "@/components/internal/ui/RecordList";
import { Table, Td, Th, Tr } from "@/components/internal/ui/Table";
import { createPaymentAction } from "@/features/sales/actions";
import { generateInternalReceiptDocumentAction } from "@/features/generated-documents/actions";
import { roleHasPermission } from "@/features/internal-auth/permissions";
import {
  formatMoney,
  saleItemTypeLabels,
  saleStatusLabels
} from "@/features/sales/labels";
import { formatDateTime } from "@/lib/dates";
import { getSaleById } from "@/modules/database/queries/sales";
import { getSaleReceiptDocuments } from "@/modules/generated-documents/service";
import { requirePermission } from "@/modules/permissions";
import { cn } from "@/lib/cn";

type SaleDetailPageProps = {
  params: Promise<{ saleId: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function SaleDetailPage({
  params,
  searchParams
}: SaleDetailPageProps) {
  const user = await requirePermission("sales_read");
  const { saleId } = await params;
  const query = await searchParams;
  const [sale, receiptDocuments] = await Promise.all([
    getSaleById(saleId),
    getSaleReceiptDocuments(saleId)
  ]);

  if (!sale) notFound();

  const hasBalance = sale.balanceCents > 0;
  const canGenerateReceipt = roleHasPermission(user.role, "sales_write");

  return (
    <div className={cn("grid items-start gap-4", hasBalance && "xl:grid-cols-[1.5fr_1fr]")}>
      <MobileBackLink href="/sigeco/administracion" label="Volver a Caja" />
      <div className="grid gap-4 max-sm:contents">
        {query.error ? (
          <div
            className="rounded-[9px] border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning"
            role="alert"
          >
            <p className="font-semibold">
              {query.error === "cash-session-required"
                ? "Primero debes abrir la Caja de hoy."
                : "No se pudo emitir el comprobante."}
            </p>
            <p className="mt-1">
              {query.error === "cash-session-required"
                ? "El cobro no fue registrado. Abre una sesión en “Control de Caja” y vuelve a intentar."
                : "Los productos, totales y pagos deben coincidir antes de crear otra versión."}
            </p>
          </div>
        ) : null}
        <Card className="max-sm:order-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-muted">Comprobante interno</p>
              <h2 className="font-sora text-xl font-bold tracking-tight text-text">
                {sale.patient.fullName}
              </h2>
              <p className="mt-0.5 text-sm tabular-nums text-muted">
                {sale.patient.internalCode} · Venta {sale.id}
              </p>
            </div>
            <Chip tone={hasBalance ? "warning" : "success"} dot>
              {saleStatusLabels[sale.status]}
            </Chip>
          </div>
        </Card>

        <Card className="max-sm:order-3 p-0">
          <CardHeader
            className="mb-0 p-[18px] pb-3"
            title="Conceptos cobrados"
            description="Productos, servicios o estudios incluidos en este comprobante."
          />
          <RecordList>
            {sale.items.map((item) => (
              <RecordItem
                key={item.id}
                title={item.description}
                status={
                  <span className="text-sm font-semibold tabular-nums text-text">
                    {formatMoney(item.totalCents)}
                  </span>
                }
              >
                <span>
                  {saleItemTypeLabels[item.type]} ·{" "}
                  <span className="tabular-nums">
                    {item.quantity} x {formatMoney(item.unitPriceCents)}
                  </span>
                </span>
              </RecordItem>
            ))}
          </RecordList>
          <RecordTable>
            <Table caption="Conceptos incluidos en la venta">
              <thead>
                <tr>
                  <Th>Descripción</Th>
                  <Th>Tipo</Th>
                  <Th className="text-right">Cantidad</Th>
                  <Th className="text-right">Precio unit.</Th>
                  <Th className="text-right">Total</Th>
                </tr>
              </thead>
              <tbody>
                {sale.items.map((item) => (
                  <Tr key={item.id}>
                    <Td className="font-medium text-text">{item.description}</Td>
                    <Td>{saleItemTypeLabels[item.type]}</Td>
                    <Td className="text-right tabular-nums">{item.quantity}</Td>
                    <Td className="text-right tabular-nums">{formatMoney(item.unitPriceCents)}</Td>
                    <Td className="text-right tabular-nums">{formatMoney(item.totalCents)}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </RecordTable>
          <div className="border-t border-border px-[18px] py-4">
            <dl className="ml-auto grid w-full max-w-[280px] gap-1.5 text-sm">
              <SummaryRow label="Subtotal" value={formatMoney(sale.subtotalCents)} />
              <SummaryRow label="Descuento" value={formatMoney(sale.discountCents)} />
              <SummaryRow label="Total" value={formatMoney(sale.totalCents)} strong />
              <SummaryRow label="Pagado" value={formatMoney(sale.paidCents)} />
              <SummaryRow
                label="Saldo"
                value={formatMoney(sale.balanceCents)}
                strong={hasBalance}
                tone={hasBalance ? "warning" : undefined}
              />
            </dl>
          </div>
        </Card>

        <Card className="max-sm:order-4 p-0">
          <CardHeader
            className="mb-0 p-[18px] pb-3"
            title="Pagos registrados"
            description="Importes recibidos, método de pago, fecha y referencia."
          />
          <RecordList>
            {sale.payments.map((payment) => {
              const refundedCents = payment.cashMovements.reduce(
                (movementTotal, movement) =>
                  movementTotal +
                  movement.corrections.reduce(
                    (total, correction) => total + correction.amountCents,
                    0
                  ),
                0
              );
              return (
                <RecordItem
                  key={payment.id}
                  title={
                    <span className="tabular-nums">
                      {formatMoney(payment.amountCents)}
                    </span>
                  }
                  status={<Chip>{payment.method.name}</Chip>}
                >
                  <span className="tabular-nums">
                    {formatDateTime(payment.paidAt)}
                  </span>
                  {payment.reference ? (
                    <span>Ref. {payment.reference}</span>
                  ) : null}
                  {refundedCents > 0 ? (
                    <span className="font-semibold text-warning">
                      Devuelto: {formatMoney(refundedCents)}
                    </span>
                  ) : null}
                </RecordItem>
              );
            })}
            {sale.payments.length === 0 ? (
              <RecordListEmpty>
                <span className="text-sm text-muted">Sin pagos registrados.</span>
              </RecordListEmpty>
            ) : null}
          </RecordList>
          <RecordTable>
            <Table caption="Pagos registrados para la venta">
              <thead>
                <tr>
                  <Th>Monto</Th>
                  <Th>Método</Th>
                  <Th>Fecha</Th>
                  <Th>Referencia</Th>
                </tr>
              </thead>
              <tbody>
                {sale.payments.map((payment) => {
                  const refundedCents = payment.cashMovements.reduce(
                    (movementTotal, movement) =>
                      movementTotal +
                      movement.corrections.reduce(
                        (total, correction) =>
                          total + correction.amountCents,
                        0
                      ),
                    0
                  );
                  return (
                    <Tr key={payment.id}>
                      <Td className="font-semibold tabular-nums text-text">
                        {formatMoney(payment.amountCents)}
                        {refundedCents > 0 ? (
                          <span className="block text-[11px] text-warning">
                            Devuelto {formatMoney(refundedCents)}
                          </span>
                        ) : null}
                      </Td>
                      <Td>{payment.method.name}</Td>
                      <Td className="tabular-nums">
                        {formatDateTime(payment.paidAt)}
                      </Td>
                      <Td>{payment.reference ?? "—"}</Td>
                    </Tr>
                  );
                })}
                {sale.payments.length === 0 ? (
                  <tr>
                    <Td className="py-6 text-center" colSpan={4}>
                      Sin pagos registrados.
                    </Td>
                  </tr>
                ) : null}
              </tbody>
            </Table>
          </RecordTable>
        </Card>

        <div id="comprobantes-versionados" className="max-sm:order-5">
          <Card>
            <CardHeader
              title="Comprobante interno versionado"
              description="Copia inmutable de los productos, totales y pagos actuales. No es una factura fiscal."
            />
            {canGenerateReceipt ? (
              <form action={generateInternalReceiptDocumentAction}>
                <input type="hidden" name="saleId" value={sale.id} />
                <SubmitButton className="w-full sm:w-auto">
                  {receiptDocuments.length > 0
                    ? "Comprobar y emitir versión vigente"
                    : "Emitir primera versión"}
                </SubmitButton>
              </form>
            ) : null}
            <div className="mt-4 grid gap-2">
              {receiptDocuments.map((document) => (
                <Link
                  key={document.id}
                  className="focus-ring flex min-h-11 flex-wrap items-center justify-between gap-2 rounded-[9px] border border-border px-3 py-2 text-sm hover:border-primary/40"
                  href={`/sigeco/administracion/ventas/${sale.id}/comprobantes/${document.id}`}
                >
                  <span className="font-semibold text-text">
                    Versión {document.version}
                  </span>
                  <span className="tabular-nums text-muted">
                    {document.documentNumber} ·{" "}
                    {formatDateTime(document.generatedAt)}
                  </span>
                </Link>
              ))}
              {receiptDocuments.length === 0 ? (
                <p className="text-sm text-muted">
                  Todavía no se emitió una versión para imprimir o descargar.
                </p>
              ) : null}
            </div>
          </Card>
        </div>
      </div>

      {hasBalance ? (
        <div className="grid gap-4 max-sm:contents xl:sticky xl:top-0 xl:max-h-[calc(100dvh-6.5rem)] xl:overflow-y-auto xl:overscroll-contain xl:pr-1">
          <DesktopDetailContext
            eyebrow={sale.patient.internalCode}
            title={sale.patient.fullName}
            meta={`Venta ${sale.id}`}
            status={
              <Chip tone={hasBalance ? "warning" : "success"} dot>
                {saleStatusLabels[sale.status]}
              </Chip>
            }
          />
          <Card className="max-sm:order-2">
            <CardHeader
              title="Registrar nuevo cobro"
              description="Aplica un pago al saldo pendiente de este comprobante."
            />
            <NoticeForm action={createPaymentAction} notice="Cobro registrado" className="grid gap-3">
              <input type="hidden" name="idempotencyKey" value={randomUUID()} />
              <input type="hidden" name="saleId" value={sale.id} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Monto Bs">
                  <input
                    className={internalInputClassName}
                    name="amount"
                    inputMode="decimal"
                    placeholder={(sale.balanceCents / 100).toFixed(2)}
                    required
                  />
                </Field>
                <PaymentMethodChips />
              </div>
              <Field label="Referencia">
                <input className={internalInputClassName} name="reference" />
              </Field>
              <Field label="Notas">
                <textarea className={`${internalInputClassName} min-h-20 py-3`} name="notes" />
              </Field>
              <SubmitButton>Registrar pago</SubmitButton>
            </NoticeForm>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

function SummaryRow({
  label,
  value,
  strong,
  tone
}: {
  label: string;
  value: string;
  strong?: boolean;
  tone?: "warning";
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className={cn("text-muted", strong && "font-semibold text-text")}>{label}</dt>
      <dd
        className={cn(
          "m-0 tabular-nums text-muted",
          strong && "font-bold text-text",
          tone === "warning" && "font-bold text-warning"
        )}
      >
        {value}
      </dd>
    </div>
  );
}
