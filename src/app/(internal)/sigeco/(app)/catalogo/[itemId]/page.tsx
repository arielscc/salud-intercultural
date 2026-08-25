import Link from "next/link";
import { notFound } from "next/navigation";
import { Field, internalInputClassName } from "@/components/internal/Field";
import { MobileBackLink } from "@/components/internal/MobileBackLink";
import { NoticeForm } from "@/components/internal/NoticeForm";
import { SubmitButton } from "@/components/internal/SubmitButton";
import { Card, CardHeader } from "@/components/internal/ui/Card";
import { Chip } from "@/components/internal/ui/Chip";
import { InfoRow } from "@/components/internal/ui/InfoRow";
import { Table, Td, Th, Tr } from "@/components/internal/ui/Table";
import {
  setServiceCatalogItemStatusAction,
  updateServiceCatalogThresholdAction
} from "@/features/service-catalog/service-catalog-actions";
import {
  formatServiceCatalogMoney,
  serviceCatalogKindLabels
} from "@/features/service-catalog/labels";
import { ServiceCatalogError } from "@/features/service-catalog/components/ServiceCatalogError";
import { roleHasPermission } from "@/features/internal-auth/permissions";
import { formatDateTime } from "@/lib/dates";
import {
  computeServiceCatalogMaxDiscountCents,
  getServiceCatalogItemById
} from "@/modules/database/queries/service-catalog";
import { requirePermission } from "@/modules/permissions";
import { getActiveModules } from "@/modules/database/queries/modules";
import { canUse } from "@/features/modules/access";

const linkClassName =
  "focus-ring inline-flex min-h-10 items-center justify-center rounded-[9px] border border-border px-3 text-sm font-semibold text-text hover:text-primary-dark";

