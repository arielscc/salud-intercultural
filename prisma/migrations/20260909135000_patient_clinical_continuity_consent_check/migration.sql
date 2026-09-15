-- El consentimiento corporativo de continuidad clinica no es una autorizacion
-- de contacto comercial y, por tanto, no exige WhatsApp ni llamada. Se instala
-- en una migracion posterior al alta del valor enum para que PostgreSQL pueda
-- utilizar el nuevo valor de forma segura.
ALTER TABLE "PatientConsent"
  DROP CONSTRAINT "PatientConsent_contact_channels_check";

ALTER TABLE "PatientConsent"
  ADD CONSTRAINT "PatientConsent_contact_channels_check" CHECK (
    (
      "decision" = 'granted'
      AND "purpose" IN (
        'follow_up',
        'reminders',
        'education',
        'promotions',
        'feedback'
      )
      AND cardinality("contactChannels") > 0
    )
    OR (
      "decision" = 'granted'
      AND "purpose" IN ('image_voice', 'clinical_continuity')
      AND cardinality("contactChannels") = 0
    )
    OR (
      "decision" IN ('denied', 'withdrawn')
      AND cardinality("contactChannels") = 0
    )
  );
