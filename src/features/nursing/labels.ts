import type { VisitWorkItemStatus } from "@/generated/prisma/client";

export const nursingWorkItemStatusLabels: Record<VisitWorkItemStatus, string> = {
  pending: "Pendiente",
  acknowledged: "Tomada",
  in_progress: "En proceso",
  completed: "Completada",
  cancelled: "Cancelada",
  blocked: "Bloqueada"
};
