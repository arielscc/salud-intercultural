-- Tarea 9: expansión y atribución determinista. No asigna una sede por defecto.
BEGIN;

ALTER TABLE "Study" ADD COLUMN "branchCode" TEXT;
ALTER TABLE "VitalSigns" ADD COLUMN "branchCode" TEXT;
ALTER TABLE "NursingApplication" ADD COLUMN "branchCode" TEXT;
ALTER TABLE "NursingNote" ADD COLUMN "branchCode" TEXT;
ALTER TABLE "ClinicalAttachment" ADD COLUMN "branchCode" TEXT;
ALTER TABLE "ClinicalAttachmentAccessGrant" ADD COLUMN "patientId" TEXT;
ALTER TABLE "ClinicalAttachmentAccessGrant" ADD COLUMN "branchCode" TEXT;
ALTER TABLE "ClinicalAttachmentAccessGrant" ADD COLUMN "requestingBranchCode" TEXT;
ALTER TABLE "ClinicalAttachmentAccessGrant" ADD COLUMN "actorRole" "InternalRole";
ALTER TABLE "ClinicalAttachmentAccessGrant" ADD COLUMN "reason" TEXT;
ALTER TABLE "NursingWorkItemResult" ADD COLUMN "branchCode" TEXT;
ALTER TABLE "ServiceSessionPackage" ADD COLUMN "branchCode" TEXT;
ALTER TABLE "ServiceSessionUse" ADD COLUMN "branchCode" TEXT;

UPDATE "Study" child SET "branchCode" = COALESCE(
  (SELECT "branchCode" FROM "Visit" WHERE "id" = child."visitId"),
  (SELECT "branchCode" FROM "ClinicalOrder" WHERE "id" = child."clinicalOrderId"),
  (SELECT "branchCode" FROM "VisitWorkItem" WHERE "id" = child."workItemId"),
  (SELECT MIN(record."branchCode") FROM "PatientBranchRecord" record
   WHERE record."patientId" = child."patientId" HAVING COUNT(*) = 1)
);
UPDATE "VitalSigns" child SET "branchCode" = visit."branchCode"
FROM "Visit" visit WHERE child."visitId" = visit."id";
UPDATE "VitalSigns" child SET "branchCode" = (
  SELECT MIN(record."branchCode") FROM "PatientBranchRecord" record
  WHERE record."patientId" = child."patientId" HAVING COUNT(*) = 1
) WHERE child."branchCode" IS NULL;
UPDATE "NursingApplication" child SET "branchCode" = COALESCE(
  (SELECT "branchCode" FROM "Visit" WHERE "id" = child."visitId"),
  (SELECT "branchCode" FROM "ClinicalOrder" WHERE "id" = child."clinicalOrderId"),
  (SELECT "branchCode" FROM "VisitWorkItem" WHERE "id" = child."workItemId"),
  (SELECT MIN(record."branchCode") FROM "PatientBranchRecord" record
   WHERE record."patientId" = child."patientId" HAVING COUNT(*) = 1)
);
UPDATE "NursingNote" child SET "branchCode" = visit."branchCode"
FROM "Visit" visit WHERE child."visitId" = visit."id";
UPDATE "NursingNote" child SET "branchCode" = (
  SELECT MIN(record."branchCode") FROM "PatientBranchRecord" record
  WHERE record."patientId" = child."patientId" HAVING COUNT(*) = 1
) WHERE child."branchCode" IS NULL;
UPDATE "ClinicalAttachment" child SET "branchCode" = COALESCE(
  (SELECT "branchCode" FROM "Visit" WHERE "id" = child."visitId"),
  (SELECT "branchCode" FROM "Study" WHERE "id" = child."studyId"),
  (SELECT MIN(record."branchCode") FROM "PatientBranchRecord" record
   WHERE record."patientId" = child."patientId" HAVING COUNT(*) = 1)
);
UPDATE "NursingWorkItemResult" child SET "branchCode" = work."branchCode"
FROM "VisitWorkItem" work WHERE child."workItemId" = work."id";
UPDATE "ServiceSessionPackage" child SET "branchCode" = COALESCE(
  (SELECT "branchCode" FROM "Visit" WHERE "id" = child."originVisitId"),
  (SELECT "branchCode" FROM "DoctorOrder" WHERE "id" = child."doctorOrderId"),
  (SELECT "branchCode" FROM "Sale" WHERE "id" = child."saleId"),
  (SELECT MIN(record."branchCode") FROM "PatientBranchRecord" record
   WHERE record."patientId" = child."patientId" HAVING COUNT(*) = 1)
);
UPDATE "ServiceSessionUse" child SET "branchCode" = package."branchCode"
FROM "ServiceSessionPackage" package WHERE child."packageId" = package."id";
-- Los grants duran dos minutos y el esquema anterior no permite demostrar desde
-- qué sede se emitieron. Se revocan durante el despliegue en lugar de inventar
-- ownership o rol histórico; los archivos y sus metadatos no se eliminan.
DELETE FROM "ClinicalAttachmentAccessGrant";

CREATE TABLE "NursingContinuityAccess" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "visitId" TEXT NOT NULL,
  "nurseId" TEXT NOT NULL,
  "branchCode" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "consultedBranchCodes" TEXT[],
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NursingContinuityAccess_pkey" PRIMARY KEY ("id")
);

COMMIT;
