-- La finalidad `feedback` también contacta al paciente y, por tanto, debe
-- exigir al menos un canal cuando se autoriza. La migración que agregó el enum
-- no había ampliado este control de integridad.
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
      AND "purpose" = 'image_voice'
      AND cardinality("contactChannels") = 0
    )
    OR (
      "decision" IN ('denied', 'withdrawn')
      AND cardinality("contactChannels") = 0
    )
  );
