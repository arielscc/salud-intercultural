import Link from "next/link";
import { FileText } from "lucide-react";
import type { InternalUser } from "@/generated/prisma/client";
import { internalRoleLabels } from "@/features/internal-auth/permissions";
import type { ActiveModules } from "@/features/modules/activation";
import { canUse } from "@/features/modules/access";
import { formatLongDate } from "@/lib/dates";
import { DesktopPatientSearch } from "@/components/internal/DesktopPatientSearch";
import { DesktopSidebarNav } from "@/components/internal/DesktopSidebarNav";
import { MobileSidebar } from "@/components/internal/MobileSidebar";
import { LogoutForm } from "@/components/internal/LogoutForm";
import { BranchSelector } from "@/components/internal/BranchSelector";

function formatToday() {
  const formatted = formatLongDate(new Date());
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
    <Link
      href="/sigeco/mi-cuenta"
      className="focus-ring flex items-center gap-2.5 rounded-[7px]"
    >
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
    </Link>
  );
}

export function InternalShell({
  user,
  branchContext,
  activeModules,
  children
}: {
  user: InternalUser;
  activeModules: ActiveModules;
  branchContext: {
    activeBranch: { code: string; name: string };
    branches: Array<{
      code: string;
      name: string;
      status: "active" | "preparation" | "inactive";
      assigned: boolean;
    }>;
  };
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
          <DesktopSidebarNav role={user.role} activeModules={activeModules} />
        </div>
        <div className="mt-2 border-t border-border px-5 pt-3">
          <UserBadge user={user} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="print-hidden flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface px-4 sm:px-6">
          <MobileSidebar
            role={user.role}
            activeModules={activeModules}
            userSlot={<UserBadge user={user} />}
          />
          <p className="hidden font-sora text-sm font-bold text-text sm:block lg:hidden">Sigeco</p>
          <BranchSelector
            key={branchContext.activeBranch.code}
            activeCode={branchContext.activeBranch.code}
            branches={branchContext.branches}
          />
          {canUse(user.role, activeModules, "patients_read", "recepcion") ? (
            <DesktopPatientSearch />
          ) : null}
          <div className="ml-auto flex shrink-0 items-center gap-3">
            <p className="hidden text-xs text-muted md:block">{formatToday()}</p>
            <div className="hidden sm:block">
              <UserBadge user={user} />
            </div>
            <Link
              href="/sigeco/contingencia"
              title="Ficha de contingencia"
              className="focus-ring inline-flex h-11 w-11 items-center justify-center rounded-[9px] border border-border bg-surface text-muted transition hover:border-primary/40 hover:text-text"
            >
              <FileText className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Ficha de contingencia</span>
            </Link>
            <LogoutForm />
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden overflow-y-auto px-4 py-5 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
