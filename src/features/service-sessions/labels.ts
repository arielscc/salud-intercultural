import type {
  ServiceSessionPackageStatus,
  ServiceSessionPricingMode
} from "@/generated/prisma/client";

export const serviceSessionStatusLabels: Record<ServiceSessionPackageStatus, string> = {
  active: "En curso",
  completed: "Completado",
  cancelled: "Cancelado"
};

export const serviceSessionPricingModeLabels: Record<ServiceSessionPricingMode, string> = {
  package: "Paquete",
  per_session: "Sesión individual"
};

export function formatServiceSessionMoney(cents: number) {
  return new Intl.NumberFormat("es-BO", {
    style: "currency",
    currency: "BOB",
    minimumFractionDigits: 2
  }).format(cents / 100);
}
