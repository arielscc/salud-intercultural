import { describe, expect, it } from "vitest";
import {
  createInternalLeadSchema,
  sanitizeInternalLeadInput,
  updateInternalLeadStatusSchema
} from "@/features/crm/schemas/lead-v3.schema";

describe("internal lead schemas", () => {
  it("validates and sanitizes a new internal lead", () => {
    const parsed = createInternalLeadSchema.parse({
      name: "  Paciente   Test  ",
      phone: "+591 70000000",
      email: "PACIENTE@EXAMPLE.COM",
      city: " El Alto ",
      source: "whatsapp",
      symptoms: "Dolor general",
      intentionToVisit: "Quiere venir esta semana"
    });

    expect(sanitizeInternalLeadInput(parsed)).toMatchObject({
      name: "Paciente Test",
      phone: "+591 70000000",
      email: "paciente@example.com",
      city: "El Alto",
      source: "whatsapp"
    });
  });

  it("rejects invalid phone numbers and unknown statuses", () => {
    expect(() =>
      createInternalLeadSchema.parse({
        phone: "abc",
        source: "whatsapp"
      })
    ).toThrow();

    expect(() =>
      updateInternalLeadStatusSchema.parse({
        leadId: "lead_1",
        status: "scheduled"
      })
    ).toThrow();
  });
});
