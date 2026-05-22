import { describe, expect, it } from "vitest";
import { createLeadSchema, sanitizeLeadInput } from "@/features/leads/schemas/lead.schema";
import { validLeadInput } from "../../../../tests/fixtures/leads";

describe("createLeadSchema", () => {
  it("accepts a valid website lead and applies defaults", () => {
    const parsed = createLeadSchema.parse({
      name: "Paciente Test",
      phone: "+591 70000000"
    });

    expect(parsed).toMatchObject({
      name: "Paciente Test",
      phone: "+591 70000000",
      source: "website",
      status: "new"
    });
  });

  it("rejects invalid phone numbers and honeypot submissions", () => {
    const parsed = createLeadSchema.safeParse({
      ...validLeadInput,
      phone: "no es telefono",
      website: "spam"
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      expect(errors.phone).toBeDefined();
      expect(errors.website).toBeDefined();
    }
  });

  it("normalizes optional empty fields before validation", () => {
    const parsed = createLeadSchema.parse({
      ...validLeadInput,
      email: "",
      pagePath: ""
    });

    expect(parsed.email).toBeUndefined();
    expect(parsed.pagePath).toBeUndefined();
  });
});

describe("sanitizeLeadInput", () => {
  it("collapses whitespace and lowercases email", () => {
    const sanitized = sanitizeLeadInput({
      ...validLeadInput,
      name: "  Paciente   Test  ",
      email: "  PACIENTE@EXAMPLE.COM  ",
      message: "  Quiero    agendar   una valoración.  "
    });

    expect(sanitized).toMatchObject({
      name: "Paciente Test",
      email: "paciente@example.com",
      message: "Quiero agendar una valoración."
    });
    expect(sanitized).not.toHaveProperty("website");
  });
});
