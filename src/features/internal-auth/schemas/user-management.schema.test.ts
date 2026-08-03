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
        temporaryPassword: "Kp7mVw3q"
      }).success
    ).toBe(true);
    expect(
      createInternalUserSchema.safeParse({
        name: "Usuario Antiguo",
        email: "antiguo@example.com",
        role: "captacion",
        temporaryPassword: "Kp7mVw3q"
      }).success
    ).toBe(false);
  });

  it("rejects passwords shorter than six characters", () => {
    expect(
      createInternalUserSchema.safeParse({
        name: "Usuario QA",
        email: "usuario@example.com",
        role: "medico",
        temporaryPassword: "Ab1cd"
      }).success
    ).toBe(false);
  });

  it("requires upper, lower and digits", () => {
    expect(
      createInternalUserSchema.safeParse({
        name: "Usuario QA",
        email: "usuario@example.com",
        role: "medico",
        temporaryPassword: "todominuscula1"
      }).success
    ).toBe(false);
  });

  it("rejects common or easily guessed passwords", () => {
    expect(
      createInternalUserSchema.safeParse({
        name: "Usuario QA",
        email: "usuario@example.com",
        role: "medico",
        temporaryPassword: "Password1"
      }).success
    ).toBe(false);
  });

  it("requires matching new passwords", () => {
    expect(
      changeInternalPasswordSchema.safeParse({
        currentPassword: "clave-anterior",
        newPassword: "Kp7mVw3q",
        confirmPassword: "Zt4nBx9r",
        returnTo: "account"
      }).success
    ).toBe(false);
  });

  it("accepts a strong matching new password", () => {
    expect(
      changeInternalPasswordSchema.safeParse({
        currentPassword: "clave-anterior",
        newPassword: "Kp7mVw3q",
        confirmPassword: "Kp7mVw3q",
        returnTo: "account"
      }).success
    ).toBe(true);
  });
});

