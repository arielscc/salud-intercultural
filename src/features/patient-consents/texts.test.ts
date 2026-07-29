import { describe, expect, it } from "vitest";
import {
  assertPatientConsentTextsEnabled,
  PATIENT_CONSENT_TEXT_VERSION,
  patientConsentTexts
} from "@/features/patient-consents/texts";

describe("patient consent text approval gate", () => {
  it("keeps the five approved development texts versioned", () => {
    expect(Object.keys(patientConsentTexts)).toHaveLength(5);
    expect(PATIENT_CONSENT_TEXT_VERSION).toBe("v1");
  });

  it("allows local and staging without authorizing production", () => {
    expect(() =>
      assertPatientConsentTextsEnabled({
        APP_ENV: "local",
        NEXT_PUBLIC_APP_ENV: "local"
      })
    ).not.toThrow();
    expect(() =>
      assertPatientConsentTextsEnabled({
        APP_ENV: "staging",
        NEXT_PUBLIC_APP_ENV: "staging"
      })
    ).not.toThrow();
  });

  it("blocks production until Dirección explicitly approves version v1", () => {
    const production = {
      APP_ENV: "production",
      NEXT_PUBLIC_APP_ENV: "production"
    };

    expect(() => assertPatientConsentTextsEnabled(production)).toThrow(
      /todavía no están autorizados para producción/
    );
    expect(() =>
      assertPatientConsentTextsEnabled({
        ...production,
        PATIENT_CONSENT_PRODUCTION_TEXT_VERSION: "v1"
      })
    ).not.toThrow();
  });
});
