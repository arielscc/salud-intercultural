import Link from "next/link";
import { LogOut } from "lucide-react";
import type { InternalUser } from "@/generated/prisma/client";
import { logoutInternalUser } from "@/features/internal-auth/actions";
import { internalRoleLabels } from "@/features/internal-auth/permissions";
import { MobileSidebar } from "@/components/internal/MobileSidebar";
import { SidebarNav } from "@/components/internal/SidebarNav";

function formatToday() {
  const formatted = new Intl.DateTimeFormat("es-BO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date());

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function UserBadge({ user }: { user: InternalUser }) {
  const displayName = user.name ?? user.email;
  const initials = displayName
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex items-center gap-2.5">
      <span
        aria-hidden="true"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-soft text-[11px] font-bold text-primary-dark"
      >
        {initials}
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block truncate text-xs font-semibold text-text">{displayName}</span>
        <span className="block text-[11px] text-muted">{internalRoleLabels[user.role]}</span>
      </span>
    </div>
  );
}

export function InternalShell({
  user,
  children
}: {
  user: InternalUser;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-dvh overflow-hidden bg-background text-text">
      <aside className="hidden w-[220px] shrink-0 flex-col border-r border-border bg-surface pb-4 pt-5 lg:flex">
        <Link href="/sigeco" className="focus-ring mx-3 mb-4 rounded-[7px] px-2.5">
          <p className="font-sora text-base font-bold leading-tight text-text">Sigeco</p>
          <p className="text-[11px] text-muted">Salud Intercultural</p>
        </Link>
        <div className="flex-1 overflow-y-auto">
          <SidebarNav role={user.role} />
        </div>
        <div className="mt-2 border-t border-border px-5 pt-3">
          <UserBadge user={user} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface px-4 sm:px-6">
          <MobileSidebar role={user.role} userSlot={<UserBadge user={user} />} />
          <p className="font-sora text-sm font-bold text-text lg:hidden">Sigeco</p>
          <div className="ml-auto flex items-center gap-3">
            <p className="hidden text-xs text-muted md:block">{formatToday()}</p>
            <div className="hidden sm:block">
              <UserBadge user={user} />
            </div>
            <form action={logoutInternalUser}>
              <button
                type="submit"
                title="Cerrar sesión"
                className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-[9px] border border-border bg-surface text-muted transition hover:border-primary/40 hover:text-text"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
              </button>
            </form>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden overflow-y-auto px-4 py-5 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
