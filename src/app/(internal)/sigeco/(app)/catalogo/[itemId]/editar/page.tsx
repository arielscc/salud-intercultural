import { notFound } from "next/navigation";
import { MobileBackLink } from "@/components/internal/MobileBackLink";
import { PageHeader } from "@/components/internal/ui/PageHeader";
import { updateServiceCatalogItemAction } from "@/features/service-catalog/service-catalog-actions";
import { ServiceCatalogForm } from "@/features/service-catalog/components/ServiceCatalogForm";
import { ServiceCatalogError } from "@/features/service-catalog/components/ServiceCatalogError";
import {
  getInventoryProductOptions,
  getServiceCatalogItemById
} from "@/modules/database/queries/service-catalog";
import { requirePermission } from "@/modules/permissions";

export default async function EditServiceCatalogItemPage({
  params,
  searchParams
}: {
  params: Promise<{ itemId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requirePermission("service_catalog_write");
  const { itemId } = await params;
  const query = await searchParams;
  const [item, products] = await Promise.all([
    getServiceCatalogItemById(itemId),
    getInventoryProductOptions()
  ]);
  if (!item) notFound();

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-4">
      <MobileBackLink href={`/sigeco/catalogo/${item.id}`} label="Volver a la oferta" />
      <PageHeader
        title={`Editar ${item.name}`}
        description={`El código ${item.code} queda reservado y no puede cambiarse.`}
      />
      <ServiceCatalogError code={query.error} />
      <ServiceCatalogForm
        action={updateServiceCatalogItemAction}
        products={products}
        item={{
          id: item.id,
          revision: item.revision,
          code: item.code,
          name: item.name,
          description: item.description,
          category: item.category,
          kind: item.kind,
          basePriceCents: item.basePriceCents,
          requiresNursing: item.requiresNursing,
          supportsSessions: item.supportsSessions,
          sessionCount: item.sessionCount,
          packagePriceCents: item.packagePriceCents,
          sessionPriceCents: item.sessionPriceCents,
          components: item.components.map((component) => ({
            inventoryItemId: component.inventoryItemId,
            quantity: component.quantity
          }))
        }}
      />
    </div>
  );
}
