-- Tarea 11: catálogo administrable y fotografía histórica de fuentes por visita.

ALTER TYPE "InternalPermission" ADD VALUE IF NOT EXISTS 'attribution_manage';

CREATE TYPE "CaptureSourceCategory" AS ENUM (
  'social',
  'messaging',
  'referral',
  'offline',
  'web',
  'other'
);

CREATE TYPE "AttributionEvidenceKind" AS ENUM (
  'patient_reported',
  'campaign_link',
  'web_form',
  'legacy_backfill'
);

CREATE TYPE "AttributionTrafficType" AS ENUM (
  'unidentified',
  'organic',
  'paid'
);

CREATE TYPE "AttributionTouchRole" AS ENUM ('primary', 'support');

CREATE TABLE "CaptureSource" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "patientLabel" TEXT NOT NULL,
  "internalLabel" TEXT NOT NULL,
  "category" "CaptureSourceCategory" NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "receptionSelectable" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 100,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CaptureSource_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CaptureSource_code_key" ON "CaptureSource"("code");
CREATE INDEX "CaptureSource_active_receptionSelectable_sortOrder_idx"
  ON "CaptureSource"("active", "receptionSelectable", "sortOrder");
CREATE INDEX "CaptureSource_category_idx" ON "CaptureSource"("category");

INSERT INTO "CaptureSource"
  ("id", "code", "patientLabel", "internalLabel", "category", "active", "receptionSelectable", "sortOrder")
VALUES
  ('capture-facebook', 'facebook', 'Facebook', 'Facebook', 'social', true, true, 10),
  ('capture-tiktok', 'tiktok', 'TikTok', 'TikTok', 'social', true, true, 20),
  ('capture-whatsapp', 'whatsapp', 'WhatsApp', 'WhatsApp', 'messaging', true, true, 30),
  ('capture-referral', 'referral', 'Referido', 'Referido', 'referral', true, true, 40),
  ('capture-previous-patient', 'previous_patient', 'Paciente anterior', 'Paciente anterior', 'referral', true, true, 50),
  ('capture-flyer', 'flyer', 'Volante', 'Volante', 'offline', true, true, 60),
  ('capture-website', 'website', 'Sitio web', 'Sitio web', 'web', true, true, 70),
  ('capture-other', 'other', 'Otro', 'Otro', 'other', true, true, 80),
  ('capture-google', 'google', 'Google', 'Google', 'web', true, false, 90),
  ('capture-call', 'call', 'Llamada', 'Llamada', 'offline', true, false, 100);

CREATE TABLE "CaptureCampaign" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "accountLabel" TEXT,
  "accountHandle" TEXT,
  "trafficType" "AttributionTrafficType" NOT NULL DEFAULT 'unidentified',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CaptureCampaign_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CaptureCampaign_sourceId_fkey"
    FOREIGN KEY ("sourceId") REFERENCES "CaptureSource"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "CaptureCampaign_code_key" ON "CaptureCampaign"("code");
CREATE INDEX "CaptureCampaign_sourceId_active_idx"
  ON "CaptureCampaign"("sourceId", "active");
CREATE INDEX "CaptureCampaign_active_startsAt_endsAt_idx"
  ON "CaptureCampaign"("active", "startsAt", "endsAt");

-- Estos códigos permiten que un enlace o formulario identifique la cuenta
-- exacta sin pedirle al paciente que la distinga.
INSERT INTO "CaptureCampaign"
  ("id", "code", "name", "sourceId", "accountLabel", "accountHandle", "trafficType")
VALUES
  (
    'campaign-tiktok-doctor',
    'TIKTOK-DR',
    'Contenido orgánico del Dr. Franco',
    'capture-tiktok',
    'TikTok del Dr. Franco',
    '@clinicademedicinanatural',
    'organic'
  ),
  (
    'campaign-tiktok-doctora',
    'TIKTOK-DRA',
    'Contenido orgánico de la Dra. Cinthia',
    'capture-tiktok',
    'TikTok de la Dra. Cinthia',
    '@clinica_medicina_natural',
    'organic'
  ),
  (
    'campaign-facebook-clinica',
    'FACEBOOK-CLINICA',
    'Contenido orgánico de Facebook',
    'capture-facebook',
    'Facebook de la clínica',
    'ClinicaDeMedicinaNaturalYTradicional',
    'organic'
  ),
  (
    'campaign-website-form',
    'WEB-FORM',
    'Formulario del sitio web',
    'capture-website',
    'Sitio web de la clínica',
    NULL,
    'organic'
  );

