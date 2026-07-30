export type ClinicalSnapshot = {
  motive: string;
  primaryDiagnosis: string;
  secondaryDiagnosis?: string | null;
  findings?: string | null;
  observations?: string | null;
  treatmentPlanText?: string | null;
  indications?: string | null;
};

const snapshotFields = [
  "motive",
  "primaryDiagnosis",
  "secondaryDiagnosis",
  "findings",
  "observations",
  "treatmentPlanText",
  "indications"
] as const;

function normalize(value: string | null | undefined) {
  return value?.trim() || null;
}

export function clinicalSnapshotChanged(
  previous: ClinicalSnapshot,
  next: ClinicalSnapshot
) {
  return snapshotFields.some(
    (field) => normalize(previous[field]) !== normalize(next[field])
  );
}

export function changedClinicalSnapshotFields(
  previous: ClinicalSnapshot,
  next: ClinicalSnapshot
) {
  return snapshotFields.filter(
    (field) => normalize(previous[field]) !== normalize(next[field])
  );
}

