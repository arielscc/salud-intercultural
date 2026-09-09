import { describe, expect, it } from "vitest";
import {
  duplicateMatchSignals,
  normalizePatientName,
  normalizePatientDocument,
  normalizePatientPhone,
  patientPairKey
} from "@/features/patient-duplicates/normalize";

describe("patient duplicate normalization", () => {
  it("compares Bolivian phone formats using the last eight digits", () => {
    expect(normalizePatientPhone("+591 7654-3210")).toBe("76543210");
    expect(normalizePatientPhone("76543210")).toBe("76543210");
  });

  it("compares names without accents, punctuation or word order", () => {
    expect(normalizePatientName("María Pérez Quispe")).toBe(
      normalizePatientName("Quispe, Maria Perez")
    );
  });

  it("normalizes documents and treats an exact document as global identity evidence", () => {
    expect(normalizePatientDocument(" 12.345-6 lp ")).toBe("123456LP");
    expect(
      duplicateMatchSignals(
        { documentNumber: "123456 LP", fullName: "Persona Uno", phone: "70000001" },
        { documentNumber: "123456-LP", fullName: "Persona Dos", phone: "70000002" }
      )
    ).toMatchObject({ documentMatch: true, score: 100, isCandidate: true });
  });

  it("requires a phone match or the combination of name and birth date", () => {
    expect(
      duplicateMatchSignals(
        {
          fullName: "Ana Quispe",
          phone: "+591 70000001",
          birthDate: new Date("1980-05-02")
        },
        {
          fullName: "Otra Persona",
          phone: "70000001",
          birthDate: null
        }
      )
    ).toMatchObject({ phoneMatch: true, score: 70, isCandidate: true });

    expect(
      duplicateMatchSignals(
        {
          fullName: "Ana Quispe",
          phone: "70000001",
          birthDate: new Date("1980-05-02")
        },
        {
          fullName: "Quispe Ana",
          phone: "72222222",
          birthDate: new Date("1980-05-02")
        }
      )
    ).toMatchObject({
      phoneMatch: false,
      nameMatch: true,
      birthDateMatch: true,
      score: 50,
      isCandidate: true
    });
  });

  it("also compares a secondary phone with the other primary phone", () => {
    expect(
      duplicateMatchSignals(
        {
          fullName: "Persona uno",
          phone: "71111111",
          secondaryPhone: "+591 7654-3210"
        },
        {
          fullName: "Persona dos",
          phone: "76543210"
        }
      )
    ).toMatchObject({ phoneMatch: true, isCandidate: true });
  });

  it("creates the same pair key regardless of order", () => {
    expect(patientPairKey("b", "a")).toBe("a:b");
    expect(patientPairKey("a", "b")).toBe("a:b");
  });
});