export default async function ServiceCatalogItemPage({
  params,
  searchParams
}: {
  params: Promise<{ itemId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requirePermission("service_catalog_read", { module: "catalogo" });
  const { itemId } = await params;
  const query = await searchParams;
  const item = await getServiceCatalogItemById(itemId);
  if (!item) notFound();

  const activeModules = await getActiveModules();
  // La ficha del producto vive en Inventario; sin ese módulo se muestra el
  // nombre sin enlace, no una pantalla que rebota.
  const canOpenInventory = canUse(user.role, activeModules, "inventory_read", "inventario");
  const canWrite = roleHasPermission(user.role, "service_catalog_write");
  const canManageThreshold = roleHasPermission(user.role, "discount_threshold_manage");
  if (!item.active && !canWrite) notFound();

  const cap = computeServiceCatalogMaxDiscountCents(item);
  const isTreatment = item.kind === "treatment";

  return (
    <div className="grid gap-4">
      <MobileBackLink href="/sigeco/catalogo" label="Volver al catálogo" />
      <ServiceCatalogError code={query.error} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium tabular-nums text-muted">{item.code}</p>
          <h2 className="font-sora text-xl font-bold tracking-tight text-text">{item.name}</h2>
          <p className="mt-0.5 text-sm text-muted">
            {serviceCatalogKindLabels[item.kind]} · {item.category}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {item.active ? (
            <Chip tone="success" dot>
              Activa
            </Chip>
          ) : (
            <Chip>Inactiva</Chip>
          )}
          {canWrite ? (
            <Link className={linkClassName} href={`/sigeco/catalogo/${item.id}/editar`}>
              Editar oferta
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[1.35fr_1fr]">
        <div className="grid gap-4">
          <Card>
            <CardHeader title="Ficha de la oferta" description={item.description ?? undefined} />
            <dl className="grid gap-3 text-sm sm:grid-cols-3">
              <InfoRow label="Tipo" value={serviceCatalogKindLabels[item.kind]} />
              <InfoRow label="Categoría" value={item.category} />
              <InfoRow label="Estado" value={item.active ? "Activa" : "Inactiva"} />
              <InfoRow label="Precio base" value={formatServiceCatalogMoney(item.basePriceCents)} />
              <InfoRow label="Tope de descuento" value={formatServiceCatalogMoney(cap)} />
              {!isTreatment ? (
                <InfoRow
                  label="Umbral propio"
                  value={formatServiceCatalogMoney(item.ownMaxDiscountCents)}
                />
              ) : null}
            </dl>
            {item.supportsSessions ? (
              <dl className="mt-3 grid gap-3 border-t border-border pt-3 text-sm sm:grid-cols-3">
                <InfoRow
                  label="Sesiones (paquete)"
                  value={item.sessionCount != null ? String(item.sessionCount) : "—"}
                />
                <InfoRow
                  label="Precio por paquete"
                  value={
                    item.packagePriceCents != null
                      ? formatServiceCatalogMoney(item.packagePriceCents)
                      : "—"
                  }
                />
                <InfoRow
                  label="Precio por sesión"
                  value={
                    item.sessionPriceCents != null
                      ? formatServiceCatalogMoney(item.sessionPriceCents)
                      : "—"
                  }
                />
              </dl>
            ) : null}
          </Card>

          {isTreatment ? (
            <Card className="p-0">
              <CardHeader
                className="mb-0 p-[18px] pb-3"
                title="Productos del tratamiento"
                description="El tope de descuento es la suma de los umbrales por producto (los edita Dirección en Inventario)."
              />
              <Table caption="Productos componentes">
                <thead>
                  <tr>
                    <Th>Producto</Th>
                    <Th className="text-right">Cantidad</Th>
                    <Th className="text-right">Umbral unitario</Th>
                    <Th className="text-right">Subtotal umbral</Th>
                  </tr>
                </thead>
                <tbody>
                  {item.components.map((component) => (
                    <Tr key={component.id}>
                      <Td className="font-semibold text-text">
                        {canOpenInventory ? (
                          <Link
                            className="hover:underline"
                            href={`/sigeco/inventario/${component.inventoryItemId}`}
                          >
                            {component.inventoryItem.name}
                          </Link>
                        ) : (
                          component.inventoryItem.name
                        )}
                      </Td>
                      <Td className="text-right tabular-nums">{component.quantity}</Td>
                      <Td className="text-right tabular-nums">
                        {formatServiceCatalogMoney(component.inventoryItem.maxDiscountCents)}
                      </Td>
                      <Td className="text-right tabular-nums">
                        {formatServiceCatalogMoney(
                          component.inventoryItem.maxDiscountCents * component.quantity
                        )}
                      </Td>
                    </Tr>
                  ))}
                  {item.components.length === 0 ? (
                    <tr>
                      <Td className="py-8 text-center" colSpan={4}>
                        Este tratamiento todavía no tiene productos componentes.
                      </Td>
                    </tr>
                  ) : null}
                </tbody>
              </Table>
            </Card>
          ) : null}

          <Card>
            <CardHeader
              title="Historial de la oferta"
              description="Cada versión conserva quién cambió qué y por qué."
            />
            <div className="grid gap-3">
              {item.versions.map((version) => (
                <article key={version.id} className="rounded-[9px] border border-border p-3 text-sm">
                  <div className="flex flex-wrap justify-between gap-2">
                    <strong>
                      Versión {version.version} · {version.name}
                    </strong>
                    <span className="text-muted">{formatDateTime(version.createdAt)}</span>
                  </div>
                  <p className="mt-1">{version.changeReason}</p>
                  <p className="mt-1 text-xs text-muted">
                    {serviceCatalogKindLabels[version.kind]} · {version.category} · Precio base{" "}
                    {formatServiceCatalogMoney(version.basePriceCents)}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {version.changedBy?.name ??
                      version.changedBy?.email ??
                      "Migración del sistema"}
                  </p>
                </article>
              ))}
            </div>
          </Card>
        </div>

        <aside className="grid gap-4 lg:sticky lg:top-4">
          {!isTreatment && canManageThreshold ? (
            <Card>
              <CardHeader
                title={`Umbral de descuento del ${item.kind === "study" ? "estudio" : "servicio"}`}
                description="Solo Dirección y Super administrador. Es el tope que el médico podrá aplicar."
              />
              <NoticeForm
                action={updateServiceCatalogThresholdAction}
                notice="Umbral actualizado"
                className="grid gap-3"
              >
                <input type="hidden" name="catalogItemId" value={item.id} />
                <input type="hidden" name="expectedRevision" value={item.revision} />
                <Field label="Descuento máximo (Bs)">
                  <input
                    className={internalInputClassName}
                    name="maxDiscount"
                    inputMode="decimal"
                    defaultValue={(item.ownMaxDiscountCents / 100).toFixed(2)}
                    required
                  />
                </Field>
                <Field label="Motivo">
                  <input className={internalInputClassName} name="changeReason" required />
                </Field>
                <SubmitButton variant="outline">Guardar umbral</SubmitButton>
              </NoticeForm>
            </Card>
          ) : null}

          {isTreatment ? (
            <Card>
              <CardHeader
                title="Umbrales del tratamiento"
                description="El tope se calcula sumando el umbral de cada producto componente."
              />
              <p className="text-sm text-muted">
                Para cambiar el tope, Dirección edita el umbral de descuento de cada producto desde
                Inventario. Tope actual:{" "}
                <strong className="tabular-nums text-text">{formatServiceCatalogMoney(cap)}</strong>.
              </p>
            </Card>
          ) : null}

          {canWrite ? (
            <Card>
              <CardHeader
                title={item.active ? "Desactivar oferta" : "Reactivar oferta"}
                description="Conserva ventas históricas, código e historial."
              />
              <NoticeForm
                action={setServiceCatalogItemStatusAction}
                notice="Estado actualizado"
                className="grid gap-3"
              >
                <input type="hidden" name="catalogItemId" value={item.id} />
                <input type="hidden" name="expectedRevision" value={item.revision} />
                <input type="hidden" name="active" value={item.active ? "false" : "true"} />
                <Field label="Motivo">
                  <input className={internalInputClassName} name="changeReason" required />
                </Field>
                <SubmitButton variant="outline">
                  {item.active ? "Desactivar" : "Reactivar"}
                </SubmitButton>
              </NoticeForm>
            </Card>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
