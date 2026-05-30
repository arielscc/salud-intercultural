import type {
  InternalLeadContactMethod,
  InternalLeadContactResult,
  InternalLeadSource,
  InternalLeadStatus
} from "@/generated/prisma/client";

export const leadStatusLabels: Record<InternalLeadStatus, string> = {
  new: "Nuevo",
  contacted: "Contactado",
  interested: "Interesado",
  wants_visit: "Quiere visitar",
  reminder_pending: "Recordatorio",
  confirmed_attendance: "Confirmó asistencia",
  no_answer: "No responde",
  discarded: "Descartado",
  converted_to_patient: "Convertido"
};

export const leadSourceLabels: Record<InternalLeadSource, string> = {
  website: "Sitio web",
  whatsapp: "WhatsApp",
  facebook_ads: "Facebook Ads",
  facebook_organic: "Facebook orgánico",
  tiktok: "TikTok",
  google: "Google",
  call: "Llamada",
  referral: "Referido",
  previous_patient: "Paciente anterior",
  flyer: "Volante",
  other: "Otro"
};

export const contactMethodLabels: Record<InternalLeadContactMethod, string> = {
  call: "Llamada",
  whatsapp: "WhatsApp",
  in_person: "Presencial",
  other: "Otro"
};

export const contactResultLabels: Record<InternalLeadContactResult, string> = {
  contacted: "Contactado",
  no_answer: "No responde",
  interested: "Interesado",
  wants_visit: "Quiere visitar",
  confirmed_attendance: "Confirmó asistencia",
  discarded: "Descartado",
  follow_up_required: "Requiere seguimiento"
};
