-- La identidad del paciente permanece global. Su expediente operativo y las
-- fotografías históricas pertenecen a la sucursal que produjo la atención.
BEGIN;

ALTER TYPE "PatientConsentPurpose" ADD VALUE IF NOT EXISTS 'clinical_continuity';

ALTER TABLE "Patient"
  ADD COLUMN IF NOT EXISTS "documentNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "normalizedDocumentNumber" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "revision" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "PatientDuplicateCandidate"
  ADD COLUMN IF NOT EXISTS "documentMatch" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "PatientAlias"
  ADD COLUMN IF NOT EXISTS "documentNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "normalizedDocumentNumber" TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS "PatientIdentityVersion" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "revision" INTEGER NOT NULL,
  "internalCode" TEXT NOT NULL,
  "documentNumber" TEXT,
  "normalizedDocumentNumber" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "secondaryPhone" TEXT,
  "birthDate" TIMESTAMP(3),
  "gender" "PatientGender" NOT NULL,
  "city" TEXT,
  "department" TEXT,
  "country" TEXT,
  "address" TEXT,
  "changedById" TEXT,
  "changeReason" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PatientIdentityVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PatientBranchRecord" (
  "patientId" TEXT NOT NULL,
  "branchCode" TEXT NOT NULL,
  "recordNumber" TEXT NOT NULL,
  "status" "PatientStatus" NOT NULL DEFAULT 'active',
  "generalObservations" TEXT,
  "allergies" TEXT,
  "relevantHistory" TEXT,
  "currentMedication" TEXT,
  "firstAttendedAt" TIMESTAMP(3),
  "lastAttendedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PatientBranchRecord_pkey" PRIMARY KEY ("patientId", "branchCode")
);

ALTER TABLE "PatientConsent" ADD COLUMN IF NOT EXISTS "branchCode" TEXT;
ALTER TABLE "PatientContact" ADD COLUMN IF NOT EXISTS "branchCode" TEXT;
ALTER TABLE "PatientNote" ADD COLUMN IF NOT EXISTS "branchCode" TEXT;

ALTER TABLE "Visit"
  ADD COLUMN IF NOT EXISTS "patientNameSnapshot" TEXT,
  ADD COLUMN IF NOT EXISTS "patientDocumentSnapshot" TEXT,
  ADD COLUMN IF NOT EXISTS "patientPhoneSnapshot" TEXT,
  ADD COLUMN IF NOT EXISTS "patientAddressSnapshot" TEXT;

-- Solo relaciones operativas que ya poseen sucursal son evidencia válida.
CREATE TEMPORARY TABLE "_PatientBranchEvidence" AS
SELECT DISTINCT evidence."patientId", evidence."branchCode"
FROM (
  SELECT "patientId", "branchCode" FROM "Visit"
  UNION ALL
  SELECT "patientId", "branchCode" FROM "Sale"
  UNION ALL
  SELECT "patientId", "branchCode" FROM "Payment"
  UNION ALL
  SELECT "patientId", "branchCode" FROM "CashMovement" WHERE "patientId" IS NOT NULL
  UNION ALL
  SELECT "patientId", "branchCode" FROM "FollowUpTask"
) AS evidence
WHERE evidence."patientId" IS NOT NULL;

CREATE TEMPORARY TABLE "_PatientBranchEvidenceCount" AS
SELECT "patientId", COUNT(*)::INTEGER AS "branchCount"
FROM "_PatientBranchEvidence"
GROUP BY "patientId";

INSERT INTO "PatientBranchRecord" (
  "patientId",
  "branchCode",
  "recordNumber",
  "status",
  "generalObservations",
  "allergies",
  "relevantHistory",
  "currentMedication",
  "firstAttendedAt",
  "lastAttendedAt",
  "createdAt",
  "updatedAt"
)
SELECT
  evidence."patientId",
  evidence."branchCode",
  evidence."branchCode" || '-' || patient."internalCode",
  patient."status",
  CASE WHEN counts."branchCount" = 1 THEN patient."generalObservations" END,
  CASE WHEN counts."branchCount" = 1 THEN patient."allergies" END,
  CASE WHEN counts."branchCount" = 1 THEN patient."relevantHistory" END,
  CASE WHEN counts."branchCount" = 1 THEN patient."currentMedication" END,
  visits."firstAttendedAt",
  visits."lastAttendedAt",
  patient."createdAt",
  CURRENT_TIMESTAMP
FROM "_PatientBranchEvidence" AS evidence
JOIN "Patient" AS patient ON patient."id" = evidence."patientId"
JOIN "_PatientBranchEvidenceCount" AS counts
  ON counts."patientId" = evidence."patientId"
LEFT JOIN (
  SELECT
    "patientId",
    "branchCode",
    MIN("checkedInAt") AS "firstAttendedAt",
    MAX("checkedInAt") AS "lastAttendedAt"
  FROM "Visit"
  GROUP BY "patientId", "branchCode"
) AS visits
  ON visits."patientId" = evidence."patientId"
 AND visits."branchCode" = evidence."branchCode"
ON CONFLICT ("patientId", "branchCode") DO NOTHING;

-- Cuando existe una sola sede verificable, el perfil local queda transferido
-- y los NULL en Patient funcionan como marca técnica de reconciliación.
UPDATE "Patient" AS patient
SET
  "generalObservations" = NULL,
  "allergies" = NULL,
  "relevantHistory" = NULL,
  "currentMedication" = NULL
FROM "_PatientBranchEvidenceCount" AS evidence
WHERE evidence."patientId" = patient."id"
  AND evidence."branchCount" = 1;

