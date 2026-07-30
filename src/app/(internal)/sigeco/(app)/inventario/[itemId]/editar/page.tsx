import { notFound } from "next/navigation";
import { MobileBackLink } from "@/components/internal/MobileBackLink";
import { PageHeader } from "@/components/internal/ui/PageHeader";
import { updateInventoryItemAction } from "@/features/inventory/actions";
import { ProductCatalogForm } from "@/features/inventory/components/ProductCatalogForm";
import { InventoryCatalogError } from "@/features/inventory/components/InventoryCatalogError";
import { getInventoryItemById } from "@/modules/database/queries/inventory";
import { requirePermission } from "@/modules/permissions";

export default async function EditInventoryItemPage({
  params,
  searchParams
}: {
  params: Promise<{ itemId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requirePermission("inventory_write");
  const { itemId } = await params;
  const query = await searchParams;
  const item = await getInventoryItemById(itemId);
  if (!item) notFound();

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-4">
      <MobileBackLink href={`/sigeco/inventario/${item.id}`} label="Volver al producto" />
      <PageHeader
        title={`Editar ${item.name}`}
        description={`El código ${item.internalCode} queda reservado y no puede cambiarse.`}
      />
      <InventoryCatalogError code={query.error} />
      <ProductCatalogForm action={updateInventoryItemAction} item={item} />
    </div>
  );
}
