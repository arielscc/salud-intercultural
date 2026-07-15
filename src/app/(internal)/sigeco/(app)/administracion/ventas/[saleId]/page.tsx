import { notFound } from "next/navigation";
import { Field, internalInputClassName } from "@/components/internal/Field";
import { MobileBackLink } from "@/components/internal/MobileBackLink";
import { NoticeForm } from "@/components/internal/NoticeForm";
import { SubmitButton } from "@/components/internal/SubmitButton";
import { Card, CardHeader } from "@/components/internal/ui/Card";
import { Chip } from "@/components/internal/ui/Chip";
import {
  RecordItem,
  RecordList,
  RecordListEmpty,
  RecordTable
} from "@/components/internal/ui/RecordList";
import { Table, Td, Th, Tr } from "@/components/internal/ui/Table";
import { createPaymentAction } from "@/features/sales/actions";
import {
  formatMoney,
  paymentMethodLabels,
  saleItemTypeLabels,
  saleStatusLabels
} from "@/features/sales/labels";
import { formatDateTime } from "@/lib/dates";
import { getSaleById } from "@/modules/database/queries/sales";
import { requirePermission } from "@/modules/permissions";
import { cn } from "@/lib/cn";

const paymentMethodOptions = Object.entries(paymentMethodLabels);

type SaleDetailPageProps = {
  params: Promise<{ saleId: string }>;
};

export default async function SaleDetailPage({ params }: SaleDetailPageProps) {
  await requirePermission("sales_read");
  const { saleId } = await params;
  const sale = await getSaleById(saleId);

  if (!sale) notFound();

  const hasBalance = sale.balanceCents > 0;

  return (
    <div className={cn("grid items-start gap-4", hasBalance && "xl:grid-cols-[1.5fr_1fr]")}>
      <MobileBackLink href="/sigeco/administracion" label="Volver a Caja" />
      <div className="grid gap-4 max-sm:contents">
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
          <CardHeader className="mb-0 p-[18px] pb-3" title="Detalle" />
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
            <Table>
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
          <CardHeader className="mb-0 p-[18px] pb-3" title="Pagos" />
          <RecordList>
            {sale.payments.map((payment) => (
              <RecordItem
                key={payment.id}
                title={<span className="tabular-nums">{formatMoney(payment.amountCents)}</span>}
                status={<Chip>{payment.method.name}</Chip>}
              >
                <span className="tabular-nums">{formatDateTime(payment.paidAt)}</span>
                {payment.reference ? <span>Ref. {payment.reference}</span> : null}
              </RecordItem>
            ))}
            {sale.payments.length === 0 ? (
              <RecordListEmpty>
                <span className="text-sm text-muted">Sin pagos registrados.</span>
              </RecordListEmpty>
            ) : null}
          </RecordList>
          <RecordTable>
            <Table>
              <thead>
                <tr>
                  <Th>Monto</Th>
                  <Th>Método</Th>
                  <Th>Fecha</Th>
                  <Th>Referencia</Th>
                </tr>
              </thead>
              <tbody>
                {sale.payments.map((payment) => (
                  <Tr key={payment.id}>
                    <Td className="font-semibold tabular-nums text-text">
                      {formatMoney(payment.amountCents)}
                    </Td>
                    <Td>{payment.method.name}</Td>
                    <Td className="tabular-nums">{formatDateTime(payment.paidAt)}</Td>
                    <Td>{payment.reference ?? "—"}</Td>
                  </Tr>
                ))}
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
      </div>

      {hasBalance ? (
        <div className="grid gap-4 max-sm:contents">
          <Card className="max-sm:order-2">
            <CardHeader title="Registrar cobro" />
            <NoticeForm action={createPaymentAction} notice="Cobro registrado" className="grid gap-3">
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
