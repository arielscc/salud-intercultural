import { MobileBackLink } from "@/components/internal/MobileBackLink";
import { PageHeader } from "@/components/internal/ui/PageHeader";
import { createServiceCatalogItemAction } from "@/features/service-catalog/service-catalog-actions";
import { ServiceCatalogForm } from "@/features/service-catalog/components/ServiceCatalogForm";
import { ServiceCatalogError } from "@/features/service-catalog/components/ServiceCatalogError";
import { getInventoryProductOptions } from "@/modules/database/queries/service-catalog";
import { requirePermission } from "@/modules/permissions";

export default async function NewServiceCatalogItemPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requirePermission("service_catalog_write");
  const query = await searchParams;
  const products = await getInventoryProductOptions();

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-4">
      <MobileBackLink href="/sigeco/catalogo" label="Volver al catálogo" />
      <PageHeader
        title="Nueva oferta"
        description="Servicio, tratamiento o estudio que el personal podrá elegir durante la atención."
      />
      <ServiceCatalogError code={query.error} />
      <ServiceCatalogForm action={createServiceCatalogItemAction} products={products} />
    </div>
  );
}
