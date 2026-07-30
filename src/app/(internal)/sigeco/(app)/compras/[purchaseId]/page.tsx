import { randomUUID } from "node:crypto";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Boxes, CreditCard, FileDown, PackageCheck } from "lucide-react";
import { Field, internalInputClassName } from "@/components/internal/Field";
import { MobileBackLink } from "@/components/internal/MobileBackLink";
import { SubmitButton } from "@/components/internal/SubmitButton";
import { buttonVariants } from "@/components/internal/ui/Button";
import { Card, CardHeader } from "@/components/internal/ui/Card";
import { Chip } from "@/components/internal/ui/Chip";
import { DateTimePickerField } from "@/components/internal/ui/DatePickerField";
import { InfoRow } from "@/components/internal/ui/InfoRow";
import { PageHeader } from "@/components/internal/ui/PageHeader";
import { Table, Td, Th, Tr } from "@/components/internal/ui/Table";
import { roleHasPermission } from "@/features/internal-auth/permissions";
import {
  cancelPurchaseAction,
  confirmPurchaseAction,
  recordPurchasePaymentAction
} from "@/features/purchases/actions";
import { PurchaseError } from "@/features/purchases/components/PurchaseError";
import {
  purchasePaymentMethodLabels,
  purchaseStatusLabels
} from "@/features/purchases/labels";
import { formatMoney } from "@/features/sales/labels";
import { formatDateOnly, formatDateTime } from "@/lib/dates";
import {
  effectivePurchasePaymentCents,
  getOpenPurchaseCashSessions,
  getPurchaseById
} from "@/modules/database/queries/purchases";
import { requirePermission } from "@/modules/permissions";

const noticeMessages: Record<string, string> = {
  "compra-creada": "El borrador fue creado. Todavía no movió dinero ni stock.",
  "compra-confirmada": "La compra fue confirmada.",
  "pago-compra-registrado": "El pago y su salida de Caja fueron registrados.",
  "recepcion-registrada": "La recepción aumentó el stock una sola vez.",
  "compra-anulada": "La compra fue anulada sin borrar su historia."
};

function personName(person: { name: string | null; email: string }) {
  return person.name ?? person.email;
}

