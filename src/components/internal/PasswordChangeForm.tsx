import { Field } from "@/components/internal/Field";
import { PasswordInput } from "@/components/internal/PasswordInput";
import { SubmitButton } from "@/components/internal/SubmitButton";
import { changeOwnInternalPasswordAction } from "@/features/internal-auth/user-management-actions";

export function PasswordChangeForm({
  returnTo,
  error
}: {
  returnTo: "forced" | "account";
  error?: string;
}) {
  const errorMessage =
    error === "current-password"
      ? "La contraseña actual no es correcta."
      : error === "same-password"
        ? "La contraseña nueva debe ser diferente de la actual."
        : error === "password-mismatch"
          ? "Las contraseñas no coinciden."
          : error === "weak-password"
            ? "La nueva contraseña debe tener al menos 6 caracteres con mayúsculas, minúsculas y números, y no puede ser común o fácil de adivinar."
            : error
              ? "Revisa los campos e inténtalo de nuevo."
              : null;

  return (
    <form action={changeOwnInternalPasswordAction} className="grid gap-4">
      <input type="hidden" name="returnTo" value={returnTo} />
      {errorMessage ? (
        <p className="rounded-[9px] bg-error/10 px-3.5 py-3 text-sm font-medium text-error">
          {errorMessage}
        </p>
      ) : null}
      <Field label="Contraseña actual">
        <PasswordInput name="currentPassword" autoComplete="current-password" required />
      </Field>
      <Field label="Nueva contraseña">
        <PasswordInput
          name="newPassword"
          autoComplete="new-password"
          minLength={6}
          maxLength={128}
          required
        />
      </Field>
      <Field label="Repite la nueva contraseña">
        <PasswordInput
          name="confirmPassword"
          autoComplete="new-password"
          minLength={6}
          maxLength={128}
          required
        />
      </Field>
      <p className="text-xs text-muted">
        Mínimo 6 caracteres con mayúsculas, minúsculas y números. Evita contraseñas comunes o
        con patrones fáciles y no reutilices la de WhatsApp, correo u otra cuenta.
      </p>
      <SubmitButton pendingLabel="Actualizando...">Cambiar contraseña</SubmitButton>
    </form>
  );
}

