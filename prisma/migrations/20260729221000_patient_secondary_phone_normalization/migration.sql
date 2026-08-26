-- Completa la detección de duplicados usando también el teléfono alternativo.

ALTER TABLE "Patient"
  ADD COLUMN "normalizedSecondaryPhone" TEXT NOT NULL DEFAULT '';

UPDATE "Patient"
SET "normalizedSecondaryPhone" = CASE
  WHEN "secondaryPhone" IS NULL THEN ''
  ELSE RIGHT(REGEXP_REPLACE("secondaryPhone", '[^0-9]', '', 'g'), 8)
END;

CREATE INDEX "Patient_normalizedSecondaryPhone_idx"
  ON "Patient"("normalizedSecondaryPhone");

ALTER TABLE "PatientAlias"
  ADD COLUMN "secondaryPhone" TEXT,
  ADD COLUMN "normalizedSecondaryPhone" TEXT NOT NULL DEFAULT '';

CREATE INDEX "PatientAlias_normalizedSecondaryPhone_idx"
  ON "PatientAlias"("normalizedSecondaryPhone");

WITH matches AS (
  SELECT
    first."id" AS "patientAId",
    second."id" AS "patientBId",
    (
      (
        LENGTH(first."normalizedPhone") >= 7
        AND first."normalizedPhone" IN (
          second."normalizedPhone",
          second."normalizedSecondaryPhone"
        )
      )
      OR
      (
        LENGTH(first."normalizedSecondaryPhone") >= 7
        AND first."normalizedSecondaryPhone" IN (
          second."normalizedPhone",
          second."normalizedSecondaryPhone"
        )
      )
    ) AS "phoneMatch",
    (
      LENGTH(first."normalizedName") >= 4
      AND first."normalizedName" = second."normalizedName"
    ) AS "nameMatch",
    (
      first."birthDate" IS NOT NULL
      AND first."birthDate" = second."birthDate"
    ) AS "birthDateMatch"
  FROM "Patient" AS first
  JOIN "Patient" AS second ON first."id" < second."id"
  WHERE first."mergedIntoId" IS NULL
    AND second."mergedIntoId" IS NULL
    AND first."status" <> 'archived'
    AND second."status" <> 'archived'
)
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
  'duplicate-' || MD5(matches."patientAId" || ':' || matches."patientBId"),
  matches."patientAId" || ':' || matches."patientBId",
  matches."patientAId",
  matches."patientBId",
  matches."phoneMatch",
  matches."nameMatch",
  matches."birthDateMatch",
  (
    CASE WHEN matches."phoneMatch" THEN 70 ELSE 0 END
    + CASE WHEN matches."nameMatch" THEN 20 ELSE 0 END
    + CASE WHEN matches."birthDateMatch" THEN 30 ELSE 0 END
  )
FROM matches
WHERE matches."phoneMatch"
  OR (matches."nameMatch" AND matches."birthDateMatch")
ON CONFLICT ("pairKey") DO UPDATE SET
  "phoneMatch" = EXCLUDED."phoneMatch",
  "nameMatch" = EXCLUDED."nameMatch",
  "birthDateMatch" = EXCLUDED."birthDateMatch",
  "score" = EXCLUDED."score",
  "lastDetectedAt" = CURRENT_TIMESTAMP;
