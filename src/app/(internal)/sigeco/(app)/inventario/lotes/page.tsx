import { randomUUID } from "node:crypto";
import Link from "next/link";
import { CalendarClock, PackageCheck, Search, ShieldCheck } from "lucide-react";
import { Field, internalInputClassName } from "@/components/internal/Field";
import { SubmitButton } from "@/components/internal/SubmitButton";
import { buttonVariants } from "@/components/internal/ui/Button";
import { Card, CardHeader } from "@/components/internal/ui/Card";
import { Chip } from "@/components/internal/ui/Chip";
import { PageHeader } from "@/components/internal/ui/PageHeader";
import { Pagination } from "@/components/internal/ui/Pagination";
import { roleHasPermission } from "@/features/internal-auth/permissions";
import { createInventoryLotAdjustmentAction } from "@/features/purchases/actions";
import { PurchaseError } from "@/features/purchases/components/PurchaseError";
import {
  inventoryLotAdjustmentKindLabels
} from "@/features/purchases/labels";
import { formatMoney } from "@/features/sales/labels";
import { formatDateOnly, formatDateTime, todayDateOnly } from "@/lib/dates";
import { getCashPersonnel } from "@/modules/database/queries/cash";
import {
  countInventoryLots,
  getFefoInventoryLotIds,
  getInventoryLots
} from "@/modules/database/queries/purchases";
import { parsePage } from "@/modules/database/pagination";
import { requirePermission } from "@/modules/permissions";
import { getBranchContext } from "@/features/branches/context";

type LotStatus = "available" | "expiring" | "expired" | "empty" | "all";

function lotState(lot: { currentQuantity: number; expirationDate: Date | null }) {
  if (lot.currentQuantity === 0) {
    return { label: "Agotado", tone: "neutral" as const };
  }
  if (!lot.expirationDate) {
    return { label: "Disponible", tone: "success" as const };
  }
  const today = todayDateOnly();
  const expiration = lot.expirationDate.toISOString().slice(0, 10);
  if (expiration < today) return { label: "Vencido", tone: "error" as const };
  const threshold = new Date(`${today}T00:00:00.000Z`);
  threshold.setUTCDate(threshold.getUTCDate() + 60);
  if (expiration <= threshold.toISOString().slice(0, 10)) {
    return { label: "Por vencer", tone: "warning" as const };
  }
  return { label: "Disponible", tone: "success" as const };
}

