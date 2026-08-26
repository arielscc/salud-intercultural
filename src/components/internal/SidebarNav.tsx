"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { InternalRole } from "@/generated/prisma/client";
import { canUse, type ModuleAccessState } from "@/features/modules/access";
import { sigecoNavItems } from "@/components/internal/nav-items";
import { cn } from "@/lib/cn";

export function SidebarNav({
  role,
  moduleAccess,
  onNavigate
}: {
  role: InternalRole;
  moduleAccess: ModuleAccessState;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const items = sigecoNavItems.filter((item) =>
    canUse(role, moduleAccess, item.permission, item.module)
  );

  return (
    <nav className="flex flex-col gap-0.5 px-3" aria-label="Módulos de Sigeco">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive =
          item.href === "/sigeco" ? pathname === "/sigeco" : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "focus-ring flex min-h-11 items-center gap-2.5 rounded-[7px] px-2.5 py-2 text-[13px] font-medium text-muted transition hover:bg-surface-soft/60 hover:text-text",
              isActive && "bg-surface-soft font-semibold text-primary-dark hover:bg-surface-soft"
            )}
          >
            <Icon
              className={cn("h-4 w-4 shrink-0", isActive ? "text-primary-dark" : "text-muted/80")}
              aria-hidden="true"
            />
            {item.label}
            {moduleAccess.suspended.includes(item.module) ? (
              <span className="ml-auto rounded-full bg-warning/15 px-1.5 py-0.5 text-[10px] font-semibold text-warning">
                Suspendido
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
