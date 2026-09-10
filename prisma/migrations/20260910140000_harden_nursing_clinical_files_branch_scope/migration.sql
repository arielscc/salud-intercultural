-- Tarea 9: endurecimiento. Ejecutar después de reconciliar filas y storage keys.
BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Study" WHERE "branchCode" IS NULL) OR
     EXISTS (SELECT 1 FROM "VitalSigns" WHERE "branchCode" IS NULL) OR
     EXISTS (SELECT 1 FROM "NursingApplication" WHERE "branchCode" IS NULL) OR
     EXISTS (SELECT 1 FROM "NursingNote" WHERE "branchCode" IS NULL) OR
     EXISTS (SELECT 1 FROM "ClinicalAttachment" WHERE "branchCode" IS NULL) OR
     EXISTS (SELECT 1 FROM "ClinicalAttachmentAccessGrant" WHERE "patientId" IS NULL OR "branchCode" IS NULL OR "requestingBranchCode" IS NULL OR "actorRole" IS NULL OR "reason" IS NULL) OR
     EXISTS (SELECT 1 FROM "NursingWorkItemResult" WHERE "branchCode" IS NULL) OR
     EXISTS (SELECT 1 FROM "ServiceSessionPackage" WHERE "branchCode" IS NULL) OR
     EXISTS (SELECT 1 FROM "ServiceSessionUse" WHERE "branchCode" IS NULL) THEN
    RAISE EXCEPTION 'NURSING_BRANCH_BACKFILL_INCOMPLETE';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "ClinicalAttachment"
    WHERE "storageKey" NOT LIKE ('clinical/%/' || "branchCode" || '/%')
  ) THEN
    RAISE EXCEPTION 'CLINICAL_ATTACHMENT_STORAGE_KEY_RECONCILIATION_REQUIRED';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "ServiceSessionPackage" package
    JOIN "Sale" sale ON sale."id" = package."saleId"
    WHERE package."branchCode" <> sale."branchCode"
  ) THEN
    RAISE EXCEPTION 'SERVICE_SESSION_SALE_BRANCH_MISMATCH';
  END IF;
END $$;

ALTER TABLE "Study" ALTER COLUMN "branchCode" SET NOT NULL;
ALTER TABLE "VitalSigns" ALTER COLUMN "branchCode" SET NOT NULL;
ALTER TABLE "NursingApplication" ALTER COLUMN "branchCode" SET NOT NULL;
ALTER TABLE "NursingNote" ALTER COLUMN "branchCode" SET NOT NULL;
ALTER TABLE "ClinicalAttachment" ALTER COLUMN "branchCode" SET NOT NULL;
ALTER TABLE "ClinicalAttachmentAccessGrant" ALTER COLUMN "patientId" SET NOT NULL;
ALTER TABLE "ClinicalAttachmentAccessGrant" ALTER COLUMN "branchCode" SET NOT NULL;
ALTER TABLE "ClinicalAttachmentAccessGrant" ALTER COLUMN "requestingBranchCode" SET NOT NULL;
ALTER TABLE "ClinicalAttachmentAccessGrant" ALTER COLUMN "actorRole" SET NOT NULL;
ALTER TABLE "ClinicalAttachmentAccessGrant" ALTER COLUMN "reason" SET NOT NULL;
ALTER TABLE "NursingWorkItemResult" ALTER COLUMN "branchCode" SET NOT NULL;
ALTER TABLE "ServiceSessionPackage" ALTER COLUMN "branchCode" SET NOT NULL;
ALTER TABLE "ServiceSessionUse" ALTER COLUMN "branchCode" SET NOT NULL;

