import { randomUUID } from "node:crypto";
import Link from "next/link";
import {
  ArrowLeftRight,
  Banknote,
  Camera,
  ExternalLink,
  HandCoins,
  History,
  LockKeyhole,
  Printer,
  ReceiptText,
  WalletCards
} from "lucide-react";
import type {
  CashChannel,
  CashMovementType
} from "@/generated/prisma/client";
import { Field, internalInputClassName } from "@/components/internal/Field";
import { SubmitButton } from "@/components/internal/SubmitButton";
import { buttonVariants } from "@/components/internal/ui/Button";
import { Card, CardHeader } from "@/components/internal/ui/Card";
import { Chip } from "@/components/internal/ui/Chip";
import { CollapsibleSection } from "@/components/internal/ui/CollapsibleSection";
import { KpiCard } from "@/components/internal/ui/KpiCard";
import { PageHeader } from "@/components/internal/ui/PageHeader";
import {
  approveCashSessionCloseAction,
  createOtherCashExpenseAction,
  createStaffCashExpenseAction,
  createUrgentPurchaseExpenseAction,
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
import { getBranchContext } from "@/features/branches/context";

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
  "qr",
  "card",
  "transfer",
  "other"
] as const satisfies readonly CashChannel[];

const cashErrorMessages: Record<string, string> = {
  "cash-invalid-session":
    "Revisa la fecha, el responsable y el efectivo inicial.",
  "cash-session-required":
    "No hay una Caja abierta. Primero abre la sesión del día.",
  "cash-session-already-open":
    "Esta caja ya tiene una sesión abierta o esperando aprobación.",
  "cash-invalid-expense": "Revisa los datos y los montos del egreso.",
  "cash-no-beneficiaries":
    "Escribe un monto para al menos un empleado beneficiario.",
  "cash-invalid-purchase":
    "Revisa el artículo, la cantidad, el precio y las personas responsables.",
  "cash-invalid-receipt":
    "El comprobante debe ser PDF, JPG, PNG o WebP y pesar como máximo 4 MB.",
  "cash-invalid-close":
    "Escribe los valores contados o reportados para todos los medios.",
  "cash-invalid-approval":
    "Dirección debe explicar brevemente por qué aprueba la diferencia.",
  "cash-invalid-correction":
    "Revisa el monto y escribe el motivo de la corrección.",
  "cash-correction-exceeds":
    "La devolución o el reintegro supera el saldo que queda por corregir.",
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

export default async function CashControlPage({
  searchParams
}: CashPageProps) {
  const user = await requirePermission("cash_sessions_read");
  const { activeBranch } = await getBranchContext(user);
  const query = await searchParams;
  const selectedType = movementTypes.includes(query.type as CashMovementType)
    ? (query.type as CashMovementType)
    : undefined;
  const selectedChannel = cashChannels.includes(query.channel as CashChannel)
    ? (query.channel as CashChannel)
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
  const authorizers = personnel.filter(
    (person) =>
      person.role === "direccion" || person.role === "super_admin"
  );
  const sessionResponsibles = personnel.filter(
    (person) =>
      person.role === "administracion" || person.role === "super_admin"
  );
  const canOpen = roleHasPermission(user.role, "cash_sessions_open");
  const canMove = roleHasPermission(user.role, "cash_movements_create");
  const canClose = roleHasPermission(user.role, "cash_sessions_close");
  const canApprove = roleHasPermission(user.role, "cash_sessions_approve");
  const canReverse = roleHasPermission(user.role, "cash_movements_reverse");
  const isCurrentSession = session?.id === dashboard.activeSessionId;
  const isOpen = isCurrentSession && session?.status === "open";
  const expected = dashboard.expected;
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

      {errorMessage ? (
        <div
          className="rounded-[9px] border border-error/30 bg-error/10 px-4 py-3 text-sm text-error"
          role="alert"
        >
          <p className="font-semibold">No se guardó la operación.</p>
          <p className="mt-1">{errorMessage}</p>
        </div>
      ) : null}

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

      {!dashboard.activeSessionId && canOpen ? (
        <Card>
          <CardHeader
            title="Abrir la Caja de hoy"
            description="Registra quién será responsable y cuánto efectivo existe antes del primer cobro."
          />
          <form action={openCashSessionAction} className="grid gap-3">
            <input type="hidden" name="branchCode" value={activeBranch.code} />
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
            <SubmitButton className="w-full sm:w-fit">
              Abrir Caja
            </SubmitButton>
          </form>
        </Card>
      ) : null}

      {session && expected ? (
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
                  >
                    {cashSessionStatusLabels[session.status]}
                  </Chip>
                </div>
                <p className="mt-1 text-sm text-muted">
                  {activeBranch.name} · {formatDateOnly(session.businessDate)} ·{" "}
                  {cashShiftLabels[session.shift]}
                </p>
                <p className="mt-1 text-xs text-muted">
                  Responsable: {personName(session.responsible)} · Abierta{" "}
                  {formatDateTime(session.openedAt)}
                </p>
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

          <section className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
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
            <KpiCard
              icon={WalletCards}
              label="Tarjeta"
              value={formatMoney(expected.card)}
              compactMobile
            />
            <KpiCard
              icon={ArrowLeftRight}
              label="Transferencia"
              value={formatMoney(expected.transfer)}
              compactMobile
            />
            <KpiCard
              icon={HandCoins}
              label="Otro medio"
              value={formatMoney(expected.other)}
              compactMobile
            />
          </section>

          {isOpen && canMove ? (
            <Card>
              <CardHeader
                title="Registrar una salida de dinero"
                description="En móvil puedes completar solo el bloque que necesitas."
              />
              <div className="grid gap-3">
                <CollapsibleSection
                  title="Dinero al personal"
                  description="Almuerzo, transporte u otro apoyo, separado por empleado."
                >
                  <form
                    action={createStaffCashExpenseAction}
                    className="grid gap-3"
                  >
                    <input
                      type="hidden"
                      name="cashSessionId"
                      value={session.id}
                    />
                    <input
                      type="hidden"
                      name="idempotencyKey"
                      value={randomUUID()}
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Categoría">
                        <select
                          className={internalInputClassName}
                          name="category"
                          defaultValue="lunch"
                        >
                          <option value="lunch">Almuerzo</option>
                          <option value="transport">Transporte</option>
                          <option value="staff_other">Otro apoyo</option>
                        </select>
                      </Field>
                      <Field label="Persona que entrega">
                        <select
                          className={internalInputClassName}
                          name="deliveredById"
                          defaultValue={user.id}
                          required
                        >
                          {personnel.map((person) => (
                            <option key={person.id} value={person.id}>
                              {personName(person)}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>
                    <fieldset className="grid gap-2 rounded-[9px] border border-border p-3">
                      <legend className="px-1 text-[13px] font-semibold text-text">
                        Beneficiarios y monto individual
                      </legend>
                      <p className="text-xs text-muted">
                        Deja vacío a quien no recibió dinero. SIGECO sumará las
                        líneas para obtener el total.
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {personnel.map((person) => (
                          <Field
                            key={person.id}
                            label={`${personName(person)} · Bs`}
                          >
                            <input
                              className={internalInputClassName}
                              name={`beneficiary:${person.id}`}
                              inputMode="decimal"
                              placeholder="0.00"
                            />
                          </Field>
                        ))}
                      </div>
                    </fieldset>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Autorizado por">
                        <select
                          className={internalInputClassName}
                          name="authorizedById"
                          defaultValue=""
                          required
                        >
                          <option value="">Seleccionar Dirección</option>
                          {authorizers.map((person) => (
                            <option key={person.id} value={person.id}>
                              {personName(person)}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Motivo">
                        <input
                          className={internalInputClassName}
                          name="reason"
                          placeholder="Ej. Almuerzo del personal de turno"
                          required
                        />
                      </Field>
                    </div>
                    <Field label="Nota opcional">
                      <textarea
                        className={`${internalInputClassName} min-h-20 py-3`}
                        name="note"
                      />
                    </Field>
                    <SubmitButton>Registrar entrega</SubmitButton>
                  </form>
                </CollapsibleSection>

                <CollapsibleSection
                  title="Compra urgente"
                  description="Insumos que deben comprarse en ese momento con dinero de Caja."
                >
                  <form
                    action={createUrgentPurchaseExpenseAction}
                    className="grid gap-3"
                  >
                    <input
                      type="hidden"
                      name="cashSessionId"
                      value={session.id}
                    />
                    <input
                      type="hidden"
                      name="idempotencyKey"
                      value={randomUUID()}
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Categoría">
                        <select
                          className={internalInputClassName}
                          name="category"
                          defaultValue="clinical_material"
                        >
                          <option value="injectables">Inyectables</option>
                          <option value="clinical_material">
                            Material clínico
                          </option>
                          <option value="cleaning">Limpieza</option>
                          <option value="office">Oficina</option>
                          <option value="other">Otro</option>
                        </select>
                      </Field>
                      <Field label="Artículo">
                        <input
                          className={internalInputClassName}
                          name="itemDescription"
                          placeholder="Ej. Jeringas de 5 ml"
                          required
                        />
                      </Field>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
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
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <Field label="Solicitante">
                        <select
                          className={internalInputClassName}
                          name="requestedById"
                          defaultValue=""
                          required
                        >
                          <option value="">Seleccionar</option>
                          {personnel.map((person) => (
                            <option key={person.id} value={person.id}>
                              {personName(person)}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Recibe el dinero">
                        <select
                          className={internalInputClassName}
                          name="receivedById"
                          defaultValue=""
                          required
                        >
                          <option value="">Seleccionar</option>
                          {personnel.map((person) => (
                            <option key={person.id} value={person.id}>
                              {personName(person)}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Entrega el dinero">
                        <select
                          className={internalInputClassName}
                          name="deliveredById"
                          defaultValue={user.id}
                          required
                        >
                          {personnel.map((person) => (
                            <option key={person.id} value={person.id}>
                              {personName(person)}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Autorizado por">
                        <select
                          className={internalInputClassName}
                          name="authorizedById"
                          defaultValue=""
                          required
                        >
                          <option value="">Seleccionar Dirección</option>
                          {authorizers.map((person) => (
                            <option key={person.id} value={person.id}>
                              {personName(person)}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Proveedor opcional">
                        <input
                          className={internalInputClassName}
                          name="supplierName"
                        />
                      </Field>
                      <Field label="Motivo de urgencia">
                        <input
                          className={internalInputClassName}
                          name="urgencyReason"
                          placeholder="Explica por qué no puede esperar"
                          required
                        />
                      </Field>
                    </div>
                    <Field label="Comprobante opcional">
                      <div className="relative">
                        <Camera
                          className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted"
                          aria-hidden="true"
                        />
                        <input
                          className={`${internalInputClassName} py-2 pl-10 file:mr-3 file:rounded-[7px] file:border-0 file:bg-surface-soft file:px-3 file:py-1.5 file:text-xs file:font-semibold`}
                          type="file"
                          name="receipt"
                          accept="image/jpeg,image/png,image/webp,application/pdf"
                          capture="environment"
                        />
                      </div>
                    </Field>
                    <label className="flex min-h-11 items-center gap-3 rounded-[9px] border border-border px-3.5 text-sm text-text">
                      <input
                        type="checkbox"
                        name="requiresInventoryEntry"
                        className="h-5 w-5 accent-primary"
                      />
                      Este artículo debe ingresar después al inventario
                    </label>
                    <Field label="Nota opcional">
                      <textarea
                        className={`${internalInputClassName} min-h-20 py-3`}
                        name="note"
                      />
                    </Field>
                    <SubmitButton>Registrar compra urgente</SubmitButton>
                  </form>
                </CollapsibleSection>

                <CollapsibleSection
                  title="Otro egreso"
                  description="Salida de efectivo que no corresponde a personal ni compra urgente."
                >
                  <form
                    action={createOtherCashExpenseAction}
                    className="grid gap-3"
                  >
                    <input
                      type="hidden"
                      name="cashSessionId"
                      value={session.id}
                    />
                    <input
                      type="hidden"
                      name="idempotencyKey"
                      value={randomUUID()}
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Monto Bs">
                        <input
                          className={internalInputClassName}
                          name="amount"
                          inputMode="decimal"
                          placeholder="0.00"
                          required
                        />
                      </Field>
                      <Field label="Persona que recibe">
                        <select
                          className={internalInputClassName}
                          name="receivedById"
                          defaultValue=""
                          required
                        >
                          <option value="">Seleccionar</option>
                          {personnel.map((person) => (
                            <option key={person.id} value={person.id}>
                              {personName(person)}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Persona que entrega">
                        <select
                          className={internalInputClassName}
                          name="deliveredById"
                          defaultValue={user.id}
                          required
                        >
                          {personnel.map((person) => (
                            <option key={person.id} value={person.id}>
                              {personName(person)}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Autorizado por">
                        <select
                          className={internalInputClassName}
                          name="authorizedById"
                          defaultValue=""
                          required
                        >
                          <option value="">Seleccionar Dirección</option>
                          {authorizers.map((person) => (
                            <option key={person.id} value={person.id}>
                              {personName(person)}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>
                    <Field label="Motivo">
                      <input
                        className={internalInputClassName}
                        name="reason"
                        required
                      />
                    </Field>
                    <Field label="Nota opcional">
                      <textarea
                        className={`${internalInputClassName} min-h-20 py-3`}
                        name="note"
                      />
                    </Field>
                    <SubmitButton>Registrar egreso</SubmitButton>
                  </form>
                </CollapsibleSection>
              </div>
            </Card>
          ) : null}

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
                  <SubmitButton>
                    Aprobar diferencia y cerrar Caja
                  </SubmitButton>
                </form>
              ) : (
                <p className="text-sm text-muted">
                  Solo Dirección puede aprobar la diferencia y completar el
                  cierre.
                </p>
              )}
            </Card>
          ) : null}

          {isOpen && canClose ? (
            <Card>
              <CardHeader
                title="Cerrar y conciliar"
                description={`Cuenta el efectivo y copia los totales de QR, tarjeta y transferencias. Diferencias mayores a ${formatMoney(
                  threshold
                )} pasan a Dirección.`}
              />
              <form
                action={requestCashSessionCloseAction}
                className="grid gap-3"
              >
                <input
                  type="hidden"
                  name="cashSessionId"
                  value={session.id}
                />
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                  {cashChannels.map((channel) => (
                    <Field
                      key={channel}
                      label={
                        channel === "cash"
                          ? "Efectivo contado Bs"
                          : `${cashChannelLabels[channel]} reportado Bs`
                      }
                    >
                      <input
                        className={internalInputClassName}
                        name={channel}
                        inputMode="decimal"
                        defaultValue={moneyInputDefault(expected[channel])}
                        required
                      />
                    </Field>
                  ))}
                </div>
                <Field label="Observación del cierre">
                  <textarea
                    className={`${internalInputClassName} min-h-20 py-3`}
                    name="observation"
                    placeholder="Explica cualquier diferencia o hecho importante del turno."
                  />
                </Field>
                <SubmitButton>
                  <LockKeyhole className="h-4 w-4" aria-hidden="true" />
                  Comprobar y cerrar
                </SubmitButton>
              </form>
            </Card>
          ) : null}

          <Card className="p-0">
            <CardHeader
              className="mb-0 p-[18px] pb-3"
              title="Movimientos"
              description="Ingresos, egresos y correcciones conservados en orden cronológico."
            />
            <form
              method="get"
              className="grid gap-2 border-y border-border bg-background px-[18px] py-3 sm:grid-cols-[1fr_1fr_auto]"
            >
              <input type="hidden" name="session" value={session.id} />
              <select
                className={internalInputClassName}
                name="type"
                defaultValue={selectedType ?? ""}
                aria-label="Filtrar por tipo"
              >
                <option value="">Todos los tipos</option>
                {movementTypes.map((type) => (
                  <option key={type} value={type}>
                    {cashMovementTypeLabels[type]}
                  </option>
                ))}
              </select>
              <select
                className={internalInputClassName}
                name="channel"
                defaultValue={selectedChannel ?? ""}
                aria-label="Filtrar por medio"
              >
                <option value="">Todos los medios</option>
                {cashChannels.map((channel) => (
                  <option key={channel} value={channel}>
                    {cashChannelLabels[channel]}
                  </option>
                ))}
              </select>
              <SubmitButton variant="outline">Filtrar</SubmitButton>
            </form>
            <div className="divide-y divide-border">
              {session.movements.map((movement) => {
                const isOutflow =
                  movement.type === "expense" ||
                  movement.type === "refund";
                const correctedCents = movement.corrections.reduce(
                  (sum, correction) => sum + correction.amountCents,
                  0
                );
                const remainingCents =
                  movement.amountCents - correctedCents;

                return (
                  <article
                    key={movement.id}
                    className="grid gap-3 px-[18px] py-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start"
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
                        <div className="mt-2 rounded-[7px] bg-background p-3 text-xs text-muted">
                          <p className="font-semibold text-text">
                            {cashExpenseKindLabels[movement.expense.kind]} ·{" "}
                            {
                              cashExpenseCategoryLabels[
                                movement.expense.category
                              ]
                            }
                          </p>
                          <p className="mt-1">
                            Entregó{" "}
                            {personName(movement.expense.deliveredBy)} ·
                            Autorizó{" "}
                            {personName(movement.expense.authorizedBy)}
                          </p>
                          {movement.expense.beneficiaries.length > 0 ? (
                            <ul className="mt-2 grid gap-1">
                              {movement.expense.beneficiaries.map((line) => (
                                <li key={line.id}>
                                  {personName(line.employee)}:{" "}
                                  {formatMoney(line.amountCents)}
                                </li>
                              ))}
                            </ul>
                          ) : null}
                          {movement.expense.itemDescription ? (
                            <p className="mt-2">
                              {movement.expense.quantity} ×{" "}
                              {movement.expense.itemDescription} a{" "}
                              {formatMoney(
                                movement.expense.unitPriceCents ?? 0
                              )}
                            </p>
                          ) : null}
                          {movement.expense.requiresInventoryEntry ? (
                            <p className="mt-1 font-semibold text-warning">
                              Pendiente de ingreso a inventario
                            </p>
                          ) : null}
                          {movement.expense.receiptStorageKey ? (
                            <a
                              className="mt-2 inline-flex items-center gap-1 font-semibold text-primary-dark hover:underline"
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
                      (movement.type === "income" ||
                        movement.type === "expense") &&
                      remainingCents > 0 ? (
                        <details className="mt-2 text-left lg:w-80">
                          <summary className="cursor-pointer text-xs font-semibold text-primary-dark">
                            Registrar corrección
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
                            <Field label="Monto Bs">
                              <input
                                className={internalInputClassName}
                                name="amount"
                                inputMode="decimal"
                                defaultValue={moneyInputDefault(
                                  remainingCents
                                )}
                                required
                              />
                            </Field>
                            <Field label="Motivo obligatorio">
                              <input
                                className={internalInputClassName}
                                name="reason"
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
                              {movement.type === "income"
                                ? "Registrar devolución"
                                : "Registrar reintegro"}
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
        </>
      ) : null}

      <Card className="p-0">
        <CardHeader
          className="mb-0 p-[18px] pb-3"
          title="Historial de Cajas"
          description="Últimas sesiones abiertas, conciliadas o cerradas."
        />
        <div className="divide-y divide-border">
          {dashboard.sessions.map((item) => (
            <Link
              key={item.id}
              href={`/sigeco/administracion/caja?session=${item.id}`}
              className="flex min-h-14 items-center justify-between gap-3 px-[18px] py-3 transition hover:bg-surface-soft"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-text">
                  {item.registerName} · {formatDateOnly(item.businessDate)}
                </p>
                <p className="truncate text-xs text-muted">
                  {personName(item.responsible)} ·{" "}
                  {formatDateTime(item.openedAt)}
                </p>
              </div>
              <Chip
                tone={
                  item.status === "open"
                    ? "success"
                    : item.status === "pending_approval"
                      ? "warning"
                      : "neutral"
                }
              >
                {cashSessionStatusLabels[item.status]}
              </Chip>
            </Link>
          ))}
          {dashboard.sessions.length === 0 ? (
            <div className="px-[18px] py-10 text-center text-sm text-muted">
              Todavía no existen sesiones de Caja.
            </div>
          ) : null}
        </div>
      </Card>

      <div className="flex items-center gap-2 text-xs text-muted">
        <History className="h-4 w-4" aria-hidden="true" />
        Los pagos y egresos se corrigen con un movimiento nuevo; nunca se
        borran.
      </div>
    </div>
  );
}
