import { ActionErrorToast } from "@/components/internal/ActionErrorToast";
import { Field, internalInputClassName } from "@/components/internal/Field";
import { SubmitButton } from "@/components/internal/SubmitButton";
import { buttonVariants } from "@/components/internal/ui/Button";
import { Card, CardHeader } from "@/components/internal/ui/Card";
import { Chip } from "@/components/internal/ui/Chip";
import { KpiCard } from "@/components/internal/ui/KpiCard";
import { PageHeader } from "@/components/internal/ui/PageHeader";
import { CashMovementFilters } from "@/features/cash/components/CashMovementFilters";
import { getBranchContext } from "@/features/branches/context";
import {
  approveCashSessionCloseAction,
  openCashSessionAction,
  requestCashSessionCloseAction,
  reverseCashMovementAction
} from "@/features/cash/actions";
import {
  cashChannelLabels,
  cashExpenseCategoryLabels,
  cashExpenseKindLabels,
  cashMovementTypeLabels,
  cashSessionStatusLabels,
  cashShiftLabels
} from "@/features/cash/labels";
import {
  defaultCashRegisterName,
  getCashCloseApprovalThresholdCents
} from "@/features/cash/policy";
import { roleHasPermission } from "@/features/internal-auth/permissions";
import { formatMoney } from "@/features/sales/labels";
import type {
  CashChannel,
  CashMovementType
} from "@/generated/prisma/client";
import { cn } from "@/lib/cn";
import {
  formatDateOnly,
  formatDateTime,
  todayDateOnly
} from "@/lib/dates";
import {
  getCashDashboard,
  getCashPersonnel
} from "@/modules/database/queries/cash";
import { requirePermission } from "@/modules/permissions";
import {
  Banknote,
  ExternalLink,
  LockKeyhole,
  Printer,
  ReceiptText
} from "lucide-react";
import Link from "next/link";
import { randomUUID } from "node:crypto";

type CashPageProps = {
  searchParams: Promise<{
    session?: string;
    type?: string;
    channel?: string;
    error?: string;
  }>;
};

const movementTypes = [
  "income",
  "expense",
  "adjustment",
  "refund",
  "reversal"
] as const satisfies readonly CashMovementType[];
const cashChannels = [
  "cash",
  "qr"
] as const satisfies readonly CashChannel[];

const cashErrorMessages: Record<string, string> = {
  "cash-invalid-session":
    "Revisa la fecha, el responsable y el efectivo inicial.",
  "cash-session-required":
    "No hay una Caja abierta. Primero abre la sesión del día.",
  "cash-session-stale-open":
    "Hay una Caja abierta de una fecha anterior. Debes cerrarla o regularizarla antes de operar hoy.",
  "cash-session-already-open":
    "Esta caja ya tiene una sesión abierta o esperando aprobación.",
  "cash-session-exceptional-required":
    "Hoy ya hubo una Caja cerrada. Para volver a cobrar en el mismo día, abre una Caja excepcional con motivo.",
  "cash-exceptional-reason-required":
    "La apertura excepcional requiere una descripción del motivo.",
  "cash-exceptional-prior-close-required":
    "La Caja excepcional solo se permite después de un cierre previo del mismo día.",
  "cash-invalid-expense": "Revisa los datos y los montos del egreso.",
  "cash-no-beneficiaries":
    "Escribe un monto para al menos un empleado beneficiario.",
  "cash-invalid-purchase":
    "Revisa el artículo, la cantidad, el precio y las personas responsables.",
  "cash-invalid-receipt":
    "El comprobante debe ser una imagen JPG, PNG o WebP y pesar como máximo 4 MB.",
  "cash-invalid-close":
    "Escribe los valores contados o reportados para todos los medios.",
  "cash-invalid-approval":
    "Dirección debe explicar brevemente por qué aprueba la diferencia.",
  "cash-invalid-correction":
    "Revisa el monto y escribe el motivo de la corrección.",
  "cash-correction-exceeds":
    "La devolución o el cambio devuelto supera el saldo que queda por corregir.",
  "cash-close-not-pending":
    "Esta Caja ya no está esperando una aprobación.",
  "cash-invalid-operation":
    "La operación no cumple las reglas de Caja y no fue registrada."
};