export default async function InventoryLotsPage({
  searchParams
}: {
  searchParams: Promise<{
    page?: string;
    q?: string;
    estado?: LotStatus;
    item?: string;
    error?: string;
    aviso?: string;
  }>;
}) {
  const user = await requirePermission("inventory_read", { module: "inventario" });
  const { activeBranch } = await getBranchContext(user);
  const params = await searchParams;
  const page = parsePage(params.page);
  const pageSize = 24;
  const allowedStatuses: LotStatus[] = [
    "available",
    "expiring",
    "expired",
    "empty",
    "all"
  ];
  const status = allowedStatuses.includes(params.estado ?? "all")
    ? (params.estado ?? "all")
    : "all";
  const filters = {
    search: params.q,
    status,
    itemId: params.item,
    branchCode: activeBranch.code
  };
  const canAdjust = roleHasPermission(user.role, "inventory_lot_adjust");
  const canReadCosts = roleHasPermission(user.role, "inventory_cost_read");
  const canReadPurchases = roleHasPermission(user.role, "purchases_read");
  const canReadSuppliers = roleHasPermission(user.role, "suppliers_read");
  const [lots, total, fefoIds, personnel] = await Promise.all([
    getInventoryLots({ ...filters, page, pageSize }),
    countInventoryLots(filters),
    getFefoInventoryLotIds(activeBranch.code),
    canAdjust ? getCashPersonnel(activeBranch.code) : Promise.resolve([])
  ]);
  const authorizers = personnel.filter(
    (person) => person.role === "direccion" || person.role === "super_admin"
  );

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Lotes, vencimientos y FEFO"
        description="Consulta de qué compra vino cada producto y cuál lote debe utilizarse primero."
        actions={
          <Link href="/sigeco/inventario" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Volver al inventario
          </Link>
        }
      />
      <PurchaseError code={params.error} />
      {params.aviso === "lote-ajustado" ? (
        <div className="rounded-[9px] border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
          El ajuste autorizado y su movimiento de stock fueron registrados.
        </div>
      ) : null}

      <Card>
        <CardHeader
          title="Buscar lotes"
          description="FEFO recomienda primero el lote vigente que vence antes."
        />
        <form className="grid gap-3 sm:grid-cols-[1fr_200px_auto]">
          <Field label="Buscar">
            <span className="relative block">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                size={16}
                aria-hidden="true"
              />
              <input
                className={`${internalInputClassName} pl-9`}
                name="q"
                defaultValue={params.q}
                placeholder="Producto, lote interno o lote del proveedor"
              />
            </span>
          </Field>
          <Field label="Estado">
            <select className={internalInputClassName} name="estado" defaultValue={status}>
              <option value="all">Todos</option>
              <option value="available">Disponibles</option>
              <option value="expiring">Vencen en 60 días</option>
              <option value="expired">Vencidos con stock</option>
              <option value="empty">Agotados</option>
            </select>
          </Field>
          <button type="submit" className={`${buttonVariants({ variant: "outline" })} self-end`}>
            Filtrar
          </button>
        </form>
      </Card>

      <div className="grid gap-3">
        {lots.map((lot) => {
          const state = lotState(lot);
          return (
            <Card key={lot.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link
                    href={`/sigeco/inventario/${lot.itemId}`}
                    className="font-semibold text-primary-dark hover:underline"
                  >
                    {lot.item.name}
                  </Link>
                  <p className="mt-0.5 text-xs text-muted">
                    {lot.batchNumber
                      ? `Lote proveedor ${lot.batchNumber} · `
                      : ""}
                    {lot.internalLotCode}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {fefoIds.has(lot.id) ? (
                    <Chip tone="primary" dot>Usar primero · FEFO</Chip>
                  ) : null}
                  <Chip tone={state.tone} dot>{state.label}</Chip>
                </div>
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3 lg:grid-cols-6">
                <div>
                  <dt className="text-xs text-muted">Disponible</dt>
                  <dd className="font-semibold tabular-nums">
                    {lot.currentQuantity} {lot.item.unit}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Recibido</dt>
                  <dd className="tabular-nums">{lot.receivedQuantity}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Vencimiento</dt>
                  <dd>{lot.expirationDate ? formatDateOnly(lot.expirationDate) : "Sin fecha"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Costo histórico</dt>
                  <dd>{canReadCosts ? formatMoney(lot.unitCostCents) : "Restringido"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Ubicación</dt>
                  <dd>{lot.locationCode}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Proveedor</dt>
                  <dd>{canReadSuppliers ? lot.supplier.name : "Restringido"}</dd>
                </div>
              </dl>

              <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-3 text-xs">
                {canReadPurchases ? (
                  <>
                    <Link
                      className="font-semibold text-primary-dark hover:underline"
                      href={`/sigeco/compras/${lot.purchaseId}`}
                    >
                      Compra {lot.purchase.purchaseNumber}
                    </Link>
                    <span className="text-muted">·</span>
                  </>
                ) : null}
                <span className="text-muted">
                  Recepción {lot.receipt.receiptNumber} · {formatDateTime(lot.receipt.receivedAt)}
                </span>
              </div>

              {lot.adjustments.length ? (
                <details className="mt-3 text-sm">
                  <summary className="cursor-pointer font-semibold text-primary-dark">
                    Ver {lot.adjustments.length} ajustes
                  </summary>
                  <ul className="mt-2 grid gap-2">
                    {lot.adjustments.map((adjustment) => (
                      <li key={adjustment.id} className="rounded-[9px] bg-surface-soft p-3">
                        {inventoryLotAdjustmentKindLabels[adjustment.kind]} ·{" "}
                        {adjustment.stockDelta > 0 ? "+" : ""}{adjustment.stockDelta} ·{" "}
                        {adjustment.reason}
                        <span className="mt-1 block text-xs text-muted">
                          {formatDateTime(adjustment.createdAt)} · autorizó{" "}
                          {adjustment.authorizedBy.name ?? adjustment.authorizedBy.email}
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}

              {canAdjust ? (
                <details className="mt-4 rounded-[9px] border border-border p-3">
                  <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
                    <ShieldCheck size={16} className="text-primary-dark" />
                    Registrar ajuste autorizado
                  </summary>
                  <form
                    action={createInventoryLotAdjustmentAction}
                    className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
                  >
                    <input type="hidden" name="lotId" value={lot.id} />
                    <input type="hidden" name="idempotencyKey" value={randomUUID()} />
                    <Field label="Motivo del movimiento">
                      <select className={internalInputClassName} name="kind" required>
                        {Object.entries(inventoryLotAdjustmentKindLabels).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Cantidad">
                      <input
                        className={internalInputClassName}
                        name="quantity"
                        type="number"
                        inputMode="numeric"
                        min="1"
                        max="1000000"
                        required
                      />
                    </Field>
                    <Field label="Autoriza Dirección">
                      <select className={internalInputClassName} name="authorizedById" required>
                        <option value="">Selecciona</option>
                        {authorizers.map((person) => (
                          <option key={person.id} value={person.id}>
                            {person.name ?? person.email}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <label className="flex min-h-11 items-center gap-2 self-end rounded-[9px] border border-border px-3 text-sm">
                      <input type="checkbox" name="restocked" />
                      Devuelve unidades al stock
                    </label>
                    <Field label="Explicación obligatoria" className="sm:col-span-2 lg:col-span-3">
                      <input
                        className={internalInputClassName}
                        name="reason"
                        minLength={3}
                        placeholder="Qué ocurrió y por qué se autoriza"
                        required
                      />
                    </Field>
                    <SubmitButton className="self-end">Guardar ajuste</SubmitButton>
                  </form>
                  <p className="mt-2 text-xs text-muted">
                    “Devuelve unidades” solo aplica a devolución del paciente o corrección.
                    Daño, merma, vencimiento y devolución al proveedor siempre restan stock.
                  </p>
                </details>
              ) : null}
            </Card>
          );
        })}
        {lots.length === 0 ? (
          <Card>
            <div className="flex items-center gap-3 text-sm text-muted">
              <CalendarClock size={20} />
              Todavía no existen lotes que coincidan con el filtro.
            </div>
          </Card>
        ) : null}
      </div>
      <Pagination
        page={page}
        pageSize={pageSize}
        totalItems={total}
        pathname="/sigeco/inventario/lotes"
        searchParams={{
          q: params.q,
          estado: status === "all" ? undefined : status,
          item: params.item
        }}
      />
      <p className="flex items-center gap-2 text-xs text-muted">
        <PackageCheck size={14} />
        El historial no se elimina; una corrección siempre crea otro movimiento.
      </p>
    </div>
  );
}
