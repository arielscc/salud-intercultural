import type {
  TreatmentProposalOutcomeReason,
  TreatmentProposalOutcomeStatus
} from "@/generated/prisma/client";

export const treatmentProposalOutcomeStatusLabels: Record<
  TreatmentProposalOutcomeStatus,
  string
> = {
  accepted: "Aceptado",
  rejected: "Rechazado",
  needs_time: "Necesita tiempo",
  not_applicable: "No aplica",
  no_decision: "Sin decisión"
};

export const treatmentProposalOutcomeStatusDescriptions: Record<
  TreatmentProposalOutcomeStatus,
  string
> = {
  accepted: "El paciente confirmó que desea iniciar el tratamiento.",
  rejected: "El paciente decidió no tomar el tratamiento propuesto.",
  needs_time: "Todavía no decide y pidió tiempo para responder.",
  not_applicable: "En esta consulta no correspondía proponer un tratamiento.",
  no_decision: "La conversación terminó sin una respuesta clara."
};

export const treatmentProposalOutcomeReasonLabels: Record<
  TreatmentProposalOutcomeReason,
  string
> = {
  agreed_to_start: "Está de acuerdo y quiere empezar",
  cost: "Necesita resolver el costo",
  needs_family_consultation: "Quiere consultar con su familia",
  needs_more_information: "Necesita más información",
  schedule: "Necesita organizar sus horarios",
  prefers_other_option: "Prefiere otra opción",
  clinical_not_applicable: "No correspondía proponer tratamiento",
  conversation_incomplete: "No se completó la conversación",
  other: "Otro motivo"
};

export const treatmentProposalReasonsByStatus: Record<
  TreatmentProposalOutcomeStatus,
  TreatmentProposalOutcomeReason[]
> = {
  accepted: ["agreed_to_start", "other"],
  rejected: ["cost", "prefers_other_option", "other"],
  needs_time: [
    "cost",
    "needs_family_consultation",
    "needs_more_information",
    "schedule",
    "other"
  ],
  not_applicable: ["clinical_not_applicable", "other"],
  no_decision: ["conversation_incomplete", "other"]
};
