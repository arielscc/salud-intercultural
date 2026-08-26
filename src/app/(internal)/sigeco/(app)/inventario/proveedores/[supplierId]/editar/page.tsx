import { notFound } from "next/navigation";
import { MobileBackLink } from "@/components/internal/MobileBackLink";
import { PageHeader } from "@/components/internal/ui/PageHeader";
import { updateSupplierAction } from "@/features/inventory/actions";
import { SupplierForm } from "@/features/inventory/components/SupplierForm";
import { InventoryCatalogError } from "@/features/inventory/components/InventoryCatalogError";
import { getSupplierById } from "@/modules/database/queries/inventory";
import { requirePermission } from "@/modules/permissions";

export default async function EditSupplierPage({
  params,
  searchParams
}: {
  params: Promise<{ supplierId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requirePermission("suppliers_write");
  const { supplierId } = await params;
  const query = await searchParams;
  const supplier = await getSupplierById(supplierId);
  if (!supplier) notFound();

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-4">
      <MobileBackLink
        href={`/sigeco/inventario/proveedores/${supplier.id}`}
        label="Volver al proveedor"
      />
      <PageHeader title={`Editar ${supplier.name}`} description="Cada cambio crea una versión." />
      <InventoryCatalogError code={query.error} />
      <SupplierForm action={updateSupplierAction} supplier={supplier} />
    </div>
  );
}
