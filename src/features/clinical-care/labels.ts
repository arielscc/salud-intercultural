import type { ClinicalOrderStatus, ClinicalOrderType } from "@/generated/prisma/client";

export const clinicalOrderTypeLabels: Record<ClinicalOrderType, string> = {
  vital_signs: "Signos vitales",
  study: "Estudio",
  nursing_application: "Aplicación clínica",
  serum: "Suero",
  medication: "Medicamento",
  administration: "Administración",
  follow_up: "Seguimiento",
  other: "Otro"
};

export const clinicalOrderStatusLabels: Record<ClinicalOrderStatus, string> = {
  pending: "Pendiente",
  acknowledged: "Recibida",
  completed: "Completada",
  cancelled: "Cancelada",
  blocked: "Bloqueada"
};
