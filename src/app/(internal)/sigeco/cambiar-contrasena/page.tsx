import { redirect } from "next/navigation";
import { KeyRound } from "lucide-react";
import { PasswordChangeForm } from "@/components/internal/PasswordChangeForm";
import { logoutInternalUser } from "@/features/internal-auth/actions";
import { requireInternalSession } from "@/modules/permissions";

type ForcedPasswordPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function ForcedPasswordPage({ searchParams }: ForcedPasswordPageProps) {
  const [session, query] = await Promise.all([requireInternalSession(), searchParams]);
  if (!session.user.mustChangePassword) redirect("/sigeco");

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-10 text-text">
      <section className="w-full max-w-md rounded-[9px] border border-border bg-surface p-6">
        <div className="mb-6 flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[9px] bg-surface-soft text-primary-dark">
            <KeyRound className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
              Protección de la cuenta
            </p>
            <h1 className="font-sora text-xl font-bold text-text">Cambia tu contraseña</h1>
            <p className="mt-1 text-sm text-muted">
              Debes completar este paso antes de entrar a SIGECO.
            </p>
          </div>
        </div>
        <PasswordChangeForm returnTo="forced" error={query.error} />
        <form action={logoutInternalUser} className="mt-4 border-t border-border pt-4 text-center">
          <button type="submit" className="text-sm font-semibold text-muted hover:text-text">
            Cerrar sesión
          </button>
        </form>
      </section>
    </main>
  );
}
