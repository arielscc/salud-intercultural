import { MobileBackLink } from "@/components/internal/MobileBackLink";
import { PageHeader } from "@/components/internal/ui/PageHeader";
import { createSupplierAction } from "@/features/inventory/actions";
import { SupplierForm } from "@/features/inventory/components/SupplierForm";
import { InventoryCatalogError } from "@/features/inventory/components/InventoryCatalogError";
import { requirePermission } from "@/modules/permissions";

export default async function NewSupplierPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requirePermission("suppliers_write");
  const query = await searchParams;

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-4">
      <MobileBackLink href="/sigeco/inventario/proveedores" label="Volver a proveedores" />
      <PageHeader
        title="Nuevo proveedor"
        description="El proveedor podrá asociarse a varios productos."
      />
      <InventoryCatalogError code={query.error} />
      <SupplierForm action={createSupplierAction} />
    </div>
  );
}