DROP INDEX "ClinicalAttachment_uploadRequestId_key";
DROP INDEX "ClinicalAttachment_checksumSha256_idx";
DROP INDEX "Study_patientId_idx";
DROP INDEX "Study_visitId_idx";
DROP INDEX "VitalSigns_patientId_idx";
DROP INDEX "VitalSigns_visitId_idx";
DROP INDEX "NursingApplication_patientId_idx";
DROP INDEX "NursingApplication_visitId_idx";
DROP INDEX "NursingNote_patientId_idx";
DROP INDEX "NursingNote_visitId_idx";
DROP INDEX "ClinicalAttachment_patientId_idx";
DROP INDEX "ClinicalAttachment_visitId_idx";
DROP INDEX "ClinicalAttachmentAccessGrant_attachmentId_expiresAt_idx";
DROP INDEX "ClinicalAttachmentAccessGrant_userId_expiresAt_idx";
DROP INDEX "NursingWorkItemResult_workItemId_idx";
DROP INDEX "ServiceSessionPackage_patientId_status_idx";
DROP INDEX "ServiceSessionUse_packageId_idx";
DROP INDEX "ServiceSessionUse_visitId_idx";
CREATE UNIQUE INDEX "Study_id_branchCode_key" ON "Study"("id", "branchCode");
CREATE UNIQUE INDEX "ClinicalAttachment_id_branchCode_key" ON "ClinicalAttachment"("id", "branchCode");
CREATE UNIQUE INDEX "ClinicalAttachment_branchCode_uploadRequestId_key" ON "ClinicalAttachment"("branchCode", "uploadRequestId");
CREATE UNIQUE INDEX "ServiceSessionPackage_id_branchCode_key" ON "ServiceSessionPackage"("id", "branchCode");
CREATE INDEX "Study_branchCode_patientId_idx" ON "Study"("branchCode", "patientId");
CREATE INDEX "Study_branchCode_visitId_idx" ON "Study"("branchCode", "visitId");
CREATE INDEX "VitalSigns_branchCode_patientId_idx" ON "VitalSigns"("branchCode", "patientId");
CREATE INDEX "VitalSigns_branchCode_visitId_idx" ON "VitalSigns"("branchCode", "visitId");
CREATE INDEX "NursingApplication_branchCode_patientId_idx" ON "NursingApplication"("branchCode", "patientId");
CREATE INDEX "NursingApplication_branchCode_visitId_idx" ON "NursingApplication"("branchCode", "visitId");
CREATE INDEX "NursingNote_branchCode_patientId_idx" ON "NursingNote"("branchCode", "patientId");
CREATE INDEX "NursingNote_branchCode_visitId_idx" ON "NursingNote"("branchCode", "visitId");
CREATE INDEX "ClinicalAttachment_branchCode_patientId_idx" ON "ClinicalAttachment"("branchCode", "patientId");
CREATE INDEX "ClinicalAttachment_branchCode_visitId_idx" ON "ClinicalAttachment"("branchCode", "visitId");
CREATE INDEX "ClinicalAttachment_branchCode_checksumSha256_idx" ON "ClinicalAttachment"("branchCode", "checksumSha256");
CREATE INDEX "ClinicalAttachmentAccessGrant_branchCode_attachmentId_expiresAt_idx" ON "ClinicalAttachmentAccessGrant"("branchCode", "attachmentId", "expiresAt");
CREATE INDEX "ClinicalAttachmentAccessGrant_requestingBranchCode_userId_expiresAt_idx" ON "ClinicalAttachmentAccessGrant"("requestingBranchCode", "userId", "expiresAt");
CREATE INDEX "NursingWorkItemResult_branchCode_workItemId_idx" ON "NursingWorkItemResult"("branchCode", "workItemId");
CREATE INDEX "ServiceSessionPackage_branchCode_patientId_status_idx" ON "ServiceSessionPackage"("branchCode", "patientId", "status");
CREATE INDEX "ServiceSessionUse_branchCode_packageId_idx" ON "ServiceSessionUse"("branchCode", "packageId");
CREATE INDEX "ServiceSessionUse_branchCode_visitId_idx" ON "ServiceSessionUse"("branchCode", "visitId");
CREATE INDEX "NursingContinuityAccess_branchCode_patientId_createdAt_idx" ON "NursingContinuityAccess"("branchCode", "patientId", "createdAt");
CREATE INDEX "NursingContinuityAccess_nurseId_expiresAt_idx" ON "NursingContinuityAccess"("nurseId", "expiresAt");
CREATE INDEX "NursingContinuityAccess_visitId_expiresAt_idx" ON "NursingContinuityAccess"("visitId", "expiresAt");

