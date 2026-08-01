import {
  getPatientFeedbackForm,
  PatientFeedbackError,
  submitPatientFeedback
} from "@/modules/database/queries/patient-feedback";

export { PatientFeedbackError };

/**
 * Fachada pública mínima. Nunca devuelve paciente, visita, responsable,
 * clasificación ni notas internas.
 */
export async function getPublicPatientFeedbackForm(token: string) {
  return getPatientFeedbackForm(token);
}

export async function submitPublicPatientFeedback(
  input: Parameters<typeof submitPatientFeedback>[0]
) {
  return submitPatientFeedback(input);
}
