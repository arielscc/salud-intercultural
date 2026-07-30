import type {
  VisitDiscontinuationReason,
  VisitPendingType
} from "@/generated/prisma/client";

export const visitDiscontinuationReasonLabels: Record<
  VisitDiscontinuationReason,
  string
> = {
  wait: "Tiempo de espera",
  cost: "Costo",
  rejection: "No desea continuar",
  emergency: "Emergencia",
  missing_supply: "Falta de insumo",
  referral: "Derivación a otro lugar",
  other: "Otro motivo"
};

export const visitPendingTypeLabels: Record<VisitPendingType, string> = {
  consultation: "Consulta",
  study: "Estudio",
  application: "Aplicación o procedimiento",
  payment: "Cobro",
  delivery: "Entrega",
  follow_up: "Seguimiento"
};

export const visitDiscontinuationReasonOptions = Object.entries(
  visitDiscontinuationReasonLabels
) as Array<[VisitDiscontinuationReason, string]>;

export const visitPendingTypeOptions = Object.entries(
  visitPendingTypeLabels
) as Array<[VisitPendingType, string]>;
