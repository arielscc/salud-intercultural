import type {
  PatientConsentPurpose,
  PatientContactChannel
} from "@/generated/prisma/client";
import { resolveDeploymentEnvironment } from "@/lib/deployment-environment";

export const PATIENT_CONSENT_TEXT_VERSION = "v1";

export const patientConsentPurposeLabels: Record<PatientConsentPurpose, string> = {
  follow_up: "Seguimiento del tratamiento",
  reminders: "Recordatorios de atención",
  education: "Información educativa",
  promotions: "Promociones y novedades",
  image_voice: "Uso de imagen o voz"
};

export const patientConsentTexts: Record<PatientConsentPurpose, string> = {
  follow_up:
    "Autorizo a la clínica a contactarme para dar seguimiento a mi tratamiento y saber cómo estoy evolucionando.",
  reminders:
    "Autorizo a la clínica a contactarme para recordarme citas, controles o actividades relacionadas con mi atención.",
  education:
    "Autorizo a la clínica a enviarme información educativa general sobre salud y medicina natural. Entiendo que no reemplaza una consulta.",
  promotions:
    "Autorizo a la clínica a enviarme promociones, campañas y novedades comerciales.",
  image_voice:
    "Autorizo voluntariamente el uso de mi imagen o voz en testimonios y contenido de la clínica para redes sociales y material informativo. Puedo retirar mi autorización para usos futuros."
};

export const patientContactChannelLabels: Record<PatientContactChannel, string> = {
  whatsapp: "WhatsApp",
  call: "Llamada"
};

export function isContactConsentPurpose(purpose: PatientConsentPurpose) {
  return purpose !== "image_voice";
}

export function assertPatientConsentTextsEnabled(
  values: Record<string, string | undefined> = process.env
) {
  if (
    resolveDeploymentEnvironment(values) === "production" &&
    values.PATIENT_CONSENT_PRODUCTION_TEXT_VERSION?.trim() !==
      PATIENT_CONSENT_TEXT_VERSION
  ) {
    throw new Error(
      "Los textos de consentimiento todavía no están autorizados para producción. Dirección debe aprobarlos antes de configurar PATIENT_CONSENT_PRODUCTION_TEXT_VERSION=v1."
    );
  }
}
