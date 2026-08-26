import type {
  FollowUpContactPreference,
  SymptomDurationUnit,
  VisitIntakeType
} from "@/generated/prisma/client";

export const visitIntakeTypeLabels: Record<VisitIntakeType, string> = {
  first_visit: "Primera consulta",
  treatment_control: "Control de tratamiento",
  new_problem: "Nuevo problema",
  results_review: "Revisión de resultados"
};

export const symptomDurationUnitLabels: Record<SymptomDurationUnit, string> = {
  days: "Días",
  weeks: "Semanas",
  months: "Meses",
  years: "Años"
};

export const followUpContactPreferenceLabels: Record<FollowUpContactPreference, string> = {
  whatsapp: "WhatsApp",
  call: "Llamada",
  both: "Ambos",
  no_contact: "Prefiere no recibir seguimiento",
  unknown: "Sin responder"
};
