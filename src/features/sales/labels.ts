import type { SaleItemType, SaleStatus } from "@/generated/prisma/client";

export const saleStatusLabels: Record<SaleStatus, string> = {
  pending: "Pendiente",
  partial: "Parcial",
  paid: "Pagado",
  cancelled: "Anulado"
};

export const saleItemTypeLabels: Record<SaleItemType, string> = {
  treatment: "Tratamiento",
  medication: "Medicamento",
  resonance: "Resonancia",
  serum: "Suero",
  service: "Servicio",
  study: "Estudio",
  product: "Producto",
  other: "Otro"
};

export const paymentMethodLabels = {
  cash: "Efectivo",
  qr: "QR",
  card: "Tarjeta",
  transfer: "Transferencia",
  other: "Otro"
} as const;

export function formatMoney(cents: number) {
  return new Intl.NumberFormat("es-BO", {
    style: "currency",
    currency: "BOB",
    minimumFractionDigits: 2
  }).format(cents / 100);
}
