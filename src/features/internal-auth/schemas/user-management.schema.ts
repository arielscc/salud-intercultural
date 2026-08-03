import { z } from "zod";
import {
  MAX_PASSWORD_LENGTH,
  checkPasswordPolicy
} from "@/features/internal-auth/password-policy";

export const activeInternalRoleSchema = z.enum([
  "super_admin",
  "direccion",
  "medico",
  "recepcion",
  "administracion",
  "enfermeria",
  "seguimiento"
]);

const nameSchema = z
  .string()
  .trim()
  .min(2, "El nombre debe tener al menos 2 caracteres.")
  .max(100, "El nombre es demasiado largo.");

const passwordSchema = z
  .string()
  .max(MAX_PASSWORD_LENGTH, "La contraseña es demasiado larga.")
  .superRefine((value, ctx) => {
    const result = checkPasswordPolicy(value);
    if (!result.ok) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: result.message });
    }
  });

export const createInternalUserSchema = z.object({
  name: nameSchema,
  email: z.string().trim().toLowerCase().email().max(200),
  role: activeInternalRoleSchema,
  temporaryPassword: passwordSchema
});

export const updateInternalUserProfileSchema = z.object({
  userId: z.string().min(1),
  name: nameSchema
});

export const updateInternalUserAccessSchema = z.object({
  userId: z.string().min(1),
  role: activeInternalRoleSchema,
  active: z.enum(["true", "false"]).transform((value) => value === "true")
});

export const internalUserTargetSchema = z.object({
  userId: z.string().min(1)
});

export const internalSessionTargetSchema = z.object({
  sessionId: z.string().min(1)
});

export const changeInternalPasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(128),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1).max(128),
    returnTo: z.enum(["forced", "account"]).default("account")
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Las contraseñas no coinciden."
  });

