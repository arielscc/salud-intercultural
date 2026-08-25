import { randomUUID } from "node:crypto";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Printer } from "lucide-react";
import { Field, internalInputClassName } from "@/components/internal/Field";
import { MobileBackLink } from "@/components/internal/MobileBackLink";
import { NoticeForm } from "@/components/internal/NoticeForm";
import { PaymentMethodChips } from "@/components/internal/PaymentMethodChips";
import { SubmitButton } from "@/components/internal/SubmitButton";
import { StaleCashSessionModal } from "@/components/internal/cash/StaleCashSessionModal";
import { buttonVariants } from "@/components/internal/ui/Button";
import { Card, CardHeader } from "@/components/internal/ui/Card";
import { Chip } from "@/components/internal/ui/Chip";
import {
  RecordItem,
  RecordList,
  RecordListEmpty,
  RecordTable
} from "@/components/internal/ui/RecordList";
import { Table, Td, Th, Tr } from "@/components/internal/ui/Table";
import { getBranchContext } from "@/features/branches/context";
import { OpenCashSessionCallout } from "@/features/cash/components/OpenCashSessionCallout";
import { cashErrorMessages } from "@/features/cash/labels";
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
import { getModuleAccessState } from "@/modules/database/queries/modules";
import { canUse } from "@/features/modules/access";
import { cn } from "@/lib/cn";

type SaleDetailPageProps = {
  params: Promise<{ saleId: string }>;
  searchParams: Promise<{ error?: string; aviso?: string }>;
};

export default async function SaleDetailPage({
  params,
  searchParams
}: SaleDetailPageProps) {
  const user = await requirePermission("sales_read");
  const moduleAccess = await getModuleAccessState();
  const { activeBranch } = await getBranchContext(user);
  const { saleId } = await params;
  const query = await searchParams;
  const [sale, receiptDocuments] = await Promise.all([
    getSaleById(saleId),
    getSaleReceiptDocuments(saleId)
  ]);

  if (!sale) notFound();

  const hasBalance = sale.balanceCents > 0;
  // `cash-session-required` lo explica el aviso de apertura y
  // `cash-session-stale-open` tiene su propio modal; el resto de códigos de Caja
  // vienen del formulario de apertura lanzado desde esta pantalla.
  const cashError = query.error && query.error in cashErrorMessages ? query.error : null;
  const cashOpenMessage =
    cashError && cashError !== "cash-session-required" && cashError !== "cash-session-stale-open"
      ? cashErrorMessages[cashError]
      : null;
  const canGenerateReceipt = canUse(user.role, moduleAccess, "sales_write");
  // Los costos por producto solo los ve el médico (y super admin). En ventas del
  // pedido del médico, Administración/Enfermería ven detalle + cantidad + total.
  const canSeeLineCosts = user.role === "medico" || user.role === "super_admin";
  const hidesLineCosts =
    !canSeeLineCosts &&
    (Boolean(sale.doctorOrderId) ||
      sale.items.every((item) =>
        ["study", "service", "serum", "treatment"].includes(item.type)
      ));

  return (
    <div className={cn("grid items-start gap-4", hasBalance && "xl:grid-cols-[1.5fr_1fr]")}>
      <MobileBackLink href="/sigeco/administracion" label="Volver a Caja" />
      <div className="grid gap-4 max-sm:contents">
        {query.error === "cash-session-stale-open" ? <StaleCashSessionModal /> : null}
        {query.aviso === "cash-session-opened" ? (
          <div
            className="rounded-[9px] border border-success/30 bg-success/10 px-4 py-3 text-sm text-text"
            role="status"
          >
            Caja abierta. Ya puedes registrar el cobro de esta venta.
          </div>
        ) : null}
        {cashOpenMessage ? (
          <div
            className="rounded-[9px] border border-error/30 bg-error/10 px-4 py-3 text-sm text-error"
            role="alert"
          >
            <p className="font-semibold">No se pudo abrir la Caja.</p>
            <p className="mt-1">{cashOpenMessage}</p>
          </div>
        ) : null}
        {query.error && !cashError ? (
          <div
            className="rounded-[9px] border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning"
            role="alert"
          >
            <p className="font-semibold">No se pudo emitir el comprobante.</p>
            <p className="mt-1">
              Los productos, totales y pagos deben coincidir antes de crear otra versión.
            </p>
          </div>
        ) : null}
        {hasBalance || cashError ? (
          <OpenCashSessionCallout
            user={user}
        moduleAccess={moduleAccess}
            branch={activeBranch}
            returnTo={`/sigeco/administracion/ventas/${sale.id}`}
            blocked={Boolean(cashError) && cashError !== "cash-session-stale-open"}
          />
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
            action={
              <Link
                className={buttonVariants({ variant: "outline", size: "sm" })}
                href={`/sigeco/api/sales/${sale.id}/recibo?purpose=print`}
                target="_blank"
              >
                <Printer className="h-4 w-4" aria-hidden="true" />
                Imprimir recibo
              </Link>
            }
          />
          <RecordList>
            {sale.items.map((item) => (
              <RecordItem
                key={item.id}
                title={item.description}
                status={
                  hidesLineCosts ? undefined : (
                    <span className="text-sm font-semibold tabular-nums text-text">
                      {formatMoney(item.totalCents)}
                    </span>
                  )
                }
              >
                <span>
                  {saleItemTypeLabels[item.type]} ·{" "}
                  <span className="tabular-nums">
                    {hidesLineCosts
                      ? `cantidad ${item.quantity}`
                      : `${item.quantity} x ${formatMoney(item.unitPriceCents)}`}
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
                  {hidesLineCosts ? null : (
                    <>
                      <Th className="text-right">Precio unit.</Th>
                      <Th className="text-right">Total</Th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {sale.items.map((item) => (
                  <Tr key={item.id}>
                    <Td className="font-medium text-text">{item.description}</Td>
                    <Td>{saleItemTypeLabels[item.type]}</Td>
                    <Td className="text-right tabular-nums">{item.quantity}</Td>
                    {hidesLineCosts ? null : (
                      <>
                        <Td className="text-right tabular-nums">{formatMoney(item.unitPriceCents)}</Td>
                        <Td className="text-right tabular-nums">{formatMoney(item.totalCents)}</Td>
                      </>
                    )}
                  </Tr>
                ))}
              </tbody>
            </Table>
          </RecordTable>
          <div className="border-t border-border px-[18px] py-4">
            <dl className="ml-auto grid w-full max-w-[280px] gap-1.5 text-sm">
              {hidesLineCosts ? null : (
                <>
                  <SummaryRow label="Subtotal" value={formatMoney(sale.subtotalCents)} />
                  <SummaryRow label="Descuento" value={formatMoney(sale.discountCents)} />
                </>
              )}
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
