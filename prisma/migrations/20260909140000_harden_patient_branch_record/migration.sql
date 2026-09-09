-- Este endurecimiento solo puede ejecutarse después del dry-run y, si
-- corresponde, del apply de `pnpm branch:reconcile:patients`.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "Patient"
    WHERE "generalObservations" IS NOT NULL
       OR "allergies" IS NOT NULL
       OR "relevantHistory" IS NOT NULL
       OR "currentMedication" IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'PATIENT_LOCAL_PROFILE_REQUIRES_RECONCILIATION';
  END IF;
  IF EXISTS (SELECT 1 FROM "PatientConsent" WHERE "branchCode" IS NULL) OR
     EXISTS (SELECT 1 FROM "PatientContact" WHERE "branchCode" IS NULL) OR
     EXISTS (SELECT 1 FROM "PatientNote" WHERE "branchCode" IS NULL) THEN
    RAISE EXCEPTION 'PATIENT_CHILD_BRANCH_REQUIRES_RECONCILIATION';
  END IF;
  IF EXISTS (
    SELECT 1 FROM "Visit"
    WHERE "patientNameSnapshot" IS NULL OR "patientPhoneSnapshot" IS NULL
  ) THEN
    RAISE EXCEPTION 'VISIT_PATIENT_SNAPSHOT_BACKFILL_INCOMPLETE';
  END IF;
END
$$;

ALTER TABLE "PatientConsent" ALTER COLUMN "branchCode" SET NOT NULL;
ALTER TABLE "PatientContact" ALTER COLUMN "branchCode" SET NOT NULL;
ALTER TABLE "PatientNote" ALTER COLUMN "branchCode" SET NOT NULL;
ALTER TABLE "Visit" ALTER COLUMN "patientNameSnapshot" SET NOT NULL;
ALTER TABLE "Visit" ALTER COLUMN "patientPhoneSnapshot" SET NOT NULL;

ALTER TABLE "Patient"
  DROP COLUMN "generalObservations",
  DROP COLUMN "allergies",
  DROP COLUMN "relevantHistory",
  DROP COLUMN "currentMedication";

ALTER TABLE "PatientConsent"
  ADD CONSTRAINT "PatientConsent_branchCode_fkey"
  FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "PatientConsent_patientId_branchCode_fkey"
  FOREIGN KEY ("patientId", "branchCode")
  REFERENCES "PatientBranchRecord"("patientId", "branchCode")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientContact"
  ADD CONSTRAINT "PatientContact_branchCode_fkey"
  FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "PatientContact_patientId_branchCode_fkey"
  FOREIGN KEY ("patientId", "branchCode")
  REFERENCES "PatientBranchRecord"("patientId", "branchCode")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientNote"
  ADD CONSTRAINT "PatientNote_branchCode_fkey"
  FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "PatientNote_patientId_branchCode_fkey"
  FOREIGN KEY ("patientId", "branchCode")
  REFERENCES "PatientBranchRecord"("patientId", "branchCode")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Visit"
  ADD CONSTRAINT "Visit_patientId_branchCode_fkey"
  FOREIGN KEY ("patientId", "branchCode")
  REFERENCES "PatientBranchRecord"("patientId", "branchCode")
  ON DELETE RESTRICT ON UPDATE CASCADE;
