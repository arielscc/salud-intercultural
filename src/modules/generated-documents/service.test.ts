import { describe, expect, it } from "vitest";
import { sourceFingerprint } from "@/modules/generated-documents/service";

describe("generated document source fingerprints", () => {
  it("is stable when object key order changes", () => {
    expect(
      sourceFingerprint({
        patient: { name: "Paciente", code: "P-1" },
        total: 1000
      })
    ).toBe(
      sourceFingerprint({
        total: 1000,
        patient: { code: "P-1", name: "Paciente" }
      })
    );
  });

  it("changes when a source total or instruction changes", () => {
    expect(sourceFingerprint({ total: 1000 })).not.toBe(
      sourceFingerprint({ total: 900 })
    );
    expect(sourceFingerprint({ dose: "1 vez" })).not.toBe(
      sourceFingerprint({ dose: "2 veces" })
    );
  });
});

