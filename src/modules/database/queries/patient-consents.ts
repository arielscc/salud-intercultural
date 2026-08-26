import type {
  PatientConsentCaptureMethod,
  PatientConsentDecision,
  PatientConsentPurpose,
  PatientContactChannel
} from "@/generated/prisma/client";
import {
  assertPatientConsentTextsEnabled,
  patientConsentTexts,
  PATIENT_CONSENT_TEXT_VERSION
} from "@/features/patient-consents/texts";
import { prisma, withDatabaseError } from "@/modules/database";

export async function appendPatientConsentRecord(input: {
  patientId: string;
  purpose: PatientConsentPurpose;
  decision: PatientConsentDecision;
  contactChannels: PatientContactChannel[];
  captureMethod: PatientConsentCaptureMethod;
  recordedById: string;
}) {
  assertPatientConsentTextsEnabled();

  return withDatabaseError("appendPatientConsentRecord", async () => {
    return prisma.$transaction(
      async (tx) => {
        const current = await tx.patientConsent.findFirst({
          where: {
            patientId: input.patientId,
            purpose: input.purpose
          },
          orderBy: [{ decidedAt: "desc" }, { createdAt: "desc" }]
        });

        if (input.decision === "withdrawn" && current?.decision !== "granted") {
          throw new Error("PATIENT_CONSENT_NOT_GRANTED");
        }

        return tx.patientConsent.create({
          data: {
            ...input,
            contactChannels:
              input.decision === "granted" ? input.contactChannels : [],
            textVersion: PATIENT_CONSENT_TEXT_VERSION,
            textSnapshot: patientConsentTexts[input.purpose],
            supersedesId: current?.id
          },
          include: { recordedBy: true }
        });
      },
      { isolationLevel: "Serializable" }
    );
  });
}
