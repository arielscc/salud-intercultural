import Link from "next/link";
import { ClipboardList, Home, LogOut, UserRoundSearch } from "lucide-react";
import type { InternalUser } from "@/generated/prisma/client";
import { logoutInternalUser } from "@/features/internal-auth/actions";
import { internalRoleLabels } from "@/features/internal-auth/permissions";
import { cn } from "@/lib/cn";

const navItems = [
  { href: "/sigeco", label: "Inicio", icon: Home },
  { href: "/sigeco/leads", label: "Leads", icon: UserRoundSearch },
  { href: "/sigeco/leads/nuevo", label: "Nuevo", icon: ClipboardList }
];

export function InternalShell({
  user,
  children
}: {
  user: InternalUser;
  children: React.ReactNode;
}) {
  return (
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col bg-[#f5f8f9] text-text">
        <header className="sticky top-0 z-30 border-b border-border bg-surface/95 px-4 py-3 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <Link href="/sigeco" className="focus-ring rounded-xl">
              <p className="text-xs font-semibold uppercase tracking-normal text-muted">Sigeco</p>
              <h1 className="font-sora text-lg font-bold leading-tight text-text">Salud Intercultural</h1>
            </Link>
            <div className="flex items-center gap-2">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold">{user.name ?? user.email}</p>
                <p className="text-xs text-muted">{internalRoleLabels[user.role]}</p>
              </div>
              <form action={logoutInternalUser}>
                <button
                  type="submit"
                  className="focus-ring inline-flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface text-muted transition hover:border-primary/40 hover:text-text"
                  title="Cerrar sesión"
                >
                  <LogOut className="h-5 w-5" aria-hidden="true" />
                </button>
              </form>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-5 pb-24 sm:px-6 sm:pb-8">{children}</main>

        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 px-3 pb-[calc(0.65rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur sm:hidden">
          <div className="mx-auto grid max-w-md grid-cols-3 gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "focus-ring flex min-h-14 flex-col items-center justify-center rounded-2xl px-2 text-xs font-semibold text-muted transition hover:bg-surface-soft hover:text-text"
                  )}
                >
                  <Icon className="mb-1 h-5 w-5" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
  );
}