export default async function PurchaseDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ purchaseId: string }>;
  searchParams: Promise<{ error?: string; aviso?: string }>;
}) {
  const user = await requirePermission("purchases_read");
  const { purchaseId } = await params;
  const query = await searchParams;
  const [purchase, openSessions] = await Promise.all([
    getPurchaseById(purchaseId),
    getOpenPurchaseCashSessions()
  ]);
  if (!purchase) notFound();

  const canWrite = roleHasPermission(user.role, "purchases_write");
  const canReceive = roleHasPermission(user.role, "purchase_receipts_write");
  const paidCents = purchase.payments.reduce(
    (sum, payment) => sum + effectivePurchasePaymentCents(payment),
    0
  );
  const balanceCents = purchase.totalCents - paidCents;
  const hasPending = purchase.lines.some(
    (line) => line.receivedQuantity < line.orderedQuantity
  );
  const paymentNeedsCash =
    purchase.intendedPaymentMethod !== "credit" && !purchase.sourceCashExpenseId;
  const canCancel =
    canWrite &&
    ["draft", "confirmed"].includes(purchase.status) &&
    purchase.payments.length === 0 &&
    purchase.receipts.length === 0;

  return (
    <div className="grid gap-4">
      <MobileBackLink href="/sigeco/compras" label="Volver a compras" />
      <PageHeader
        title={purchase.purchaseNumber}
        description={`${purchase.supplier.name} · ${formatDateOnly(purchase.purchaseDate)}`}
        actions={
          canReceive &&
          hasPending &&
          ["confirmed", "partially_received"].includes(purchase.status) ? (
            <Link
              href={`/sigeco/compras/${purchase.id}/recibir`}
              className={buttonVariants({ size: "sm" })}
            >
              <PackageCheck size={16} aria-hidden="true" />
              Recibir productos
            </Link>
          ) : null
        }
      />
      <PurchaseError code={query.error} />
      {query.aviso && noticeMessages[query.aviso] ? (
        <div className="rounded-[9px] border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
          {noticeMessages[query.aviso]}
        </div>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader
            title="Resumen de compra"
            action={<Chip>{purchaseStatusLabels[purchase.status]}</Chip>}
          />
          <dl className="grid gap-3 sm:grid-cols-3">
            <InfoRow label="Proveedor" value={purchase.supplier.name} />
            <InfoRow label="Documento" value={purchase.documentNumber ?? "Sin documento"} />
            <InfoRow label="Sucursal" value={purchase.branchCode === "el-alto" ? "El Alto" : purchase.branchCode} />
            <InfoRow label="Moneda" value={purchase.currency} />
            <InfoRow
              label="Pago previsto"
              value={purchasePaymentMethodLabels[purchase.intendedPaymentMethod]}
            />
            <InfoRow label="Creada por" value={personName(purchase.createdBy)} />
            <InfoRow label="Total" value={formatMoney(purchase.totalCents)} />
            <InfoRow label="Pagado" value={formatMoney(paidCents)} />
            <InfoRow label="Saldo" value={formatMoney(balanceCents)} />
          </dl>
          {purchase.sourceCashExpense ? (
            <p className="mt-4 rounded-[9px] bg-surface-soft p-3 text-sm text-muted">
              Vinculada al egreso urgente del {formatDateTime(purchase.sourceCashExpense.occurredAt)}.
              Al confirmar se reutiliza esa salida de dinero; no se crea otra.
            </p>
          ) : null}
          {purchase.notes ? (
            <p className="mt-4 whitespace-pre-wrap text-sm text-muted">{purchase.notes}</p>
          ) : null}
        </Card>

        <Card>
          <CardHeader
            title="Trazabilidad"
            description="Orden, dinero, recepción y stock son registros separados y enlazados."
          />
          <ol className="grid gap-3 text-sm">
            <li className="flex gap-3">
              <Boxes className="mt-0.5 text-primary-dark" size={18} />
              <span><strong>Compra:</strong> {purchaseStatusLabels[purchase.status]}.</span>
            </li>
            <li className="flex gap-3">
              <CreditCard className="mt-0.5 text-primary-dark" size={18} />
              <span><strong>Dinero:</strong> {formatMoney(paidCents)} pagado.</span>
            </li>
            <li className="flex gap-3">
              <PackageCheck className="mt-0.5 text-primary-dark" size={18} />
              <span><strong>Recepciones:</strong> {purchase.receipts.length} registradas.</span>
            </li>
          </ol>
          {purchase.documents.length ? (
            <div className="mt-4 border-t border-border pt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                Documentos privados
              </p>
              <div className="grid gap-2">
                {purchase.documents.map((document) => (
                  <Link
                    key={document.id}
                    href={`/sigeco/api/purchase-documents/${document.id}`}
                    className="flex min-h-10 items-center gap-2 rounded-[9px] border border-border px-3 text-sm font-semibold hover:border-primary/40"
                  >
                    <FileDown size={15} />
                    {document.originalName}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </Card>
      </section>

      <Card className="overflow-x-auto">
        <CardHeader
          title="Pedido comparado con lo recibido"
          description="El costo histórico de estas líneas no cambia al editar el catálogo."
        />
        <Table caption="Productos pedidos y recibidos">
          <thead>
            <tr>
              <Th>Producto</Th>
              <Th className="text-right">Pedido</Th>
              <Th className="text-right">Recibido</Th>
              <Th className="text-right">Pendiente</Th>
              <Th className="text-right">Costo acordado</Th>
              <Th className="text-right">Subtotal</Th>
            </tr>
          </thead>
          <tbody>
            {purchase.lines.map((line) => (
              <Tr key={line.id}>
                <Td>
                  <Link
                    href={`/sigeco/inventario/${line.itemId}`}
                    className="font-semibold text-primary-dark hover:underline"
                  >
                    {line.description}
                  </Link>
                  <span className="block text-xs text-muted">{line.unit}</span>
                </Td>
                <Td className="text-right tabular-nums">{line.orderedQuantity}</Td>
                <Td className="text-right tabular-nums">{line.receivedQuantity}</Td>
                <Td className="text-right tabular-nums">
                  {line.orderedQuantity - line.receivedQuantity}
                </Td>
                <Td className="text-right tabular-nums">
                  {formatMoney(line.unitCostCents)}
                </Td>
                <Td className="text-right tabular-nums">
                  {formatMoney(line.subtotalCents)}
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>

      {purchase.receipts.length ? (
        <Card>
          <CardHeader
            title="Recepciones y lotes"
            description="Cada fila produjo una entrada única en el kardex."
          />
          <div className="grid gap-3">
            {purchase.receipts.map((receipt) => (
              <article key={receipt.id} className="rounded-[9px] border border-border p-3">
                <div className="flex flex-wrap justify-between gap-2">
                  <strong>{receipt.receiptNumber}</strong>
                  <span className="text-xs text-muted">{formatDateTime(receipt.receivedAt)}</span>
                </div>
                <p className="mt-1 text-xs text-muted">
                  Recibió {personName(receipt.receivedBy)} · {receipt.locationCode}
                </p>
                <ul className="mt-3 grid gap-1 text-sm">
                  {receipt.lines.map((line) => (
                    <li key={line.id}>
                      {line.item.name}: {line.quantity} {line.item.unit} · lote{" "}
                      <Link
                        className="font-semibold text-primary-dark hover:underline"
                        href={`/sigeco/inventario/lotes?q=${line.lot.internalLotCode}`}
                      >
                        {line.lot.batchNumber ?? line.lot.internalLotCode}
                      </Link>{" "}
                      · costo {formatMoney(line.unitCostCents)}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </Card>
      ) : null}

      {purchase.payments.length ? (
        <Card>
          <CardHeader title="Pagos registrados" />
          <div className="grid gap-2">
            {purchase.payments.map((payment) => (
              (() => {
                const effectiveCents = effectivePurchasePaymentCents(payment);
                const correctedCents = payment.amountCents - effectiveCents;
                return (
              <div
                key={payment.id}
                className="flex flex-wrap justify-between gap-2 rounded-[9px] border border-border p-3 text-sm"
              >
                <span>
                  {purchasePaymentMethodLabels[payment.method]} · {personName(payment.recordedBy)}
                </span>
                <strong className="tabular-nums">{formatMoney(effectiveCents)}</strong>
                <span className="w-full text-xs text-muted">
                  {formatDateTime(payment.paidAt)}
                  {payment.reference ? ` · ${payment.reference}` : ""}
                  {correctedCents
                    ? ` · reintegrado ${formatMoney(correctedCents)}`
                    : ""}
                </span>
              </div>
                );
              })()
            ))}
          </div>
        </Card>
      ) : null}

      {canWrite && purchase.status === "draft" ? (
        <Card>
          <CardHeader
            title="Confirmar compra"
            description={
              purchase.intendedPaymentMethod === "credit"
                ? "La compra quedará pendiente de pago y no reducirá Caja."
                : purchase.sourceCashExpense
                  ? "Se enlazará con el egreso urgente ya existente."
                  : "Al confirmar se registrará una sola salida de Caja por el total."
            }
          />
          <form action={confirmPurchaseAction} className="grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="purchaseId" value={purchase.id} />
            <input type="hidden" name="expectedRevision" value={purchase.revision} />
            <input type="hidden" name="paymentIdempotencyKey" value={randomUUID()} />
            {paymentNeedsCash ? (
              <>
                <Field label="Caja abierta">
                  <select className={internalInputClassName} name="cashSessionId" required>
                    <option value="">Selecciona</option>
                    {openSessions.map((session) => (
                      <option key={session.id} value={session.id}>
                        {session.registerName} · {session.branchCode}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Referencia">
                  <input className={internalInputClassName} name="paymentReference" />
                </Field>
              </>
            ) : null}
            {paymentNeedsCash && openSessions.length === 0 ? (
              <p className="sm:col-span-2 text-sm text-warning">
                Abre la Caja antes de confirmar esta compra pagada.
              </p>
            ) : (
              <SubmitButton className="sm:col-span-2 sm:w-fit">
                Confirmar compra
              </SubmitButton>
            )}
          </form>
        </Card>
      ) : null}

      {canWrite &&
      purchase.status !== "draft" &&
      purchase.status !== "cancelled" &&
      balanceCents > 0 ? (
        <Card>
          <CardHeader
            title="Registrar pago pendiente"
            description="Cada pago crea una sola salida en la Caja seleccionada."
          />
          <form action={recordPurchasePaymentAction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <input type="hidden" name="purchaseId" value={purchase.id} />
            <input type="hidden" name="idempotencyKey" value={randomUUID()} />
            <Field label="Caja abierta">
              <select className={internalInputClassName} name="cashSessionId" required>
                <option value="">Selecciona</option>
                {openSessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.registerName} · {session.branchCode}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Medio">
              <select className={internalInputClassName} name="method" defaultValue="cash">
                <option value="cash">Efectivo</option>
                <option value="transfer">Transferencia</option>
                <option value="other">Otro</option>
              </select>
            </Field>
            <Field label={`Monto (máximo ${formatMoney(balanceCents)})`}>
              <input
                className={internalInputClassName}
                name="amount"
                inputMode="decimal"
                defaultValue={(balanceCents / 100).toFixed(2)}
                required
              />
            </Field>
            <Field label="Fecha y hora">
              <DateTimePickerField name="paidAt" required />
            </Field>
            <Field label="Referencia" className="sm:col-span-2 lg:col-span-3">
              <input className={internalInputClassName} name="reference" />
            </Field>
            {openSessions.length ? (
              <SubmitButton className="self-end">Registrar pago</SubmitButton>
            ) : (
              <p className="self-end text-sm text-warning">No hay una Caja abierta.</p>
            )}
          </form>
        </Card>
      ) : null}

      {canCancel ? (
        <Card>
          <CardHeader
            title="Anular compra"
            description="Solo es posible si todavía no tiene pagos ni recepciones."
          />
          <form action={cancelPurchaseAction} className="flex flex-col gap-3 sm:flex-row">
            <input type="hidden" name="purchaseId" value={purchase.id} />
            <input type="hidden" name="expectedRevision" value={purchase.revision} />
            <input
              className={`${internalInputClassName} flex-1`}
              name="reason"
              placeholder="Motivo obligatorio"
              minLength={3}
              required
            />
            <SubmitButton variant="danger">Anular sin borrar</SubmitButton>
          </form>
        </Card>
      ) : null}
    </div>
  );
}
