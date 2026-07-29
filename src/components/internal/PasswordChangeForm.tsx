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
        : error
          ? "Revisa los campos. La nueva contraseña debe tener al menos 12 caracteres."
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
          minLength={12}
          maxLength={128}
          required
        />
      </Field>
      <Field label="Repite la nueva contraseña">
        <PasswordInput
          name="confirmPassword"
          autoComplete="new-password"
          minLength={12}
          maxLength={128}
          required
        />
      </Field>
      <p className="text-xs text-muted">
        Usa al menos 12 caracteres. No reutilices una contraseña de WhatsApp, correo u otra cuenta.
      </p>
      <SubmitButton pendingLabel="Actualizando...">Cambiar contraseña</SubmitButton>
    </form>
  );
}

