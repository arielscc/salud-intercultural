import { z } from "zod";
import {
  PatientConsentCaptureMethod,
  PatientConsentDecision,
  PatientConsentPurpose,
  PatientContactChannel
} from "@/generated/prisma/client";
import {
  isContactConsentPurpose,
  PATIENT_CONSENT_TEXT_VERSION
} from "@/features/patient-consents/texts";

export const recordPatientConsentSchema = z
  .object({
    patientId: z.string().min(1),
    purpose: z.nativeEnum(PatientConsentPurpose),
    decision: z.nativeEnum(PatientConsentDecision),
    captureMethod: z.nativeEnum(PatientConsentCaptureMethod),
    textVersion: z.literal(PATIENT_CONSENT_TEXT_VERSION),
    contactChannels: z
      .array(z.nativeEnum(PatientContactChannel))
      .default([])
  })
  .superRefine((value, context) => {
    const uniqueChannels = new Set(value.contactChannels);

    if (uniqueChannels.size !== value.contactChannels.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "No se puede repetir el canal de contacto.",
        path: ["contactChannels"]
      });
    }

    const needsChannels =
      value.decision === "granted" && isContactConsentPurpose(value.purpose);
    const mustNotHaveChannels =
      value.decision !== "granted" || !isContactConsentPurpose(value.purpose);

    if (needsChannels && value.contactChannels.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Selecciona al menos un canal autorizado.",
        path: ["contactChannels"]
      });
    }

    if (mustNotHaveChannels && value.contactChannels.length > 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Esta decisión no debe incluir canales de contacto.",
        path: ["contactChannels"]
      });
    }
  });
