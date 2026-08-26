import { describe, expect, it } from "vitest";
import {
  createVisitSchema,
  updateVisitStatusSchema,
  visitFlowSchema
} from "@/features/visits/schemas/visit.schema";

describe("visit schemas", () => {
  it("validates visit creation and route updates", () => {
    expect(
      createVisitSchema.parse({
        patientId: "patient_1",
        reason: "Consulta inicial"
      })
    ).toMatchObject({
      patientId: "patient_1",
      reason: "Consulta inicial"
    });

    expect(
      updateVisitStatusSchema.parse({
        visitId: "visit_1",
        status: "in_consultation",
        area: "medico",
        note: "Derivado a consulta"
      })
    ).toMatchObject({
      visitId: "visit_1",
      status: "in_consultation",
      area: "medico"
    });
  });

  it("rejects unknown visit statuses", () => {
    expect(() =>
      updateVisitStatusSchema.parse({
        visitId: "visit_1",
        status: "scheduled",
        area: "medico"
      })
    ).toThrow();
  });

  it("accepts the direct transition to consultation", () => {
    expect(
      visitFlowSchema.parse({ visitId: "visit_1", flow: "to_consultation" })
    ).toMatchObject({ visitId: "visit_1", flow: "to_consultation" });
    expect(
      visitFlowSchema.parse({ visitId: "visit_1", flow: "to_reception" })
    ).toMatchObject({ visitId: "visit_1", flow: "to_reception" });
  });

  it("requires the detailed discontinuation action for abandonment", () => {
    expect(
      visitFlowSchema.safeParse({ visitId: "visit_1", flow: "left" }).success
    ).toBe(false);
    expect(
      updateVisitStatusSchema.safeParse({
        visitId: "visit_1",
        status: "left_without_care",
        area: "recepcion"
      }).success
    ).toBe(false);
  });
});
