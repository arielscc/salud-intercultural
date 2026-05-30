import type { FollowUpAttemptMethod, FollowUpStatus } from "@/generated/prisma/client";

export const followUpStatusLabels: Record<FollowUpStatus, string> = {
  pending: "Pendiente",
  done: "Realizado",
  improved: "Mejoró",
  not_improved: "No mejoró",
  no_answer: "No responde",
  wants_return: "Quiere volver",
  requires_new_visit: "Requiere nueva visita",
  requires_doctor_call: "Requiere llamada médica",
  cancelled: "Cancelado"
};

export const followUpAttemptMethodLabels: Record<FollowUpAttemptMethod, string> = {
  call: "Llamada",
  whatsapp: "WhatsApp",
  in_person: "Presencial",
  other: "Otro"
};
