-- Tarea 9: decisiones de consentimiento independientes, versionadas e
-- inmutables. La preferencia antigua nunca se convierte en una autorización.

ALTER TYPE "InternalPermission"
  ADD VALUE IF NOT EXISTS 'patient_consents_read';
ALTER TYPE "InternalPermission"
  ADD VALUE IF NOT EXISTS 'patient_consents_write';

CREATE TYPE "PatientConsentPurpose" AS ENUM (
  'follow_up',
  'reminders',
  'education',
  'promotions',
  'image_voice'
);

CREATE TYPE "PatientConsentDecision" AS ENUM (
  'granted',
  'denied',
  'withdrawn'
);

CREATE TYPE "PatientConsentCaptureMethod" AS ENUM (
  'in_person_verbal',
  'written_form',
  'phone_call',
  'whatsapp',
  'digital_form',
  'legacy_record'
);

CREATE TYPE "PatientContactChannel" AS ENUM ('whatsapp', 'call');

CREATE TABLE "PatientConsent" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "purpose" "PatientConsentPurpose" NOT NULL,
  "decision" "PatientConsentDecision" NOT NULL,
  "contactChannels" "PatientContactChannel"[] NOT NULL DEFAULT ARRAY[]::"PatientContactChannel"[],
  "captureMethod" "PatientConsentCaptureMethod" NOT NULL,
  "textVersion" TEXT NOT NULL,
  "textSnapshot" TEXT NOT NULL,
  "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "recordedById" TEXT,
  "supersedesId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PatientConsent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PatientConsent_contact_channels_check" CHECK (
    (
      "decision" = 'granted'
      AND "purpose" IN ('follow_up', 'reminders', 'education', 'promotions')
      AND cardinality("contactChannels") > 0
    )
    OR (
      "decision" = 'granted'
      AND "purpose" = 'image_voice'
      AND cardinality("contactChannels") = 0
    )
    OR (
      "decision" IN ('denied', 'withdrawn')
      AND cardinality("contactChannels") = 0
    )
  )
);

CREATE UNIQUE INDEX "PatientConsent_supersedesId_key"
  ON "PatientConsent"("supersedesId");
CREATE INDEX "PatientConsent_patientId_purpose_decidedAt_idx"
  ON "PatientConsent"("patientId", "purpose", "decidedAt");
CREATE INDEX "PatientConsent_patientId_decidedAt_idx"
  ON "PatientConsent"("patientId", "decidedAt");
CREATE INDEX "PatientConsent_purpose_decision_decidedAt_idx"
  ON "PatientConsent"("purpose", "decision", "decidedAt");
CREATE INDEX "PatientConsent_recordedById_idx"
  ON "PatientConsent"("recordedById");
CREATE INDEX "PatientConsent_createdAt_idx"
  ON "PatientConsent"("createdAt");

ALTER TABLE "PatientConsent"
  ADD CONSTRAINT "PatientConsent_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "Patient"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientConsent"
  ADD CONSTRAINT "PatientConsent_recordedById_fkey"
  FOREIGN KEY ("recordedById") REFERENCES "InternalUser"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PatientConsent"
  ADD CONSTRAINT "PatientConsent_supersedesId_fkey"
  FOREIGN KEY ("supersedesId") REFERENCES "PatientConsent"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Una negativa anterior es segura de conservar. Las preferencias positivas
-- antiguas no prueban que el paciente aceptó un texto y quedan sin migrar.
INSERT INTO "PatientConsent" (
  "id",
  "patientId",
  "purpose",
  "decision",
  "contactChannels",
  "captureMethod",
  "textVersion",
  "textSnapshot",
  "decidedAt",
  "createdAt"
)
SELECT
  'legacy_follow_up_' || "id",
  "id",
  'follow_up',
  'denied',
  ARRAY[]::"PatientContactChannel"[],
  'legacy_record',
  'legacy_preference_v0',
  'Registro anterior: el paciente prefirió no recibir seguimiento. No autoriza otros contactos.',
  "updatedAt",
  CURRENT_TIMESTAMP
FROM "Patient"
WHERE "followUpPreference" = 'no_contact';

CREATE OR REPLACE FUNCTION "prevent_patient_consent_mutation"()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'PatientConsent is append-only: % is not allowed', TG_OP
    USING ERRCODE = '55000';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "PatientConsent_prevent_update_delete"
BEFORE UPDATE OR DELETE ON "PatientConsent"
FOR EACH ROW EXECUTE FUNCTION "prevent_patient_consent_mutation"();
