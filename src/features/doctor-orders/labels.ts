import type { DoctorOrderLineSource, DoctorOrderStatus } from "@/generated/prisma/client";

export const doctorOrderStatusLabels: Record<DoctorOrderStatus, string> = {
  draft: "Borrador",
  submitted: "Enviado a Administración",
  confirmed: "Confirmado por Administración",
  cancelled: "Cancelado"
};

export const doctorOrderLineSourceLabels: Record<DoctorOrderLineSource, string> = {
  service: "Servicio",
  treatment: "Tratamiento",
  product: "Producto",
  free_text: "Texto libre"
};

export function formatDoctorOrderMoney(cents: number) {
  return new Intl.NumberFormat("es-BO", {
    style: "currency",
    currency: "BOB",
    minimumFractionDigits: 2
  }).format(cents / 100);
}

export function doctorOrderLineTotalCents(line: {
  unitPriceCents: number;
  discountCents: number;
  quantity: number;
}) {
  return Math.max(0, line.unitPriceCents * line.quantity - line.discountCents);
}
