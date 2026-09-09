import { Building2, LogOut } from "lucide-react";
import { requireBranchSelectionPageContext } from "@/features/branches/boundaries";
import { selectRequiredBranchAction } from "@/features/branches/actions";
import { branchDisplayName } from "@/features/branches/policy";
import { logoutInternalUser } from "@/features/internal-auth/actions";

export const dynamic = "force-dynamic";

export default async function RequiredBranchPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ user, selectableBranches }, query] = await Promise.all([
    requireBranchSelectionPageContext(),
    searchParams
  ]);

  return (
    <main className="flex min-h-[calc(100vh-5rem)] items-center justify-center bg-background px-4 py-10">
      <section className="w-full max-w-lg rounded-[14px] border border-border bg-surface p-6 shadow-sm sm:p-8">
        <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-[10px] bg-primary/10 text-primary-dark">
          <Building2 className="h-5 w-5" aria-hidden="true" />
        </div>
        <h1 className="font-sora text-xl font-bold text-text">Selecciona una sucursal</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          No existe una sucursal activa válida para esta sesión. El sistema no elegirá una
          sede automáticamente ni mostrará información operativa hasta que selecciones una.
        </p>

        {query.error ? (
          <p className="mt-4 rounded-[9px] bg-error/10 px-3 py-2 text-sm font-semibold text-error">
            La sucursal solicitada ya no está disponible para tu cuenta.
          </p>
        ) : null}

        {selectableBranches.length > 0 ? (
          <form action={selectRequiredBranchAction} className="mt-6 grid gap-4">
            <label className="grid gap-1.5 text-sm font-semibold text-text">
              Sucursal activa
              <select
                name="branchCode"
                required
                defaultValue=""
                className="focus-ring h-11 rounded-[9px] border border-border bg-surface px-3 text-sm font-medium text-text"
              >
                <option value="" disabled>
                  Elige una sucursal
                </option>
                {selectableBranches.map((branch) => (
                  <option key={branch.code} value={branch.code}>
                    {branchDisplayName(branch)}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="focus-ring min-h-11 rounded-[9px] bg-primary px-4 text-sm font-bold text-white"
            >
              Entrar a la sucursal
            </button>
          </form>
        ) : (
          <p className="mt-6 rounded-[9px] border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-text">
            {user.name ?? user.email} no tiene ninguna sucursal activa asignada. Solicita a
            Dirección que revise sus accesos.
          </p>
        )}

        <form action={logoutInternalUser} className="mt-5 border-t border-border pt-5">
          <button
            type="submit"
            className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-[8px] px-3 text-sm font-semibold text-muted hover:bg-surface-soft hover:text-text"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Cerrar sesión
          </button>
        </form>
      </section>
    </main>
  );
}
