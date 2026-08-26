"use client";

import { AlertTriangle, Banknote } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { SubmitButton } from "@/components/internal/SubmitButton";

export function PriorityCollectionDialog({
  action,
  workItemId,
  patientName,
  patientCode,
  orderTitle,
  orderDescription,
  requestedBy,
  requestedAt,
  amount,
  balance
}: {
  action: (formData: FormData) => void | Promise<void>;
  workItemId: string;
  patientName: string;
  patientCode: string;
  orderTitle: string;
  orderDescription?: string | null;
  requestedBy?: string | null;
  requestedAt: string;
  amount?: string;
  balance?: string;
}) {
  return (
    <AlertDialog open>
      <AlertDialogContent className="gap-0 border-warning/40 p-0 sm:max-w-[560px]">
        <div className="border-b border-warning/25 bg-warning/10 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3 text-warning">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-warning/15">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase text-warning">Atención prioritaria</p>
              <p className="font-sora text-lg font-bold text-text">Nueva orden de cobro</p>
            </div>
          </div>
        </div>

        <div className="grid gap-5 px-5 pb-5 sm:px-6 sm:pb-6">
          <AlertDialogHeader className="text-left">
            <AlertDialogTitle>{patientName}</AlertDialogTitle>
            <AlertDialogDescription>
              {patientCode} · La atención administrativa debe completarse antes de continuar con la bandeja normal.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <dl className="grid gap-3 rounded-[7px] border border-border bg-background p-4 text-sm">
            <div><dt className="text-xs font-medium text-muted">Orden</dt><dd className="mt-0.5 font-semibold text-text">{orderTitle}</dd></div>
            {orderDescription ? <div><dt className="text-xs font-medium text-muted">Detalle</dt><dd className="mt-0.5 text-text">{orderDescription}</dd></div> : null}
            {requestedBy ? <div><dt className="text-xs font-medium text-muted">Solicitado por</dt><dd className="mt-0.5 text-text">{requestedBy}</dd></div> : null}
            <div><dt className="text-xs font-medium text-muted">Recibida</dt><dd className="mt-0.5 font-medium tabular-nums text-text">{requestedAt}</dd></div>
            {amount ? (
              <div className="grid grid-cols-2 gap-3 border-t border-border pt-3 tabular-nums">
                <div><dt className="text-xs font-medium text-muted">Total</dt><dd className="mt-0.5 font-semibold text-text">{amount}</dd></div>
                <div><dt className="text-xs font-medium text-muted">Saldo</dt><dd className="mt-0.5 font-bold text-warning">{balance}</dd></div>
              </div>
            ) : null}
          </dl>

          <form action={action}>
            <input type="hidden" name="workItemId" value={workItemId} />
            <SubmitButton className="w-full" pendingLabel="Abriendo cobro...">
              <Banknote className="h-4 w-4" aria-hidden="true" />
              Atender cobro ahora
            </SubmitButton>
          </form>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
