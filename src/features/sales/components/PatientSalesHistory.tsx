"use client";

import { CalendarDays, ReceiptText, X } from "lucide-react";
import { Dialog } from "radix-ui";
import { Button, buttonVariants } from "@/components/internal/ui/Button";
import { Chip } from "@/components/internal/ui/Chip";
import { formatMoney, saleItemTypeLabels, saleStatusLabels } from "@/features/sales/labels";
import type { SaleItemType, SaleStatus } from "@/generated/prisma/client";
import { cn } from "@/lib/cn";

type PatientSaleHistoryItem = {
  id: string;
  status: SaleStatus;
  totalCents: number;
  paidCents: number;
  balanceCents: number;
  createdAt: string;
  items: Array<{
    id: string;
    type: SaleItemType;
    description: string;
    quantity: number;
    unitPriceCents: number;
    totalCents: number;
  }>;
  payments: Array<{
    id: string;
    amountCents: number;
    paidAt: string;
    reference: string | null;
    method: { name: string };
  }>;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-BO", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

function saleTitle(sale: PatientSaleHistoryItem) {
  if (sale.items.length === 0) return "Venta sin detalle";
  if (sale.items.length === 1) return sale.items[0].description;
  return `${sale.items[0].description} + ${sale.items.length - 1} más`;
}

function saleTone(status: SaleStatus) {
  if (status === "paid") return "success";
  if (status === "partial") return "warning";
  if (status === "cancelled") return "neutral";
  return "primary";
}

export function PatientSalesHistory({ sales }: { sales: PatientSaleHistoryItem[] }) {
  if (sales.length === 0) {
    return (
      <p className="py-2 text-sm text-muted">
        Sin ventas registradas para este paciente.
      </p>
    );
  }

  return (
    <div className="grid gap-2">
      {sales.map((sale) => (
        <Dialog.Root key={sale.id}>
          <Dialog.Trigger asChild>
            <button
              type="button"
              className="focus-ring grid w-full gap-2 rounded-[9px] border border-border bg-surface px-3 py-3 text-left transition hover:border-primary/35 hover:bg-primary/5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-text">{saleTitle(sale)}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                    <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                    {formatDate(sale.createdAt)}
                  </p>
                </div>
                <Chip tone={saleTone(sale.status)}>{saleStatusLabels[sale.status]}</Chip>
              </div>
              <div className="grid grid-cols-3 gap-2 rounded-[7px] bg-background px-3 py-2 text-xs tabular-nums">
                <div>
                  <span className="block text-muted">Total</span>
                  <span className="font-semibold text-text">{formatMoney(sale.totalCents)}</span>
                </div>
                <div>
                  <span className="block text-muted">Pagado</span>
                  <span className="font-semibold text-text">{formatMoney(sale.paidCents)}</span>
                </div>
                <div>
                  <span className="block text-muted">Saldo</span>
                  <span className="font-bold text-text">{formatMoney(sale.balanceCents)}</span>
                </div>
              </div>
            </button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[1px]" />
            <Dialog.Content
              className={cn(
                "fixed inset-x-3 top-1/2 z-50 max-h-[calc(100dvh-2rem)] -translate-y-1/2 overflow-hidden rounded-[9px] border border-border bg-surface shadow-2xl",
                "sm:left-1/2 sm:right-auto sm:w-[min(94vw,560px)] sm:-translate-x-1/2"
              )}
            >
              <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-4">
                <div className="min-w-0">
                  <Dialog.Title className="font-sora text-lg font-bold text-text">
                    {saleTitle(sale)}
                  </Dialog.Title>
                  <Dialog.Description className="mt-1 text-sm text-muted">
                    Venta del {formatDate(sale.createdAt)}
                  </Dialog.Description>
                </div>
                <Dialog.Close asChild>
                  <Button type="button" variant="ghost" size="sm" className="h-9 w-9 shrink-0 px-0">
                    <X className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </Dialog.Close>
              </header>

              <div className="max-h-[calc(100dvh-11rem)] overflow-y-auto px-4 py-4">
                <dl className="grid grid-cols-3 gap-2 rounded-[9px] border border-border bg-background p-3 text-sm tabular-nums">
                  <div>
                    <dt className="text-xs text-muted">Total</dt>
                    <dd className="font-bold text-text">{formatMoney(sale.totalCents)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Pagado</dt>
                    <dd className="font-bold text-text">{formatMoney(sale.paidCents)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Saldo</dt>
                    <dd className="font-bold text-text">{formatMoney(sale.balanceCents)}</dd>
                  </div>
                </dl>

                <section className="mt-4">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                    Ítems vendidos
                  </p>
                  <div className="grid gap-2">
                    {sale.items.map((item) => (
                      <div key={item.id} className="rounded-[8px] border border-border bg-surface px-3 py-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-text">{item.description}</p>
                            <p className="mt-0.5 text-xs text-muted">{saleItemTypeLabels[item.type]}</p>
                          </div>
                          <span className="shrink-0 text-sm font-bold tabular-nums text-text">
                            {formatMoney(item.totalCents)}
                          </span>
                        </div>
                        <p className="mt-1 text-xs tabular-nums text-muted">
                          {item.quantity} × {formatMoney(item.unitPriceCents)}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="mt-4">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                    Pagos
                  </p>
                  {sale.payments.length > 0 ? (
                    <div className="grid gap-2">
                      {sale.payments.map((payment) => (
                        <div key={payment.id} className="flex items-start justify-between gap-3 rounded-[8px] border border-border bg-background px-3 py-2 text-sm">
                          <div>
                            <p className="font-semibold text-text">{payment.method.name}</p>
                            <p className="text-xs text-muted">
                              {formatDate(payment.paidAt)}
                              {payment.reference ? ` · Ref. ${payment.reference}` : ""}
                            </p>
                          </div>
                          <span className="font-bold tabular-nums text-text">
                            {formatMoney(payment.amountCents)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-[8px] border border-dashed border-border px-3 py-3 text-sm text-muted">
                      Sin pagos registrados.
                    </p>
                  )}
                </section>
              </div>

              <footer className="border-t border-border px-4 py-3">
                <a
                  href={`/sigeco/administracion/ventas/${sale.id}`}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full")}
                >
                  <ReceiptText className="h-4 w-4" aria-hidden="true" />
                  Abrir venta completa
                </a>
              </footer>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      ))}
    </div>
  );
}
