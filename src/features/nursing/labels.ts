import type { VisitWorkItemStatus } from "@/generated/prisma/client";

export const nursingWorkItemStatusLabels: Record<VisitWorkItemStatus, string> = {
  pending: "Pendiente",
  acknowledged: "Tomada",
  in_progress: "En proceso",
  completed: "Completada",
  cancelled: "Cancelada",
  blocked: "Bloqueada"
};

// Colores de estado, alineados con la bandeja de Caja (Administración).
export const nursingWorkItemStatusTone: Record<
  VisitWorkItemStatus,
  "neutral" | "primary" | "success" | "warning" | "error"
> = {
  pending: "warning",
  acknowledged: "primary",
  in_progress: "primary",
  completed: "success",
  cancelled: "neutral",
  blocked: "error"
};