ALTER TABLE "Study" DROP CONSTRAINT "Study_visitId_fkey", DROP CONSTRAINT "Study_clinicalOrderId_fkey", DROP CONSTRAINT "Study_workItemId_fkey";
ALTER TABLE "VitalSigns" DROP CONSTRAINT "VitalSigns_visitId_fkey";
ALTER TABLE "NursingApplication" DROP CONSTRAINT "NursingApplication_visitId_fkey", DROP CONSTRAINT "NursingApplication_clinicalOrderId_fkey", DROP CONSTRAINT "NursingApplication_workItemId_fkey";
ALTER TABLE "NursingNote" DROP CONSTRAINT "NursingNote_visitId_fkey";
ALTER TABLE "ClinicalAttachment" DROP CONSTRAINT "ClinicalAttachment_visitId_fkey", DROP CONSTRAINT "ClinicalAttachment_studyId_fkey";
ALTER TABLE "ClinicalAttachmentAccessGrant" DROP CONSTRAINT "ClinicalAttachmentAccessGrant_attachmentId_fkey";
ALTER TABLE "NursingWorkItemResult" DROP CONSTRAINT "NursingWorkItemResult_workItemId_fkey", DROP CONSTRAINT "NursingWorkItemResult_clinicalOrderId_fkey";
ALTER TABLE "ServiceSessionPackage" DROP CONSTRAINT "ServiceSessionPackage_originVisitId_fkey", DROP CONSTRAINT "ServiceSessionPackage_doctorOrderId_fkey";
ALTER TABLE "ServiceSessionUse" DROP CONSTRAINT "ServiceSessionUse_packageId_fkey", DROP CONSTRAINT "ServiceSessionUse_visitId_fkey";

