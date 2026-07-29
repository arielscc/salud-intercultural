import type {
  PatientConsent,
  PatientConsentPurpose,
  PatientContactChannel
} from "@/generated/prisma/client";

type ConsentDecision = Pick<
  PatientConsent,
  "purpose" | "decision" | "contactChannels"
>;

export function currentConsentForPurpose(
  consents: ConsentDecision[],
  purpose: PatientConsentPurpose
) {
  return consents.find((consent) => consent.purpose === purpose);
}

export function hasCurrentConsent(
  consent: ConsentDecision | null | undefined,
  purpose: PatientConsentPurpose
) {
  return consent?.purpose === purpose && consent.decision === "granted";
}

export function canContactPatient(
  consent: ConsentDecision | null | undefined,
  purpose: PatientConsentPurpose,
  channel: PatientContactChannel
) {
  if (!hasCurrentConsent(consent, purpose)) return false;
  return consent?.contactChannels.includes(channel) ?? false;
}