INSERT INTO "PatientIdentityVersion" (
  "id", "patientId", "revision", "internalCode", "documentNumber",
  "normalizedDocumentNumber", "fullName", "phone", "secondaryPhone",
  "birthDate", "gender", "city", "department", "country", "address",
  "changedById", "changeReason", "createdAt"
)
SELECT
  'legacy-' || md5(patient."id"),
  patient."id",
  1,
  patient."internalCode",
  NULL,
  '',
  patient."fullName",
  patient."phone",
  patient."secondaryPhone",
  patient."birthDate",
  patient."gender",
  patient."city",
  patient."department",
  patient."country",
  patient."address",
  NULL,
  'Migración inicial de identidad global',
  patient."createdAt"
FROM "Patient" AS patient
ON CONFLICT ("id") DO NOTHING;

UPDATE "Visit" AS visit
SET
  "patientNameSnapshot" = patient."fullName",
  "patientDocumentSnapshot" = patient."documentNumber",
  "patientPhoneSnapshot" = patient."phone",
  "patientAddressSnapshot" = patient."address"
FROM "Patient" AS patient
WHERE patient."id" = visit."patientId";

-- El trigger append-only protege la operación normal, pero este backfill
-- versionado debe materializar una sola vez la sede demostrada. PostgreSQL
-- revierte también este cambio de trigger si la migración falla.
ALTER TABLE "PatientConsent"
  DISABLE TRIGGER "PatientConsent_prevent_update_delete";

WITH unique_evidence AS (
  SELECT evidence."patientId", MIN(evidence."branchCode") AS "branchCode"
  FROM "_PatientBranchEvidence" AS evidence
  JOIN "_PatientBranchEvidenceCount" AS counts
    ON counts."patientId" = evidence."patientId"
  WHERE counts."branchCount" = 1
  GROUP BY evidence."patientId"
)
UPDATE "PatientConsent" AS child
SET "branchCode" = evidence."branchCode"
FROM unique_evidence AS evidence
WHERE evidence."patientId" = child."patientId";

ALTER TABLE "PatientConsent"
  ENABLE TRIGGER "PatientConsent_prevent_update_delete";

WITH unique_evidence AS (
  SELECT evidence."patientId", MIN(evidence."branchCode") AS "branchCode"
  FROM "_PatientBranchEvidence" AS evidence
  JOIN "_PatientBranchEvidenceCount" AS counts
    ON counts."patientId" = evidence."patientId"
  WHERE counts."branchCount" = 1
  GROUP BY evidence."patientId"
)
UPDATE "PatientContact" AS child
SET "branchCode" = evidence."branchCode"
FROM unique_evidence AS evidence
WHERE evidence."patientId" = child."patientId";

WITH unique_evidence AS (
  SELECT evidence."patientId", MIN(evidence."branchCode") AS "branchCode"
  FROM "_PatientBranchEvidence" AS evidence
  JOIN "_PatientBranchEvidenceCount" AS counts
    ON counts."patientId" = evidence."patientId"
  WHERE counts."branchCount" = 1
  GROUP BY evidence."patientId"
)
UPDATE "PatientNote" AS child
SET "branchCode" = evidence."branchCode"
FROM unique_evidence AS evidence
WHERE evidence."patientId" = child."patientId";

DROP TABLE "_PatientBranchEvidenceCount";
DROP TABLE "_PatientBranchEvidence";

CREATE UNIQUE INDEX "PatientIdentityVersion_patientId_revision_key"
  ON "PatientIdentityVersion"("patientId", "revision");
CREATE INDEX "PatientIdentityVersion_patientId_createdAt_idx"
  ON "PatientIdentityVersion"("patientId", "createdAt");
CREATE INDEX "PatientIdentityVersion_changedById_createdAt_idx"
  ON "PatientIdentityVersion"("changedById", "createdAt");
CREATE INDEX "Patient_normalizedDocumentNumber_idx"
  ON "Patient"("normalizedDocumentNumber");
CREATE INDEX "PatientAlias_normalizedDocumentNumber_idx"
  ON "PatientAlias"("normalizedDocumentNumber");
CREATE UNIQUE INDEX "PatientBranchRecord_branchCode_recordNumber_key"
  ON "PatientBranchRecord"("branchCode", "recordNumber");
CREATE INDEX "PatientBranchRecord_branchCode_status_updatedAt_idx"
  ON "PatientBranchRecord"("branchCode", "status", "updatedAt");
CREATE INDEX "PatientBranchRecord_patientId_lastAttendedAt_idx"
  ON "PatientBranchRecord"("patientId", "lastAttendedAt");
CREATE INDEX "Visit_patientId_branchCode_idx"
  ON "Visit"("patientId", "branchCode");
CREATE INDEX "PatientConsent_branchCode_patientId_purpose_decidedAt_idx"
  ON "PatientConsent"("branchCode", "patientId", "purpose", "decidedAt");
CREATE INDEX "PatientContact_branchCode_patientId_idx"
  ON "PatientContact"("branchCode", "patientId");
CREATE INDEX "PatientNote_branchCode_patientId_createdAt_idx"
  ON "PatientNote"("branchCode", "patientId", "createdAt");

ALTER TABLE "PatientIdentityVersion"
  ADD CONSTRAINT "PatientIdentityVersion_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "Patient"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientIdentityVersion"
  ADD CONSTRAINT "PatientIdentityVersion_changedById_fkey"
  FOREIGN KEY ("changedById") REFERENCES "InternalUser"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PatientBranchRecord"
  ADD CONSTRAINT "PatientBranchRecord_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "Patient"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientBranchRecord"
  ADD CONSTRAINT "PatientBranchRecord_branchCode_fkey"
  FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code")
  ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
