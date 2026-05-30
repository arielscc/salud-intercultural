import { LockKeyhole } from "lucide-react";
import { loginInternalUser } from "@/features/internal-auth/actions";

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function SigecoLoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const errorMessage =
    params.error === "locked"
      ? "La cuenta está bloqueada temporalmente. Intenta nuevamente más tarde."
      : params.error
        ? "Credenciales inválidas. Revisa el email y la contraseña."
        : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f8f9] px-4 py-10 text-text">
      <section className="w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-soft sm:p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary-dark">
            <LockKeyhole className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-normal text-muted">Sigeco</p>
            <h1 className="font-sora text-2xl font-bold">Ingreso interno</h1>
          </div>
        </div>

        {errorMessage ? (
          <p className="mb-4 rounded-xl border border-error/25 bg-error/10 px-4 py-3 text-sm font-semibold text-error">
            {errorMessage}
          </p>
        ) : null}

        <form action={loginInternalUser} className="grid gap-4">
          <label className="grid gap-2 text-sm font-semibold">
            Email
            <input
              className="min-h-12 rounded-xl border border-border bg-surface px-4 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
              type="email"
              name="email"
              autoComplete="email"
              required
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Contraseña
            <input
              className="min-h-12 rounded-xl border border-border bg-surface px-4 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
              type="password"
              name="password"
              autoComplete="current-password"
              required
            />
          </label>
          <button
            type="submit"
            className="focus-ring mt-2 min-h-12 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white shadow-soft transition hover:bg-primary-dark"
          >
            Entrar
          </button>
        </form>
      </section>
    </main>
  );
}
