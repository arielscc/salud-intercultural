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