function personName(person: { name: string | null; email: string }) {
  return person.name ?? person.email;
}

function moneyInputDefault(cents: number) {
  return (Math.max(0, cents) / 100).toFixed(2);
}

function moneyInputMax(cents: number) {
  return (Math.max(0, cents) / 100).toFixed(2);
}

export default async function CashControlPage({
  searchParams
}: CashPageProps) {
  const user = await requirePermission("cash_sessions_read");
  const { activeBranch } = await getBranchContext(user);
  const query = await searchParams;
  const selectedType = movementTypes.includes(query.type as CashMovementType)
    ? (query.type as CashMovementType)
    : undefined;
  const selectedChannel = cashChannels.includes(
    query.channel as (typeof cashChannels)[number]
  )
    ? (query.channel as (typeof cashChannels)[number])
    : undefined;
  const [dashboard, personnel] = await Promise.all([
    getCashDashboard({
      sessionId: query.session,
      type: selectedType,
      channel: selectedChannel,
      branchCode: activeBranch.code
    }),
    getCashPersonnel(activeBranch.code)
  ]);
  const session = dashboard.session;
  const sessionResponsibles = personnel.filter(
    (person) =>
      person.role === "administracion" || person.role === "super_admin"
  );
  const canOpen = roleHasPermission(user.role, "cash_sessions_open");
  const canClose = roleHasPermission(user.role, "cash_sessions_close");
  const canApprove = roleHasPermission(user.role, "cash_sessions_approve");
  const canReverse = roleHasPermission(user.role, "cash_movements_reverse");
  const isCurrentSession = session?.id === dashboard.activeSessionId;
  const isOpen = isCurrentSession && session?.status === "open";
  const expected = dashboard.expected;
  const breakdown = dashboard.breakdown;
  const requiresExceptionalOpen =
    !dashboard.activeSessionId && dashboard.closedTodaySessions.length > 0;
  const errorMessage = query.error
    ? cashErrorMessages[query.error]
    : undefined;
  const threshold = getCashCloseApprovalThresholdCents();

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Control de Caja"
        description="Apertura, ingresos, salidas, conciliación y cierre diario"
        actions={
          <Link
            href="/sigeco/administracion"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Ventas y cobros
          </Link>
        }
      />

      <ActionErrorToast
        title="No se guardó la operación."
        message={errorMessage}
        preserveScrollKey="sigeco:cash-control-scroll"
      />

      {dashboard.activeSessionId && !isCurrentSession ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[9px] border border-primary/25 bg-primary/5 px-4 py-3 text-sm">
          <span>Estás revisando una Caja anterior.</span>
          <Link
            href="/sigeco/administracion/caja"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Volver a Caja actual
          </Link>
        </div>
      ) : null}

      {dashboard.staleOpenSession ? (
        <div
          className="rounded-[9px] border border-warning/30 bg-warning/10 px-4 py-3 text-sm"
          role="alert"
        >
          <p className="font-semibold text-warning">
            Hay una Caja abierta de una fecha anterior.
          </p>
          <p className="mt-1 text-text">
            {dashboard.staleOpenSession.registerName} quedó abierta el{" "}
            {formatDateOnly(dashboard.staleOpenSession.businessDate)}. Cierra o
            regulariza esa Caja antes de registrar cobros de hoy.
          </p>
        </div>
      ) : null}

      {!dashboard.activeSessionId && canOpen ? (
        <Card className="overflow-hidden">
          <div className="mb-4 grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
            <span className="grid size-14 place-items-center rounded-[14px] bg-primary/10 text-primary-dark ring-8 ring-primary/5">
              <Banknote className="h-7 w-7" aria-hidden="true" />
            </span>
            <CardHeader
              className="mb-0 p-0"
              title={
                requiresExceptionalOpen
                  ? "Abrir Caja excepcional de hoy"
                  : "Abrir la Caja de hoy"
              }
              description={
                requiresExceptionalOpen
                  ? "Ya hubo un cierre hoy. Esta apertura suma al día en curso y queda marcada para auditoría."
                  : "No hay una Caja abierta para operar. Abre la Caja del día antes de registrar movimientos."
              }
            />
          </div>
          <form action={openCashSessionAction} className="grid gap-3">
            <input type="hidden" name="branchCode" value={activeBranch.code} />
            {requiresExceptionalOpen ? (
              <input type="hidden" name="exceptional" value="true" />
            ) : null}
            <input
              type="hidden"
              name="idempotencyKey"
              value={randomUUID()}
            />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Sucursal">
                <input
                  className={internalInputClassName}
                  value={activeBranch.name}
                  readOnly
                />
              </Field>
              <Field label="Caja">
                <input
                  className={internalInputClassName}
                  name="registerName"
                  defaultValue={defaultCashRegisterName}
                  required
                />
              </Field>
              <Field label="Fecha de trabajo">
                <input
                  className={internalInputClassName}
                  type="date"
                  name="businessDate"
                  defaultValue={todayDateOnly()}
                  required
                />
              </Field>
              <Field label="Turno">
                <select
                  className={internalInputClassName}
                  name="shift"
                  defaultValue="full_day"
                >
                  {Object.entries(cashShiftLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Responsable">
                <select
                  className={internalInputClassName}
                  name="responsibleId"
                  defaultValue={
                    sessionResponsibles.some((person) => person.id === user.id)
                      ? user.id
                      : ""
                  }
                  required
                >
                  <option value="">Seleccionar</option>
                  {sessionResponsibles.map((person) => (
                    <option key={person.id} value={person.id}>
                      {personName(person)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Efectivo inicial Bs">
                <input
                  className={internalInputClassName}
                  name="openingCash"
                  inputMode="decimal"
                  placeholder="0.00"
                  required
                />
              </Field>
            </div>
            {requiresExceptionalOpen ? (
              <Field label="Motivo de apertura excepcional">
                <textarea
                  className={`${internalInputClassName} min-h-20 py-3`}
                  name="exceptionalReason"
                  placeholder="Ej. Venta posterior al cierre ordinario; paciente llegó a las 18:20."
                  required
                />
              </Field>
            ) : null}
            <SubmitButton className="w-full sm:w-fit">
              {requiresExceptionalOpen ? "Abrir Caja excepcional" : "Abrir Caja"}
            </SubmitButton>
          </form>
        </Card>
      ) : null}

      {session && expected && breakdown ? (
        <>
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-sora text-lg font-bold text-text">
                    {session.registerName}
                  </h3>
                  <Chip
                    tone={
                      session.status === "open"
                        ? "success"
                        : session.status === "pending_approval"
                          ? "warning"
                          : "neutral"
                    }
                    dot
                    className={cn(
                      "px-3 py-1 text-xs shadow-sm",
                      session.status === "open" &&
                        "border border-success/25 bg-success/15 text-success"
                    )}
                  >
                    {cashSessionStatusLabels[session.status]}
                  </Chip>
                  {session.exceptional ? (
                    <Chip tone="warning">Excepcional</Chip>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-muted">
                  {activeBranch.name} · {formatDateOnly(session.businessDate)} ·{" "}
                  {cashShiftLabels[session.shift]}
                </p>
                <p className="mt-1 text-xs text-muted">
                  Responsable: {personName(session.responsible)} · Abierta{" "}
                  {formatDateTime(session.openedAt)}
                </p>
                {session.exceptional ? (
                  <p className="mt-2 rounded-[7px] border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
                    Caja abierta excepcionalmente después de un cierre previo.
                    {session.exceptionalReason ? ` Motivo: ${session.exceptionalReason}` : ""}
                  </p>
                ) : null}
              </div>
              {session.status !== "open" ? (
                <Link
                  href={`/sigeco/administracion/caja/cierres/${session.id}`}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  <Printer className="h-4 w-4" aria-hidden="true" />
                  Ver cierre
                </Link>
              ) : null}
            </div>
          </Card>

          <section className="grid grid-cols-2 gap-2">
            <KpiCard
              icon={Banknote}
              label="Efectivo esperado"
              value={formatMoney(expected.cash)}
              compactMobile
            />
            <KpiCard
              icon={ReceiptText}
              label="QR"
              value={formatMoney(expected.qr)}
              compactMobile
            />
          </section>

          <Card className="p-0">
            <CardHeader
              className="mb-0 p-[18px] pb-3"
              title="Movimientos"
              description="Reporte diario de ingresos, egresos y cambios devueltos."
            />
            <CashMovementFilters
              sessionId={session.id}
              selectedType={selectedType}
              selectedChannel={selectedChannel}
              typeOptions={movementTypes.map((type) => ({
                value: type,
                label: cashMovementTypeLabels[type]
              }))}
              channelOptions={cashChannels.map((channel) => ({
                value: channel,
                label: cashChannelLabels[channel]
              }))}
            />
            <div className="grid gap-2 bg-background p-3">
              {session.movements.map((movement) => {
                const isOutflow =
                  movement.type === "expense" ||
                  movement.type === "refund";
                const isExpenseMovement = movement.type === "expense";
                const correctedCents = movement.corrections.reduce(
                  (sum, correction) => sum + correction.amountCents,
                  0
                );
                const remainingCents =
                  movement.amountCents - correctedCents;
                const maximumCorrectionCents = isExpenseMovement
                  ? Math.min(remainingCents, remainingCents - 1)
                  : remainingCents;

                return (
                  <article
                    key={movement.id}
                    className={cn(
                      "grid gap-3 rounded-[9px] border px-3 py-3 shadow-sm lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start",
                      movement.type === "income"
                        ? "border-success/25 bg-success/5"
                        : isOutflow
                          ? "border-error/25 bg-error/5"
                          : movement.type === "reversal"
                            ? "border-primary/20 bg-primary/5"
                            : "border-border bg-surface"
                    )}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-text">
                          {movement.description}
                        </p>
                        <Chip
                          tone={
                            movement.type === "income" ||
                            movement.type === "reversal"
                              ? "success"
                              : movement.type === "refund"
                                ? "warning"
                                : movement.type === "expense"
                                  ? "error"
                                  : "neutral"
                          }
                        >
                          {cashMovementTypeLabels[movement.type]}
                        </Chip>
                        <Chip>{cashChannelLabels[movement.channel]}</Chip>
                      </div>
                      <p className="mt-1 text-xs text-muted">
                        {formatDateTime(movement.occurredAt)} · Registró{" "}
                        {movement.user
                          ? personName(movement.user)
                          : "Usuario anterior"}
                      </p>
                      {movement.reason ? (
                        <p className="mt-2 text-sm text-text">
                          Motivo: {movement.reason}
                        </p>
                      ) : null}
                      {movement.expense ? (
                        <div className="mt-2 grid gap-2 rounded-[7px] border border-border/70 bg-background px-2.5 py-2 text-[11px] leading-4 text-muted">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-semibold text-text">
                              {cashExpenseKindLabels[movement.expense.kind]}
                            </span>
                            <span className="text-muted">·</span>
                            <span>
                              {
                                cashExpenseCategoryLabels[
                                  movement.expense.category
                                ]
                              }
                            </span>
                          </div>
                          <p className="truncate">
                            Recibe{" "}
                            <span className="font-medium text-text">
                              {movement.expense.receivedBy
                                ? personName(movement.expense.receivedBy)
                                : "No registrado"}
                            </span>{" "}
                            · Entrega {personName(movement.expense.deliveredBy)}{" "}
                            · Autoriza {personName(movement.expense.authorizedBy)}
                          </p>
                          {movement.expense.beneficiaries.length > 0 ? (
                            <ul className="flex flex-wrap gap-1">
                              {movement.expense.beneficiaries.map((line) => (
                                <li
                                  key={line.id}
                                  className="rounded-full bg-surface px-2 py-0.5 font-medium text-text"
                                >
                                  {personName(line.employee)}:{" "}
                                  {formatMoney(line.amountCents)}
                                </li>
                              ))}
                            </ul>
                          ) : null}
                          {movement.expense.itemDescription ? (
                            <p>
                              {movement.expense.quantity &&
                              movement.expense.unitPriceCents
                                ? `${movement.expense.quantity} × ${movement.expense.itemDescription} a ${formatMoney(
                                    movement.expense.unitPriceCents
                                  )}`
                                : movement.expense.itemDescription}
                            </p>
                          ) : null}
                          {movement.expense.note ? (
                            <p className="whitespace-pre-line rounded-[6px] bg-surface px-2 py-1 text-text">
                              {movement.expense.note}
                            </p>
                          ) : null}
                          {movement.expense.requiresInventoryEntry ? (
                            <p className="font-semibold text-warning">
                              Pendiente de ingreso a inventario
                            </p>
                          ) : null}
                          {movement.expense.receiptStorageKey ? (
                            <a
                              className="inline-flex items-center gap-1 font-semibold text-primary-dark hover:underline"
                              href={`/sigeco/api/cash-receipts/${movement.expense.id}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Abrir comprobante
                              <ExternalLink
                                className="h-3.5 w-3.5"
                                aria-hidden="true"
                              />
                            </a>
                          ) : null}
                        </div>
                      ) : null}
                      {movement.originalMovement ? (
                        <p className="mt-2 text-xs text-muted">
                          Corrige: {movement.originalMovement.description} (
                          {formatMoney(
                            movement.originalMovement.amountCents
                          )}
                          )
                        </p>
                      ) : null}
                    </div>
                    <div className="text-left lg:text-right">
                      <p
                        className={cn(
                          "font-sora text-lg font-bold tabular-nums",
                          isOutflow ? "text-error" : "text-success"
                        )}
                      >
                        {isOutflow ? "−" : "+"}
                        {formatMoney(movement.amountCents)}
                      </p>
                      {correctedCents > 0 ? (
                        <p className="mt-1 text-xs tabular-nums text-muted">
                          Corregido {formatMoney(correctedCents)}
                        </p>
                      ) : null}
                      {canReverse &&
                      dashboard.activeSessionId &&
                      dashboard.activeSessionStatus === "open" &&
                      isExpenseMovement &&
                      movement.expense?.kind === "staff_support" &&
                      maximumCorrectionCents > 0 ? (
                        <details className="mt-2 text-left lg:w-80">
                          <summary className="cursor-pointer text-xs font-semibold text-primary-dark">
                            Registrar cambio devuelto
                          </summary>
                          <form
                            action={reverseCashMovementAction}
                            className="mt-2 grid gap-2 rounded-[9px] border border-border bg-background p-3"
                          >
                            <input
                              type="hidden"
                              name="originalMovementId"
                              value={movement.id}
                            />
                            <input
                              type="hidden"
                              name="idempotencyKey"
                              value={randomUUID()}
                            />
                            <input
                              type="hidden"
                              name="reason"
                              value="Cambio devuelto"
                            />
                            <div className="rounded-[8px] border border-border bg-surface px-3 py-2">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
                                Monto entregado
                              </p>
                              <p className="mt-0.5 font-sora text-base font-bold tabular-nums text-text">
                                {formatMoney(movement.amountCents)}
                              </p>
                            </div>
                            <Field label="Cambio devuelto Bs">
                              <input
                                className={internalInputClassName}
                                name="amount"
                                inputMode="decimal"
                                placeholder="0.00"
                                defaultValue={undefined}
                                max={moneyInputMax(maximumCorrectionCents)}
                                step="0.01"
                                required
                              />
                            </Field>
                            <Field label="Nota opcional">
                              <textarea
                                className={`${internalInputClassName} min-h-16 py-2`}
                                name="note"
                              />
                            </Field>
                            <SubmitButton size="sm" variant="danger">
                              Registrar cambio
                            </SubmitButton>
                          </form>
                        </details>
                      ) : null}
                    </div>
                  </article>
                );
              })}
              {session.movements.length === 0 ? (
                <div className="px-[18px] py-10 text-center text-sm text-muted">
                  No hay movimientos con estos filtros.
                </div>
              ) : null}
            </div>
          </Card>

          {session.status === "pending_approval" ? (
            <Card className="border-warning/35 bg-warning/5">
              <CardHeader
                title="Cierre esperando a Dirección"
                description={`La diferencia supera el límite de ${formatMoney(
                  threshold
                )}. Mientras tanto, esta Caja no acepta movimientos.`}
              />
              <dl className="mb-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-muted">Efectivo esperado</dt>
                  <dd className="font-bold tabular-nums">
                    {formatMoney(session.expectedCashCents ?? 0)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Diferencia</dt>
                  <dd className="font-bold tabular-nums text-warning">
                    {formatMoney(session.differenceCents ?? 0)}
                  </dd>
                </div>
              </dl>
              {canApprove ? (
                <form
                  action={approveCashSessionCloseAction}
                  className="grid gap-3"
                >
                  <input
                    type="hidden"
                    name="cashSessionId"
                    value={session.id}
                  />
                  <Field label="Explicación de la aprobación">
                    <textarea
                      className={`${internalInputClassName} min-h-24 py-3`}
                      name="observation"
                      placeholder="Describe la revisión realizada y por qué se acepta la diferencia."
                      required
                    />
                  </Field>
                  <SubmitButton>Aprobar diferencia y cerrar Caja</SubmitButton>
                </form>
              ) : (
                <p className="text-sm text-muted">
                  Solo Dirección puede aprobar la diferencia y completar el
                  cierre.
                </p>
              )}
            </Card>
          ) : null}

          {dashboard.dailySummary ? (
            <section className="overflow-hidden rounded-[9px] border border-border bg-surface shadow-sm">
              <div className="border-b border-dashed border-border bg-background px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                  Comprobante preliminar
                </p>
                <div className="mt-1 flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <h3 className="font-sora text-base font-bold text-text">
                      Resumen del día
                    </h3>
                    <p className="text-xs text-muted">
                      {formatDateOnly(session.businessDate)} ·{" "}
                      {session.registerName}
                    </p>
                  </div>
                  <p className="font-sora text-lg font-bold tabular-nums text-primary-dark">
                    {formatMoney(dashboard.dailySummary.totalCents)}
                  </p>
                </div>
                <p className="mt-2 text-xs text-muted">
                  Este total muestra solo cobros/ventas del día. No incluye
                  efectivo inicial ni resta egresos.
                </p>
              </div>
              <div className="grid divide-y divide-border text-sm sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                <div className="px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
                    Caja ordinaria
                  </p>
                  <p className="mt-1 font-sora text-base font-bold tabular-nums text-text">
                    {formatMoney(dashboard.dailySummary.regularCents)}
                  </p>
                  <p className="text-xs text-muted">
                    {dashboard.dailySummary.regularSessions} caja(s)
                  </p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-warning">
                    Caja excepcional
                  </p>
                  <p className="mt-1 font-sora text-base font-bold tabular-nums text-text">
                    {formatMoney(dashboard.dailySummary.exceptionalCents)}
                  </p>
                  <p className="text-xs text-muted">
                    {dashboard.dailySummary.exceptionalSessions} caja(s)
                  </p>
                </div>
                <div className="px-4 py-3 bg-primary/5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-primary-dark">
                    Total del día
                  </p>
                  <p className="mt-1 font-sora text-base font-bold tabular-nums text-text">
                    {formatMoney(dashboard.dailySummary.totalCents)}
                  </p>
                  <p className="text-xs text-muted">Ingresos cobrados</p>
                </div>
              </div>
            </section>
          ) : null}

          {isOpen && canClose ? (
            <Card className="overflow-hidden border-primary/20 p-0">
              <div className="border-b border-dashed border-border bg-primary/5 px-[18px] py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-primary-dark">
                  Comprobante de cierre
                </p>
                <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-sora text-lg font-bold text-text">
                      Cerrar y conciliar
                    </h3>
                    <p className="text-sm text-muted">
                      Los importes calculados no se editan. Si hay faltante o
                      sobrante, déjalo anotado antes de cerrar.
                    </p>
                  </div>
                  <Chip tone="primary">
                    Límite {formatMoney(threshold)}
                  </Chip>
                </div>
              </div>
              <form
                action={requestCashSessionCloseAction}
                className="grid gap-4 p-[18px]"
              >
                <input
                  type="hidden"
                  name="cashSessionId"
                  value={session.id}
                />
                <input
                  type="hidden"
                  name="cash"
                  value={moneyInputDefault(expected.cash)}
                />
                <input
                  type="hidden"
                  name="qr"
                  value={moneyInputDefault(expected.qr)}
                />
                <div className="grid gap-2 rounded-[9px] border border-border bg-background p-3">
                  <div className="flex items-center justify-between gap-3 border-b border-dashed border-border pb-2">
                    <span className="text-sm text-muted">
                      Efectivo inicial
                    </span>
                    <span className="font-medium tabular-nums text-text">
                      {formatMoney(breakdown.openingCashCents)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-b border-dashed border-border pb-2">
                    <span className="text-sm text-muted">
                      Ingresos en efectivo
                    </span>
                    <span className="font-medium tabular-nums text-success">
                      +{formatMoney(breakdown.cashIncomeCents)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-b border-dashed border-border pb-2">
                    <span className="text-sm text-muted">
                      Egresos y devoluciones en efectivo
                    </span>
                    <span className="font-medium tabular-nums text-error">
                      -{formatMoney(
                        breakdown.cashExpenseCents +
                          breakdown.cashRefundCents
                      )}
                    </span>
                  </div>
                  {breakdown.cashReversalCents > 0 ? (
                    <div className="flex items-center justify-between gap-3 border-b border-dashed border-border pb-2">
                      <span className="text-sm text-muted">
                        Cambios devueltos
                      </span>
                      <span className="font-medium tabular-nums text-success">
                        +{formatMoney(breakdown.cashReversalCents)}
                      </span>
                    </div>
                  ) : null}
                  <div className="flex items-center justify-between gap-3 border-b border-dashed border-border pb-2">
                    <span className="text-sm font-semibold text-text">
                      Efectivo esperado
                    </span>
                    <span className="font-sora text-base font-bold tabular-nums text-text">
                      {formatMoney(expected.cash)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-b border-dashed border-border pb-2">
                    <span className="text-sm font-semibold text-text">
                      QR reportado
                    </span>
                    <span className="font-sora text-base font-bold tabular-nums text-text">
                      {formatMoney(expected.qr)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 pt-1">
                    <span className="text-sm font-semibold text-primary-dark">
                      Total conciliado
                    </span>
                    <span className="font-sora text-lg font-bold tabular-nums text-primary-dark">
                      {formatMoney(expected.cash + expected.qr)}
                    </span>
                  </div>
                </div>
                <Field label="Faltante, sobrante u observación">
                  <textarea
                    className={`${internalInputClassName} min-h-24 py-3`}
                    name="observation"
                    placeholder="Ej. faltan Bs 20 por cambio no devuelto, sobran Bs 10 por redondeo, o cierre sin diferencias."
                  />
                </Field>
                <SubmitButton className="w-full">
                  <LockKeyhole className="h-4 w-4" aria-hidden="true" />
                  Cerrar Caja
                </SubmitButton>
              </form>
            </Card>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
