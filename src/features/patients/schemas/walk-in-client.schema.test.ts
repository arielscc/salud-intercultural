import { describe, expect, it } from "vitest";
import {
  sanitizeWalkInClientInput,
  walkInClientSchema
} from "@/features/patients/schemas/walk-in-client.schema";

describe("walkInClientSchema", () => {
  it("acepta lo mínimo: nombre y teléfono", () => {
    const result = walkInClientSchema.safeParse({
      fullName: "Juana Mamani",
      phone: "70000000"
    });

    expect(result.success).toBe(true);
    expect(result.success && result.data.confirmDuplicate).toBe(false);
  });

  it("exige el nombre y el teléfono", () => {
    expect(walkInClientSchema.safeParse({ fullName: "J", phone: "70000000" }).success).toBe(
      false
    );
    expect(walkInClientSchema.safeParse({ fullName: "Juana Mamani", phone: "" }).success).toBe(
      false
    );
  });

  it("rechaza un teléfono con letras", () => {
    const result = walkInClientSchema.safeParse({
      fullName: "Juana Mamani",
      phone: "no tengo"
    });

    expect(result.success).toBe(false);
  });

  it("acepta los campos opcionales vacíos", () => {
    const result = walkInClientSchema.safeParse({
      fullName: "Juana Mamani",
      phone: "70000000",
      secondaryPhone: "",
      generalObservations: ""
    });

    expect(result.success).toBe(true);
    expect(result.success && result.data.secondaryPhone).toBeUndefined();
  });

  it("reconoce la confirmación del segundo intento", () => {
    const result = walkInClientSchema.safeParse({
      fullName: "Juana Mamani",
      phone: "70000000",
      confirmDuplicate: "true"
    });

    expect(result.success && result.data.confirmDuplicate).toBe(true);
  });

  it("normaliza espacios repetidos", () => {
    const parsed = walkInClientSchema.parse({
      fullName: "  Juana   Mamani  ",
      phone: " 700 00 000 ",
      generalObservations: "  Paga  en  efectivo  "
    });

    expect(sanitizeWalkInClientInput(parsed)).toMatchObject({
      fullName: "Juana Mamani",
      phone: "700 00 000",
      generalObservations: "Paga en efectivo"
    });
  });
});
