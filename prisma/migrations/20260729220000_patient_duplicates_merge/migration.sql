-- Tarea 12: detección y fusión segura de fichas duplicadas.

ALTER TYPE "InternalPermission"
  ADD VALUE IF NOT EXISTS 'patient_duplicates_read';
ALTER TYPE "InternalPermission"
  ADD VALUE IF NOT EXISTS 'patient_duplicates_review';
ALTER TYPE "InternalPermission"
  ADD VALUE IF NOT EXISTS 'patient_duplicates_merge';

CREATE TYPE "PatientDuplicateCandidateStatus" AS ENUM (
  'open',
  'dismissed',
  'merged'
);

ALTER TABLE "Patient"
  ADD COLUMN "normalizedName" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "normalizedPhone" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "mergedIntoId" TEXT;

UPDATE "Patient"
SET "normalizedPhone" = RIGHT(
  REGEXP_REPLACE("phone", '[^0-9]', '', 'g'),
  8
);

WITH normalized_names AS (
  SELECT
    patient."id",
    STRING_AGG(token, ' ' ORDER BY token) AS "normalizedName"
  FROM "Patient" AS patient
  CROSS JOIN LATERAL REGEXP_SPLIT_TO_TABLE(
    TRIM(
      REGEXP_REPLACE(
        LOWER(
          TRANSLATE(
            patient."fullName",
            'ÁÉÍÓÚÜÑáéíóúüñ',
            'AEIOUUNaeiouun'
          )
        ),
        '[^a-z0-9]+',
        ' ',
        'g'
      )
    ),
    '\s+'
  ) AS token
  WHERE token <> ''
  GROUP BY patient."id"
)
UPDATE "Patient" AS patient
SET "normalizedName" = normalized_names."normalizedName"
FROM normalized_names
WHERE patient."id" = normalized_names."id";

CREATE INDEX "Patient_normalizedPhone_idx"
  ON "Patient"("normalizedPhone");
CREATE INDEX "Patient_normalizedName_birthDate_idx"
  ON "Patient"("normalizedName", "birthDate");
CREATE INDEX "Patient_mergedIntoId_idx"
  ON "Patient"("mergedIntoId");

