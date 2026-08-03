import type { ServiceCatalogKind } from "@/generated/prisma/client";

export const serviceCatalogKindLabels: Record<ServiceCatalogKind, string> = {
  service: "Servicio",
  treatment: "Tratamiento"
};

export function formatServiceCatalogMoney(cents: number) {
  return new Intl.NumberFormat("es-BO", {
    style: "currency",
    currency: "BOB",
    minimumFractionDigits: 2
  }).format(cents / 100);
}
