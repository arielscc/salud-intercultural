import { MobileBackLink } from "@/components/internal/MobileBackLink";
import { PageHeader } from "@/components/internal/ui/PageHeader";
import { createInventoryItemAction } from "@/features/inventory/actions";
import { ProductCatalogForm } from "@/features/inventory/components/ProductCatalogForm";
import { InventoryCatalogError } from "@/features/inventory/components/InventoryCatalogError";
import { requirePermission } from "@/modules/permissions";

export default async function NewInventoryItemPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requirePermission("inventory_write");
  const query = await searchParams;

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-4">
      <MobileBackLink href="/sigeco/inventario" label="Volver al catálogo" />
      <PageHeader
        title="Nuevo producto"
        description="Alta rápida y guiada para web o teléfono."
      />
      <InventoryCatalogError code={query.error} />
      <ProductCatalogForm action={createInventoryItemAction} />
    </div>
  );
}
