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
  facebook_ads: "Facebook",
  facebook_organic: "Facebook",
  tiktok: "TikTok",
  whatsapp: "WhatsApp",
  referral: "Referido",
  previous_patient: "Paciente anterior",
  flyer: "Volante",
  website: "Sitio web",
  other: "Otro"
};

export const patientCaptureSourceOptions = [
  { value: "facebook", label: "Facebook" },
  { value: "tiktok", label: "TikTok" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "referral", label: "Referido" },
  { value: "previous_patient", label: "Paciente anterior" },
  { value: "flyer", label: "Volante" },
  { value: "website", label: "Sitio web" },
  { value: "other", label: "Otro" }
] as const satisfies ReadonlyArray<{ value: PatientCaptureSource; label: string }>;

export function normalizePatientCaptureSources(sources: readonly string[]) {
  return Array.from(
    new Set(
      sources.map((source) =>
        source === "facebook_ads" || source === "facebook_organic" ? "facebook" : source
      )
    )
  );
}

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
