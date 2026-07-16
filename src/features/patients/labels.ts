import type {
  PatientCaptureSource,
  PatientGender,
  PatientRouteArea,
  PatientStatus,
  VisitStatus,
  VisitWorkItemStatus
} from "@/generated/prisma/client";

export const patientGenderLabels: Record<PatientGender, string> = {
  female: "Femenino",
  male: "Masculino",
  other: "Otro",
  unknown: "No especificado"
};

export const patientStatusLabels: Record<PatientStatus, string> = {
  active: "Activo",
  inactive: "Inactivo",
  archived: "Archivado"
};

export const patientCaptureSourceLabels: Record<PatientCaptureSource, string> = {
  facebook: "Facebook",
  tiktok: "TikTok",
  whatsapp: "WhatsApp",
  referral: "Referido",
  previous_patient: "Paciente anterior",
  flyer: "Volante",
  website: "Sitio web",
  other: "Otro"
};

export const visitStatusLabels: Record<VisitStatus, string> = {
  in_reception: "En recepción",
  in_consultation: "En consulta",
  in_nursing: "En enfermería",
  in_administration: "En administración",
  completed: "Finalizada",
  left_without_care: "Abandonó atención",
  cancelled: "Cancelada"
};

export const routeAreaLabels: Record<PatientRouteArea, string> = {
  recepcion: "Recepción",
  medico: "Médico",
  enfermeria: "Enfermería",
  administracion: "Administración",
  seguimiento: "Seguimiento",
  cierre: "Cierre"
};

export const workItemStatusLabels: Record<VisitWorkItemStatus, string> = {
  pending: "Pendiente",
  acknowledged: "Recibida",
  in_progress: "En proceso",
  completed: "Completada",
  cancelled: "Cancelada",
  blocked: "Bloqueada"
};