CREATE TABLE "VisitAttribution" (
  "id" TEXT NOT NULL,
  "visitId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "capturedById" TEXT,
  "campaignId" TEXT,
  "evidenceKind" "AttributionEvidenceKind" NOT NULL DEFAULT 'patient_reported',
  "externalEvidenceCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VisitAttribution_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "VisitAttribution_visitId_fkey"
    FOREIGN KEY ("visitId") REFERENCES "Visit"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "VisitAttribution_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "Patient"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "VisitAttribution_capturedById_fkey"
    FOREIGN KEY ("capturedById") REFERENCES "InternalUser"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "VisitAttribution_campaignId_fkey"
    FOREIGN KEY ("campaignId") REFERENCES "CaptureCampaign"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "VisitAttribution_visitId_key"
  ON "VisitAttribution"("visitId");
CREATE INDEX "VisitAttribution_patientId_createdAt_idx"
  ON "VisitAttribution"("patientId", "createdAt");
CREATE INDEX "VisitAttribution_campaignId_createdAt_idx"
  ON "VisitAttribution"("campaignId", "createdAt");
CREATE INDEX "VisitAttribution_evidenceKind_createdAt_idx"
  ON "VisitAttribution"("evidenceKind", "createdAt");

CREATE TABLE "VisitAttributionTouch" (
  "id" TEXT NOT NULL,
  "attributionId" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "role" "AttributionTouchRole" NOT NULL,
  "evidenceKind" "AttributionEvidenceKind" NOT NULL,
  "trafficType" "AttributionTrafficType" NOT NULL DEFAULT 'unidentified',
  "accountLabel" TEXT,
  "accountHandle" TEXT,
  "campaignCode" TEXT,
  "automaticallyCaptured" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VisitAttributionTouch_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "VisitAttributionTouch_attributionId_fkey"
    FOREIGN KEY ("attributionId") REFERENCES "VisitAttribution"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "VisitAttributionTouch_sourceId_fkey"
    FOREIGN KEY ("sourceId") REFERENCES "CaptureSource"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "VisitAttributionTouch_attributionId_sourceId_key"
  ON "VisitAttributionTouch"("attributionId", "sourceId");
CREATE INDEX "VisitAttributionTouch_sourceId_role_createdAt_idx"
  ON "VisitAttributionTouch"("sourceId", "role", "createdAt");
CREATE INDEX "VisitAttributionTouch_campaignCode_createdAt_idx"
  ON "VisitAttributionTouch"("campaignCode", "createdAt");

-- Los datos anteriores usan la mejor fuente disponible en la ficha actual.
INSERT INTO "VisitAttribution"
  ("id", "visitId", "patientId", "capturedById", "evidenceKind", "createdAt")
SELECT
  'attribution-' || visit."id",
  visit."id",
  visit."patientId",
  visit."createdById",
  'legacy_backfill',
  visit."checkedInAt"
FROM "Visit" AS visit;

INSERT INTO "VisitAttributionTouch"
  (
    "id",
    "attributionId",
    "sourceId",
    "role",
    "evidenceKind",
    "trafficType",
    "automaticallyCaptured",
    "createdAt"
  )
SELECT
  'attribution-touch-primary-' || visit."id",
  'attribution-' || visit."id",
  source."id",
  'primary',
  'legacy_backfill',
  'unidentified',
  false,
  visit."checkedInAt"
FROM "Visit" AS visit
JOIN "Patient" AS patient ON patient."id" = visit."patientId"
JOIN "CaptureSource" AS source
  ON source."code" = CASE
    WHEN patient."captureSource"::text IN ('facebook_ads', 'facebook_organic')
      THEN 'facebook'
    ELSE patient."captureSource"::text
  END;

WITH support_sources AS (
  SELECT DISTINCT
    visit."id" AS "visitId",
    visit."checkedInAt",
    CASE
      WHEN captured_source::text IN ('facebook_ads', 'facebook_organic')
        THEN 'facebook'
      ELSE captured_source::text
    END AS "sourceCode",
    CASE
      WHEN patient."captureSource"::text IN ('facebook_ads', 'facebook_organic')
        THEN 'facebook'
      ELSE patient."captureSource"::text
    END AS "primaryCode"
  FROM "Visit" AS visit
  JOIN "Patient" AS patient ON patient."id" = visit."patientId"
  CROSS JOIN LATERAL UNNEST(patient."captureSources") AS captured_source
)
INSERT INTO "VisitAttributionTouch"
  (
    "id",
    "attributionId",
    "sourceId",
    "role",
    "evidenceKind",
    "trafficType",
    "automaticallyCaptured",
    "createdAt"
  )
SELECT
  'attribution-touch-support-' || support."visitId" || '-' || source."code",
  'attribution-' || support."visitId",
  source."id",
  'support',
  'legacy_backfill',
  'unidentified',
  false,
  support."checkedInAt"
FROM support_sources AS support
JOIN "CaptureSource" AS source ON source."code" = support."sourceCode"
WHERE support."sourceCode" <> support."primaryCode";
