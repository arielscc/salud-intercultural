import type {
  FeedbackCaseStatus,
  FeedbackClassification,
  FeedbackSeverity,
  PatientFeedbackArea,
  PatientFeedbackKind
} from "@/generated/prisma/client";

export const FEEDBACK_QUESTIONNAIRE_VERSION = "v1";

export const feedbackKindLabels: Record<PatientFeedbackKind, string> = {
  survey: "Encuesta breve",
  comment: "Comentario o sugerencia",
  complaint: "Reclamo"
};

export const feedbackAreaLabels: Record<PatientFeedbackArea, string> = {
  reception: "Recepción",
  clinical_care: "Consulta o tratamiento",
  nursing: "Enfermería",
  administration: "Administración o pagos",
  communication: "Llamadas o WhatsApp",
  facilities: "Ambientes de la clínica",
  other: "Otro"
};

export const feedbackClassificationLabels: Record<
  FeedbackClassification,
  string
> = {
  general: "Opinión general",
  service: "Atención o servicio",
  clinical_safety: "Posible incidente clínico"
};

export const feedbackSeverityLabels: Record<FeedbackSeverity, string> = {
  standard: "Normal",
  priority: "Prioritario",
  critical: "Crítico"
};

export const feedbackStatusLabels: Record<FeedbackCaseStatus, string> = {
  new: "Nuevo",
  reviewing: "En revisión",
  awaiting_patient: "Esperando al paciente",
  resolved: "Resuelto",
  closed: "Cerrado"
};

export const feedbackQuestionnaireSnapshot = {
  version: FEEDBACK_QUESTIONNAIRE_VERSION,
  questions: [
    "¿Cómo califica la atención recibida?",
    "¿Desea dejar una opinión, sugerencia o reclamo?",
    "¿Con qué parte de la atención se relaciona?",
    "¿Considera que pudo existir riesgo o daño para su salud?"
  ]
} as const;

export function classifyPatientFeedback(input: {
  rating: number;
  kind: PatientFeedbackKind;
  healthRiskFlag: boolean;
  submittedAt: Date;
}) {
  if (input.healthRiskFlag) {
    return {
      classification: "clinical_safety" as const,
      severity: "critical" as const,
      status: "new" as const,
      responseDueAt: new Date(input.submittedAt.getTime() + 4 * 60 * 60 * 1000),
      resolvedAt: null
    };
  }
  if (input.kind === "complaint") {
    return {
      classification: "service" as const,
      severity: "priority" as const,
      status: "new" as const,
      responseDueAt: new Date(input.submittedAt.getTime() + 24 * 60 * 60 * 1000),
      resolvedAt: null
    };
  }
  if (input.rating <= 2 || input.kind === "comment") {
    return {
      classification: input.rating <= 2 ? ("service" as const) : ("general" as const),
      severity: input.rating <= 2 ? ("priority" as const) : ("standard" as const),
      status: "new" as const,
      responseDueAt: new Date(input.submittedAt.getTime() + 48 * 60 * 60 * 1000),
      resolvedAt: null
    };
  }
  return {
    classification: "general" as const,
    severity: "standard" as const,
    status: "closed" as const,
    responseDueAt: null,
    resolvedAt: input.submittedAt
  };
}

export function isFeedbackCaseOverdue(input: {
  status: FeedbackCaseStatus;
  responseDueAt: Date | null;
}, now = new Date()) {
  return (
    !["resolved", "closed"].includes(input.status) &&
    Boolean(input.responseDueAt && input.responseDueAt < now)
  );
}

