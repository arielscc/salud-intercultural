import { Field, internalInputClassName } from "@/components/internal/Field";
import { PasswordInput } from "@/components/internal/PasswordInput";
import { SubmitButton } from "@/components/internal/SubmitButton";
import { buttonVariants } from "@/components/internal/ui/Button";
import { loginInternalUser } from "@/features/internal-auth/actions";
import { getLoginEmailHint } from "@/features/internal-auth/session";
import { cn } from "@/lib/cn";
import { createWhatsAppLink } from "@/lib/whatsapp";
import { LockKeyhole } from "lucide-react";

const supportWhatsappHref = createWhatsAppLink(
  "Hola, necesito ayuda con el acceso a Sigeco.",
  "+59177557034"
);

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function SigecoLoginPage({
  searchParams,
}: LoginPageProps) {
  // El correo del intento anterior llega por cookie corta, nunca por la URL.
  const [params, emailHint] = await Promise.all([searchParams, getLoginEmailHint()]);
  const errorMessage =
    params.error === "locked"
      ? "La cuenta está bloqueada temporalmente. Intenta nuevamente más tarde."
      : params.error
        ? "Credenciales inválidas. Revisa el email y la contraseña."
        : null;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-10 text-text">
      <section className="w-full max-w-sm rounded-[9px] border border-border bg-surface p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[9px] bg-surface-soft text-primary-dark">
            <LockKeyhole className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
              Sigeco · Salud Intercultural
            </p>
            <h1 className="font-sora text-xl font-bold tracking-tight text-text">
              Ingreso interno
            </h1>
          </div>
        </div>

        {errorMessage ? (
          <p className="mb-4 flex items-start gap-2 rounded-[9px] bg-error/10 px-3.5 py-3 text-sm font-medium text-error">
            <span
              className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-current"
              aria-hidden="true"
            />
            {errorMessage}
          </p>
        ) : null}

        <form
          action={loginInternalUser}
          className="grid gap-4"
          autoComplete="off"
          data-lpignore="true"
          data-1p-ignore=""
          data-bwignore="true"
          data-form-type="other"
        >
          <Field label="Email">
            <input
              className={internalInputClassName}
              type="email"
              name="email"
              defaultValue={emailHint}
              autoComplete="off"
              data-lpignore="true"
              data-1p-ignore=""
              data-bwignore="true"
              data-form-type="other"
              required
            />
          </Field>
          <Field label="Contraseña">
            <PasswordInput required />
          </Field>
          <SubmitButton className="mt-1" pendingLabel="Ingresando...">
            Entrar
          </SubmitButton>
        </form>

        <div className="mt-6 grid gap-2 border-t border-border pt-4 text-center">
          <p className="text-[11px] text-muted">
            Acceso exclusivo para el personal de la clínica.
          </p>
          <hr className="mx-auto w-full border-t border-border" />
          <div className="flex-row flex-wrap items-center justify-center gap-2 text-center sm:flex">
            <p className="text-[11px] text-muted">¿Problemas para entrar?</p>
            <a
              href={supportWhatsappHref}
              target="_blank"
              rel="noreferrer"
              className={cn(
                buttonVariants({ variant: "link", size: "sm" }),
                "justify-self-center",
              )}
            >
              Contactar soporte
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
