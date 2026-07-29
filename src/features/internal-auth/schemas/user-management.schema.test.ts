import { describe, expect, it } from "vitest";
import {
  changeInternalPasswordSchema,
  createInternalUserSchema
} from "@/features/internal-auth/schemas/user-management.schema";

describe("internal user management schemas", () => {
  it("accepts active roles and rejects the deprecated captacion role", () => {
    expect(
      createInternalUserSchema.safeParse({
        name: "Usuario QA",
        email: "usuario@example.com",
        role: "seguimiento",
        temporaryPassword: "clave-temporal-segura"
      }).success
    ).toBe(true);
    expect(
      createInternalUserSchema.safeParse({
        name: "Usuario Antiguo",
        email: "antiguo@example.com",
        role: "captacion",
        temporaryPassword: "clave-temporal-segura"
      }).success
    ).toBe(false);
  });

  it("requires a long temporary password", () => {
    expect(
      createInternalUserSchema.safeParse({
        name: "Usuario QA",
        email: "usuario@example.com",
        role: "medico",
        temporaryPassword: "corta"
      }).success
    ).toBe(false);
  });

  it("requires matching new passwords", () => {
    expect(
      changeInternalPasswordSchema.safeParse({
        currentPassword: "clave-anterior",
        newPassword: "nueva-clave-segura",
        confirmPassword: "otra-clave-segura",
        returnTo: "account"
      }).success
    ).toBe(false);
  });
});

