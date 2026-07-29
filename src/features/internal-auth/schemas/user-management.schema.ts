import { z } from "zod";

export const activeInternalRoleSchema = z.enum([
  "super_admin",
  "direccion",
  "medico",
  "recepcion",
  "administracion",
  "enfermeria",
  "seguimiento"
]);

const passwordSchema = z
  .string()
  .min(12, "La contraseña debe tener al menos 12 caracteres.")
  .max(128, "La contraseña es demasiado larga.");

export const createInternalUserSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email().max(200),
  role: activeInternalRoleSchema,
  temporaryPassword: passwordSchema
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

