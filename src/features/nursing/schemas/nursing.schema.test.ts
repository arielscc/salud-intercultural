import { describe, expect, it } from "vitest";
import {
  createNursingApplicationSchema,
  createVitalSignsSchema
} from "@/features/nursing/schemas/nursing.schema";

describe("nursing schemas", () => {
  it("validates mobile vital signs input", () => {
    expect(
      createVitalSignsSchema.parse({
        patientId: "patient_1",
        visitId: "visit_1",
        temperatureCelsius: "36.7",
        systolicPressureMmHg: "110",
        diastolicPressureMmHg: "70",
        heartRateBpm: "80"
      })
    ).toMatchObject({
      temperatureCelsius: 36.7,
      systolicPressureMmHg: 110,
      diastolicPressureMmHg: 70,
      heartRateBpm: 80
    });
  });

  it("rechaza mediciones fuera del rango clínico", () => {
    const parsed = createVitalSignsSchema.safeParse({
      patientId: "patient_1",
      temperatureCelsius: "365",
      oxygenSaturation: "150"
    });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    const fields = parsed.error.issues.map((issue) => issue.path[0]);
    expect(fields).toContain("temperatureCelsius");
    expect(fields).toContain("oxygenSaturation");
  });

  it("rechaza una diastólica mayor o igual que la sistólica", () => {
    const parsed = createVitalSignsSchema.safeParse({
      patientId: "patient_1",
      systolicPressureMmHg: "80",
      diastolicPressureMmHg: "120"
    });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(parsed.error.issues[0]?.path).toEqual(["diastolicPressureMmHg"]);
  });

  it("acepta coma decimal y deja los campos vacíos sin valor", () => {
    expect(
      createVitalSignsSchema.parse({
        patientId: "patient_1",
        temperatureCelsius: "36,8",
        weightKg: ""
      })
    ).toMatchObject({ temperatureCelsius: 36.8, weightKg: undefined });
  });

  it("validates nursing application input", () => {
    expect(
      createNursingApplicationSchema.parse({
        patientId: "patient_1",
        visitId: "visit_1",
        workItemId: "task_1",
        clinicalOrderId: "order_1",
        medication: "Suero ABC",
        quantity: "500 ml",
        route: "IV"
      })
    ).toMatchObject({
      medication: "Suero ABC",
      quantity: "500 ml",
      route: "IV"
    });
  });
});
