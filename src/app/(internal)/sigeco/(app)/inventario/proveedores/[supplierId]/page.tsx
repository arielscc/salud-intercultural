import Link from "next/link";
import { notFound } from "next/navigation";
import { Field, internalInputClassName } from "@/components/internal/Field";
import { MobileBackLink } from "@/components/internal/MobileBackLink";
import { NoticeForm } from "@/components/internal/NoticeForm";
import { SubmitButton } from "@/components/internal/SubmitButton";
import { Card, CardHeader } from "@/components/internal/ui/Card";
import { Chip } from "@/components/internal/ui/Chip";
import { InfoRow } from "@/components/internal/ui/InfoRow";
import { PageHeader } from "@/components/internal/ui/PageHeader";
import { setSupplierStatusAction } from "@/features/inventory/actions";
import { roleHasPermission } from "@/features/internal-auth/permissions";
import { InventoryCatalogError } from "@/features/inventory/components/InventoryCatalogError";
import { formatDateTime } from "@/lib/dates";
import { getSupplierById } from "@/modules/database/queries/inventory";
import { requirePermission } from "@/modules/permissions";
import { getModuleAccessState } from "@/modules/database/queries/modules";
import { canUse } from "@/features/modules/access";

const linkClassName =
  "focus-ring inline-flex min-h-10 items-center justify-center rounded-[9px] border border-border px-3 text-sm font-semibold text-text hover:text-primary-dark";

export default async function SupplierDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ supplierId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requirePermission("suppliers_read", { module: "inventario" });
  const moduleAccess = await getModuleAccessState();
  const { supplierId } = await params;
  const query = await searchParams;
  const supplier = await getSupplierById(supplierId);
  if (!supplier) notFound();
  const canWrite = canUse(user.role, moduleAccess, "suppliers_write");

  return (
    <div className="grid gap-4">
      <MobileBackLink href="/sigeco/inventario/proveedores" label="Volver a proveedores" />
      <InventoryCatalogError code={query.error} />
      <PageHeader
        title={supplier.name}
        description={supplier.active ? "Proveedor activo" : "Proveedor inactivo"}
        actions={
          canWrite ? (
            <Link
              className={linkClassName}
              href={`/sigeco/inventario/proveedores/${supplier.id}/editar`}
            >
              Editar
            </Link>
          ) : null
        }
      />
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Contacto"
            action={
              <Chip tone={supplier.active ? "success" : "neutral"}>
                {supplier.active ? "Activo" : "Inactivo"}
              </Chip>
            }
          />
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <InfoRow label="Persona" value={supplier.contactName ?? "No registrada"} />
            <InfoRow label="Teléfono" value={supplier.phone ?? "No registrado"} />
            <InfoRow label="WhatsApp" value={supplier.whatsapp ?? "No registrado"} />
            <InfoRow label="Correo" value={supplier.email ?? "No registrado"} />
            <InfoRow label="Dirección" value={supplier.address ?? "No registrada"} />
            <InfoRow label="Notas" value={supplier.notes ?? "Sin notas"} />
          </dl>
        </Card>

        {canWrite ? (
          <Card>
            <CardHeader
              title={supplier.active ? "Desactivar proveedor" : "Reactivar proveedor"}
              description="No borra productos, compras ni versiones."
            />
            <NoticeForm
              action={setSupplierStatusAction}
              notice="Estado actualizado"
              className="grid gap-3"
            >
              <input type="hidden" name="supplierId" value={supplier.id} />
              <input type="hidden" name="expectedRevision" value={supplier.revision} />
              <input type="hidden" name="active" value={supplier.active ? "false" : "true"} />
              <Field label="Motivo">
                <input className={internalInputClassName} name="changeReason" required />
              </Field>
              <SubmitButton variant="outline">
                {supplier.active ? "Desactivar" : "Reactivar"}
              </SubmitButton>
            </NoticeForm>
          </Card>
        ) : null}
      </div>

      <Card>
        <CardHeader
          title="Productos asociados"
          description="Un producto puede tener varios proveedores y uno preferido."
        />
        <div className="grid gap-2">
          {supplier.itemLinks.map((link) => (
            <Link
              key={link.id}
              className="rounded-[9px] border border-border p-3 text-sm hover:border-primary/40"
              href={`/sigeco/inventario/${link.item.id}`}
            >
              <span className="font-semibold text-text">{link.item.name}</span>
              <span className="ml-2 text-muted">{link.item.internalCode}</span>
              {link.preferred ? (
                <Chip className="ml-2" tone="primary">
                  Preferido
                </Chip>
              ) : null}
            </Link>
          ))}
          {supplier.itemLinks.length === 0 ? (
            <p className="text-sm text-muted">Todavía no tiene productos asociados.</p>
          ) : null}
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Historial"
          description="Versiones de contacto y estado; las anteriores no se sobrescriben."
        />
        <div className="grid gap-3">
          {supplier.versions.map((version) => (
            <article key={version.id} className="rounded-[9px] border border-border p-3 text-sm">
              <div className="flex flex-wrap justify-between gap-2">
                <strong>Versión {version.version} · {version.name}</strong>
                <span className="text-muted">{formatDateTime(version.createdAt)}</span>
              </div>
              <p className="mt-1">{version.changeReason}</p>
              <p className="mt-1 text-xs text-muted">
                {version.changedBy?.name ?? version.changedBy?.email ?? "Migración del sistema"}
              </p>
            </article>
          ))}
        </div>
      </Card>
    </div>
  );
}