ALTER TABLE "Patient"
  ADD CONSTRAINT "Patient_mergedIntoId_fkey"
  FOREIGN KEY ("mergedIntoId") REFERENCES "Patient"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "PatientMerge" (
  "id" TEXT NOT NULL,
  "sourcePatientId" TEXT NOT NULL,
  "targetPatientId" TEXT NOT NULL,
  "mergedById" TEXT,
  "sourceSnapshot" JSONB NOT NULL,
  "targetSnapshot" JSONB NOT NULL,
  "impact" JSONB NOT NULL,
  "mergedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PatientMerge_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PatientMerge_sourcePatientId_fkey"
    FOREIGN KEY ("sourcePatientId") REFERENCES "Patient"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PatientMerge_targetPatientId_fkey"
    FOREIGN KEY ("targetPatientId") REFERENCES "Patient"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PatientMerge_mergedById_fkey"
    FOREIGN KEY ("mergedById") REFERENCES "InternalUser"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "PatientMerge_sourcePatientId_key"
  ON "PatientMerge"("sourcePatientId");
CREATE INDEX "PatientMerge_targetPatientId_mergedAt_idx"
  ON "PatientMerge"("targetPatientId", "mergedAt");
CREATE INDEX "PatientMerge_mergedById_mergedAt_idx"
  ON "PatientMerge"("mergedById", "mergedAt");

CREATE TABLE "PatientDuplicateCandidate" (
  "id" TEXT NOT NULL,
  "pairKey" TEXT NOT NULL,
  "patientAId" TEXT NOT NULL,
  "patientBId" TEXT NOT NULL,
  "phoneMatch" BOOLEAN NOT NULL DEFAULT false,
  "nameMatch" BOOLEAN NOT NULL DEFAULT false,
  "birthDateMatch" BOOLEAN NOT NULL DEFAULT false,
  "score" INTEGER NOT NULL,
  "status" "PatientDuplicateCandidateStatus" NOT NULL DEFAULT 'open',
  "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastDetectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3),
  "reviewedById" TEXT,
  "mergeId" TEXT,
  CONSTRAINT "PatientDuplicateCandidate_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PatientDuplicateCandidate_patientAId_fkey"
    FOREIGN KEY ("patientAId") REFERENCES "Patient"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PatientDuplicateCandidate_patientBId_fkey"
    FOREIGN KEY ("patientBId") REFERENCES "Patient"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PatientDuplicateCandidate_reviewedById_fkey"
    FOREIGN KEY ("reviewedById") REFERENCES "InternalUser"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "PatientDuplicateCandidate_mergeId_fkey"
    FOREIGN KEY ("mergeId") REFERENCES "PatientMerge"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "PatientDuplicateCandidate_pairKey_key"
  ON "PatientDuplicateCandidate"("pairKey");
CREATE UNIQUE INDEX "PatientDuplicateCandidate_mergeId_key"
  ON "PatientDuplicateCandidate"("mergeId");
CREATE INDEX "PatientDuplicateCandidate_status_score_lastDetectedAt_idx"
  ON "PatientDuplicateCandidate"("status", "score", "lastDetectedAt");
CREATE INDEX "PatientDuplicateCandidate_patientAId_status_idx"
  ON "PatientDuplicateCandidate"("patientAId", "status");
CREATE INDEX "PatientDuplicateCandidate_patientBId_status_idx"
  ON "PatientDuplicateCandidate"("patientBId", "status");

CREATE TABLE "PatientAlias" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "sourcePatientId" TEXT NOT NULL,
  "internalCode" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "normalizedName" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "normalizedPhone" TEXT NOT NULL,
  "birthDate" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PatientAlias_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PatientAlias_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "Patient"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PatientAlias_sourcePatientId_fkey"
    FOREIGN KEY ("sourcePatientId") REFERENCES "Patient"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "PatientAlias_sourcePatientId_key"
  ON "PatientAlias"("sourcePatientId");
CREATE UNIQUE INDEX "PatientAlias_internalCode_key"
  ON "PatientAlias"("internalCode");
CREATE INDEX "PatientAlias_patientId_idx"
  ON "PatientAlias"("patientId");
CREATE INDEX "PatientAlias_normalizedPhone_idx"
  ON "PatientAlias"("normalizedPhone");
CREATE INDEX "PatientAlias_normalizedName_birthDate_idx"
  ON "PatientAlias"("normalizedName", "birthDate");

-- La cola inicial detecta coincidencia de teléfono normalizado o la
-- combinación de nombre normalizado y fecha de nacimiento.
INSERT INTO "PatientDuplicateCandidate" (
  "id",
  "pairKey",
  "patientAId",
  "patientBId",
  "phoneMatch",
  "nameMatch",
  "birthDateMatch",
  "score"
)
SELECT
  'duplicate-' || MD5(first."id" || ':' || second."id"),
  first."id" || ':' || second."id",
  first."id",
  second."id",
  (
    LENGTH(first."normalizedPhone") >= 7
    AND first."normalizedPhone" = second."normalizedPhone"
  ),
  (
    LENGTH(first."normalizedName") >= 4
    AND first."normalizedName" = second."normalizedName"
  ),
  (
    first."birthDate" IS NOT NULL
    AND first."birthDate" = second."birthDate"
  ),
  (
    CASE
      WHEN LENGTH(first."normalizedPhone") >= 7
        AND first."normalizedPhone" = second."normalizedPhone"
      THEN 70 ELSE 0
    END
    +
    CASE
      WHEN LENGTH(first."normalizedName") >= 4
        AND first."normalizedName" = second."normalizedName"
      THEN 20 ELSE 0
    END
    +
    CASE
      WHEN first."birthDate" IS NOT NULL
        AND first."birthDate" = second."birthDate"
      THEN 30 ELSE 0
    END
  )
FROM "Patient" AS first
JOIN "Patient" AS second ON first."id" < second."id"
WHERE first."mergedIntoId" IS NULL
  AND second."mergedIntoId" IS NULL
  AND first."status" <> 'archived'
  AND second."status" <> 'archived'
  AND (
    (
      LENGTH(first."normalizedPhone") >= 7
      AND first."normalizedPhone" = second."normalizedPhone"
    )
    OR
    (
      LENGTH(first."normalizedName") >= 4
      AND first."normalizedName" = second."normalizedName"
      AND first."birthDate" IS NOT NULL
      AND first."birthDate" = second."birthDate"
    )
  );
