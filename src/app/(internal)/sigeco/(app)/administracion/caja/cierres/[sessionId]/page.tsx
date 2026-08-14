import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintCashCloseButton } from "@/components/internal/cash/PrintCashCloseButton";
import { buttonVariants } from "@/components/internal/ui/Button";
import { Card, CardHeader } from "@/components/internal/ui/Card";
import { Chip } from "@/components/internal/ui/Chip";
import { PageHeader } from "@/components/internal/ui/PageHeader";
import {
  cashChannelLabels,
  cashMovementTypeLabels,
  cashSessionStatusLabels,
  cashShiftLabels
} from "@/features/cash/labels";
import { formatMoney } from "@/features/sales/labels";
import { formatDateOnly, formatDateTime } from "@/lib/dates";
import { getCashSessionCloseReport } from "@/modules/database/queries/cash";
import { requirePermission } from "@/modules/permissions";
import { getBranchContext } from "@/features/branches/context";

type CashCloseReportPageProps = {
  params: Promise<{ sessionId: string }>;
};

function personName(person: { name: string | null; email: string } | null) {
  return person ? person.name ?? person.email : "—";
}

export default async function CashCloseReportPage({
  params
}: CashCloseReportPageProps) {
  const user = await requirePermission("cash_sessions_read");
  const { activeBranch } = await getBranchContext(user);
  const { sessionId } = await params;
  const session = await getCashSessionCloseReport(sessionId, activeBranch.code);

  if (!session || session.status === "open") notFound();

  return (
    <div className="grid gap-4 print:block print:bg-white print:text-black">
      <PageHeader
        className="print:mb-5"
        title="Cierre de Caja"
        description={`Comprobante interno · ${session.id}`}
        actions={
          <>
            <Link
              href={`/sigeco/administracion/caja?session=${session.id}`}
              className={`${buttonVariants({
                variant: "outline",
                size: "sm"
              })} print:hidden`}
            >
              Volver
            </Link>
            <PrintCashCloseButton />
          </>
        }
      />

      <Card className="print:border-black print:p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-sora text-lg font-bold">
              {session.registerName} · {session.branch.name}
            </p>
            <p className="mt-1 text-sm text-muted print:text-black">
              {formatDateOnly(session.businessDate)} ·{" "}
              {cashShiftLabels[session.shift]}
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Chip
              tone={
                session.status === "closed" ? "success" : "warning"
              }
            >
              {cashSessionStatusLabels[session.status]}
            </Chip>
            {session.exceptional ? <Chip tone="warning">Excepcional</Chip> : null}
          </div>
        </div>
        {session.exceptional ? (
          <p className="mt-3 rounded-[7px] border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning print:border-black print:bg-white print:text-black">
            Caja abierta excepcionalmente después de un cierre previo.
            {session.exceptionalReason ? ` Motivo: ${session.exceptionalReason}` : ""}
          </p>
        ) : null}
        <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4 print:grid-cols-2">
          <div>
            <dt className="text-muted print:text-black">Responsable</dt>
            <dd className="font-semibold">{personName(session.responsible)}</dd>
          </div>
          <div>
            <dt className="text-muted print:text-black">Abrió</dt>
            <dd className="font-semibold">{personName(session.openedBy)}</dd>
            <dd className="text-xs text-muted print:text-black">
              {formatDateTime(session.openedAt)}
            </dd>
          </div>
          <div>
            <dt className="text-muted print:text-black">Solicitó cierre</dt>
            <dd className="font-semibold">
              {personName(session.closeRequestedBy)}
            </dd>
            <dd className="text-xs text-muted print:text-black">
              {session.closeRequestedAt
                ? formatDateTime(session.closeRequestedAt)
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-muted print:text-black">Aprobó diferencia</dt>
            <dd className="font-semibold">
              {personName(session.approvedBy)}
            </dd>
            <dd className="text-xs text-muted print:text-black">
              {session.approvedAt
                ? formatDateTime(session.approvedAt)
                : "No fue necesaria"}
            </dd>
          </div>
        </dl>
      </Card>

      <Card className="p-0 print:mt-4 print:border-black">
        <CardHeader
          className="mb-0 p-[18px] pb-3 print:p-4"
          title="Conciliación por medio"
          description="Lo esperado proviene de los movimientos confirmados; lo reportado fue escrito al cerrar."
        />
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-background print:bg-white">
              <tr>
                <th className="px-4 py-3 text-left">Medio</th>
                <th className="px-4 py-3 text-right">Esperado</th>
                <th className="px-4 py-3 text-right">Reportado</th>
                <th className="px-4 py-3 text-right">Diferencia</th>
              </tr>
            </thead>
            <tbody>
              {session.reconciliations.map((item) => (
                <tr key={item.id} className="border-t border-border print:border-black">
                  <td className="px-4 py-3 font-semibold">
                    {cashChannelLabels[item.channel]}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatMoney(item.expectedCents)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatMoney(item.reportedCents)}
                  </td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums">
                    {formatMoney(item.differenceCents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="print:mt-4 print:border-black print:p-4">
        <CardHeader
          title="Resumen del efectivo"
          description="Fórmula comprobable del dinero físico."
        />
        <dl className="grid gap-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt>Efectivo inicial</dt>
            <dd className="font-semibold tabular-nums">
              {formatMoney(session.openingCashCents)}
            </dd>
          </div>
          <div className="flex justify-between gap-3 border-t border-border pt-2 print:border-black">
            <dt>Efectivo esperado al cierre</dt>
            <dd className="font-bold tabular-nums">
              {formatMoney(session.expectedCashCents ?? 0)}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>Efectivo contado</dt>
            <dd className="font-bold tabular-nums">
              {formatMoney(session.countedCashCents ?? 0)}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>Diferencia</dt>
            <dd className="font-bold tabular-nums">
              {formatMoney(session.differenceCents ?? 0)}
            </dd>
          </div>
        </dl>
        {session.closeObservation ? (
          <div className="mt-4 rounded-[7px] bg-background p-3 text-sm whitespace-pre-line print:border print:border-black print:bg-white">
            <p className="font-semibold">Observación</p>
            <p className="mt-1">{session.closeObservation}</p>
          </div>
        ) : null}
      </Card>

      <Card className="p-0 print:mt-4 print:border-black">
        <CardHeader
          className="mb-0 p-[18px] pb-3 print:p-4"
          title="Movimientos incluidos"
          description={`${session.movements.length} registros que forman el cierre.`}
        />
        <div className="divide-y divide-border print:divide-black">
          {session.movements.map((movement) => (
            <div
              key={movement.id}
              className="flex items-start justify-between gap-4 px-[18px] py-3 text-sm print:px-4"
            >
              <div>
                <p className="font-semibold">{movement.description}</p>
                <p className="mt-0.5 text-xs text-muted print:text-black">
                  {cashMovementTypeLabels[movement.type]} ·{" "}
                  {cashChannelLabels[movement.channel]} ·{" "}
                  {formatDateTime(movement.occurredAt)}
                </p>
              </div>
              <p className="shrink-0 font-bold tabular-nums">
                {movement.type === "expense" ||
                movement.type === "refund"
                  ? "−"
                  : "+"}
                {formatMoney(movement.amountCents)}
              </p>
            </div>
          ))}
        </div>
      </Card>

      <div className="hidden grid-cols-2 gap-16 pt-16 text-center text-sm print:grid">
        <div className="border-t border-black pt-2">
          Firma del responsable de Caja
        </div>
        <div className="border-t border-black pt-2">
          Firma de Dirección, cuando corresponda
        </div>
      </div>
    </div>
  );
}
