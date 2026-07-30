import type {
  ClinicalCorrectionType,
  ClinicalRecordStatus,
  ClinicalRecordVersionKind
} from "@/generated/prisma/client";

export const clinicalRecordStatusLabels: Record<ClinicalRecordStatus, string> = {
  draft: "Borrador",
  finalized: "Finalizada"
};

export const clinicalRecordVersionKindLabels: Record<
  ClinicalRecordVersionKind,
  string
> = {
  draft: "Guardado de borrador",
  finalized: "Cierre y firma",
  correction: "Corrección"
};

export const clinicalCorrectionTypeLabels: Record<
  ClinicalCorrectionType,
  string
> = {
  diagnosis: "Diagnóstico",
  findings: "Hallazgos u observaciones",
  treatment_plan: "Plan de tratamiento",
  indications: "Indicaciones",
  other: "Otro dato clínico"
};

export const clinicalCorrectionTypeOptions = Object.entries(
  clinicalCorrectionTypeLabels
) as Array<[ClinicalCorrectionType, string]>;

export const clinicalSnapshotFieldLabels = {
  motive: "Motivo",
  primaryDiagnosis: "Diagnóstico principal",
  secondaryDiagnosis: "Diagnóstico secundario",
  findings: "Hallazgos",
  observations: "Observaciones",
  treatmentPlanText: "Plan de tratamiento",
  indications: "Indicaciones"
} as const;

