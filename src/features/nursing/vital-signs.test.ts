import { describe, expect, it } from "vitest";
import {
  parseVitalSignValue,
  validateVitalSignValue,
  validateVitalSignsInput,
  vitalSignRangeHint
} from "@/features/nursing/vital-signs";

describe("rangos de signos vitales", () => {
  it("acepta un campo vacío porque el registro es parcial", () => {
    expect(validateVitalSignValue("temperatureCelsius", "")).toBeNull();
    expect(validateVitalSignValue("temperatureCelsius", undefined)).toBeNull();
    expect(validateVitalSignsInput({})).toEqual({});
  });

  it("acepta mediciones normales, con coma o punto decimal", () => {
    expect(validateVitalSignValue("temperatureCelsius", "36.5")).toBeNull();
    expect(validateVitalSignValue("temperatureCelsius", "36,5")).toBeNull();
    expect(validateVitalSignValue("weightKg", "70")).toBeNull();
    expect(parseVitalSignValue("36,5")).toBe(36.5);
  });

  it("rechaza valores exagerados y explica el rango", () => {
    expect(validateVitalSignValue("temperatureCelsius", "365")).toMatch(/entre 25 y 45 °C/);
    expect(validateVitalSignValue("oxygenSaturation", "150")).toMatch(/entre 50 y 100 %/);
    expect(validateVitalSignValue("heartRateBpm", "0")).toMatch(/entre 20 y 250 lpm/);
    expect(validateVitalSignValue("weightKg", "9999")).toMatch(/entre 0,5 y 400 kg/);
  });

  it("rechaza texto que no es número", () => {
    expect(validateVitalSignValue("heartRateBpm", "abc")).toMatch(/solo números/);
  });

  it("exige enteros donde la medición no lleva decimales", () => {
    expect(validateVitalSignValue("heartRateBpm", "72.5")).toMatch(/entero/);
    expect(validateVitalSignValue("temperatureCelsius", "36.55")).toMatch(/1 decimal/);
  });

  it("exige que la diastólica sea menor que la sistólica", () => {
    expect(
      validateVitalSignsInput({ systolicPressureMmHg: "120", diastolicPressureMmHg: "80" })
    ).toEqual({});
    expect(
      validateVitalSignsInput({ systolicPressureMmHg: "80", diastolicPressureMmHg: "120" })
        .diastolicPressureMmHg
    ).toMatch(/menor que la sistólica/);
    expect(
      validateVitalSignsInput({ systolicPressureMmHg: "120", diastolicPressureMmHg: "120" })
        .diastolicPressureMmHg
    ).toMatch(/menor que la sistólica/);
  });

  it("no compara presiones cuando una ya está fuera de rango", () => {
    const errors = validateVitalSignsInput({
      systolicPressureMmHg: "9000",
      diastolicPressureMmHg: "80"
    });
    expect(errors.systolicPressureMmHg).toMatch(/entre 50 y 300 mmHg/);
    expect(errors.diastolicPressureMmHg).toBeUndefined();
  });

  it("describe el rango para la ayuda del formulario", () => {
    expect(vitalSignRangeHint("respiratoryRateRpm")).toBe("Entre 5 y 80 rpm");
  });
});
