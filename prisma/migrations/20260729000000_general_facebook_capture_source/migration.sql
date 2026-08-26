-- Recepcion pregunta solo por "Facebook". La distincion entre publicidad y
-- contenido organico queda fuera de la respuesta del paciente.

ALTER TYPE "InternalLeadSource" ADD VALUE IF NOT EXISTS 'facebook';
ALTER TYPE "PatientCaptureSource" ADD VALUE IF NOT EXISTS 'facebook';

UPDATE "Lead"
SET "source" = 'facebook'
WHERE "source"::text IN ('facebook_ads', 'facebook_organic');

UPDATE "Patient"
SET "captureSource" = 'facebook'
WHERE "captureSource"::text IN ('facebook_ads', 'facebook_organic');

UPDATE "Patient" AS patient
SET "captureSources" = (
  SELECT ARRAY_AGG(deduplicated.source ORDER BY deduplicated.first_position)
  FROM (
    SELECT
      normalized.source,
      MIN(normalized.position) AS first_position
    FROM (
      SELECT
        CASE
          WHEN item.source::text IN ('facebook_ads', 'facebook_organic')
            THEN 'facebook'::"PatientCaptureSource"
          ELSE item.source
        END AS source,
        item.position
      FROM UNNEST(patient."captureSources") WITH ORDINALITY AS item(source, position)
    ) AS normalized
    GROUP BY normalized.source
  ) AS deduplicated
)
WHERE patient."captureSources" && ARRAY[
  'facebook_ads'::"PatientCaptureSource",
  'facebook_organic'::"PatientCaptureSource"
];
