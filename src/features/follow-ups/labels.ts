import type {
  FollowUpAttemptMethod,
  FollowUpDomain,
  FollowUpPriority,
  FollowUpResult,
  FollowUpStatus,
  FollowUpType
} from "@/generated/prisma/client";

export const followUpStatusLabels: Record<FollowUpStatus, string> = {
  pending: "Pendiente",
  awaiting_payment: "En espera de pago",
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

export const followUpTypeLabels: Record<FollowUpType, string> = {
  evolution: "Evolución",
  return: "Retorno",
  treatment_recovery: "Recuperación de tratamiento",
  administrative: "Administrativo",
  doctor_call: "Llamada médica"
};

export const followUpTypeDescriptions: Record<FollowUpType, string> = {
  evolution: "Conocer cómo sigue un paciente que está en atención.",
  return: "Confirmar o coordinar que el paciente vuelva a la clínica.",
  treatment_recovery: "Recuperar una decisión o tratamiento que no continuó.",
  administrative: "Resolver pagos, documentos, horarios u otra coordinación.",
  doctor_call: "El paciente necesita hablar con un médico."
};

export const followUpDomainLabels: Record<FollowUpDomain, string> = {
  clinical: "Clínico",
  administrative: "Administrativo"
};

export const followUpPriorityLabels: Record<FollowUpPriority, string> = {
  low: "Baja",
  normal: "Normal",
  high: "Alta",
  urgent: "Urgente"
};

export const followUpResultLabels: Record<FollowUpResult, string> = {
  done: "Gestión completada",
  improved: "Mejoró",
  not_improved: "Sigue igual",
  worsened: "Empeoró",
  no_answer: "No responde",
  wants_return: "Quiere volver",
  requires_new_visit: "Requiere nueva visita",
  treatment_resumed: "Retomará el tratamiento",
  treatment_declined: "No continuará el tratamiento",
  rescheduled: "Reprogramado",
  escalated_to_doctor: "Escalado al médico",
  cancelled: "Cancelado",
  other: "Otro resultado"
};