ALTER TABLE "Study"
  ADD CONSTRAINT "Study_branchCode_fkey" FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "Study_patientId_branchCode_fkey" FOREIGN KEY ("patientId", "branchCode") REFERENCES "PatientBranchRecord"("patientId", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "Study_visitId_branchCode_fkey" FOREIGN KEY ("visitId", "branchCode") REFERENCES "Visit"("id", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "Study_clinicalOrderId_branchCode_fkey" FOREIGN KEY ("clinicalOrderId", "branchCode") REFERENCES "ClinicalOrder"("id", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "Study_workItemId_branchCode_fkey" FOREIGN KEY ("workItemId", "branchCode") REFERENCES "VisitWorkItem"("id", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VitalSigns"
  ADD CONSTRAINT "VitalSigns_branchCode_fkey" FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "VitalSigns_patientId_branchCode_fkey" FOREIGN KEY ("patientId", "branchCode") REFERENCES "PatientBranchRecord"("patientId", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "VitalSigns_visitId_branchCode_fkey" FOREIGN KEY ("visitId", "branchCode") REFERENCES "Visit"("id", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NursingApplication"
  ADD CONSTRAINT "NursingApplication_branchCode_fkey" FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "NursingApplication_patientId_branchCode_fkey" FOREIGN KEY ("patientId", "branchCode") REFERENCES "PatientBranchRecord"("patientId", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "NursingApplication_visitId_branchCode_fkey" FOREIGN KEY ("visitId", "branchCode") REFERENCES "Visit"("id", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "NursingApplication_clinicalOrderId_branchCode_fkey" FOREIGN KEY ("clinicalOrderId", "branchCode") REFERENCES "ClinicalOrder"("id", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "NursingApplication_workItemId_branchCode_fkey" FOREIGN KEY ("workItemId", "branchCode") REFERENCES "VisitWorkItem"("id", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NursingNote"
  ADD CONSTRAINT "NursingNote_branchCode_fkey" FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "NursingNote_patientId_branchCode_fkey" FOREIGN KEY ("patientId", "branchCode") REFERENCES "PatientBranchRecord"("patientId", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "NursingNote_visitId_branchCode_fkey" FOREIGN KEY ("visitId", "branchCode") REFERENCES "Visit"("id", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClinicalAttachment"
  ADD CONSTRAINT "ClinicalAttachment_branchCode_fkey" FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ClinicalAttachment_patientId_branchCode_fkey" FOREIGN KEY ("patientId", "branchCode") REFERENCES "PatientBranchRecord"("patientId", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ClinicalAttachment_visitId_branchCode_fkey" FOREIGN KEY ("visitId", "branchCode") REFERENCES "Visit"("id", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ClinicalAttachment_studyId_branchCode_fkey" FOREIGN KEY ("studyId", "branchCode") REFERENCES "Study"("id", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClinicalAttachmentAccessGrant"
  ADD CONSTRAINT "ClinicalAttachmentAccessGrant_attachmentId_branchCode_fkey" FOREIGN KEY ("attachmentId", "branchCode") REFERENCES "ClinicalAttachment"("id", "branchCode") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "ClinicalAttachmentAccessGrant_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ClinicalAttachmentAccessGrant_branchCode_fkey" FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ClinicalAttachmentAccessGrant_userId_requestingBranchCode_fkey" FOREIGN KEY ("userId", "requestingBranchCode") REFERENCES "InternalUserBranch"("userId", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ClinicalAttachmentAccessGrant_requestingBranchCode_fkey" FOREIGN KEY ("requestingBranchCode") REFERENCES "ClinicBranch"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NursingWorkItemResult"
  ADD CONSTRAINT "NursingWorkItemResult_branchCode_fkey" FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "NursingWorkItemResult_workItemId_branchCode_fkey" FOREIGN KEY ("workItemId", "branchCode") REFERENCES "VisitWorkItem"("id", "branchCode") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "NursingWorkItemResult_clinicalOrderId_branchCode_fkey" FOREIGN KEY ("clinicalOrderId", "branchCode") REFERENCES "ClinicalOrder"("id", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceSessionPackage"
  ADD CONSTRAINT "ServiceSessionPackage_branchCode_fkey" FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ServiceSessionPackage_patientId_branchCode_fkey" FOREIGN KEY ("patientId", "branchCode") REFERENCES "PatientBranchRecord"("patientId", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ServiceSessionPackage_originVisitId_branchCode_fkey" FOREIGN KEY ("originVisitId", "branchCode") REFERENCES "Visit"("id", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ServiceSessionPackage_doctorOrderId_branchCode_fkey" FOREIGN KEY ("doctorOrderId", "branchCode") REFERENCES "DoctorOrder"("id", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceSessionUse"
  ADD CONSTRAINT "ServiceSessionUse_branchCode_fkey" FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ServiceSessionUse_packageId_branchCode_fkey" FOREIGN KEY ("packageId", "branchCode") REFERENCES "ServiceSessionPackage"("id", "branchCode") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "ServiceSessionUse_visitId_branchCode_fkey" FOREIGN KEY ("visitId", "branchCode") REFERENCES "Visit"("id", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NursingContinuityAccess"
  ADD CONSTRAINT "NursingContinuityAccess_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "NursingContinuityAccess_patientId_branchCode_fkey" FOREIGN KEY ("patientId", "branchCode") REFERENCES "PatientBranchRecord"("patientId", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "NursingContinuityAccess_visitId_branchCode_fkey" FOREIGN KEY ("visitId", "branchCode") REFERENCES "Visit"("id", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "NursingContinuityAccess_nurseId_fkey" FOREIGN KEY ("nurseId") REFERENCES "InternalUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "NursingContinuityAccess_nurseId_branchCode_fkey" FOREIGN KEY ("nurseId", "branchCode") REFERENCES "InternalUserBranch"("userId", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "NursingContinuityAccess_branchCode_fkey" FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
