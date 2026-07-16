"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { InternalRole } from "@/generated/prisma/client";
import { roleHasPermission } from "@/features/internal-auth/permissions";
import { sigecoNavItems, type SigecoNavItem } from "@/components/internal/nav-items";
import { cn } from "@/lib/cn";

const navGroups: Array<{ label?: string; hrefs: string[] }> = [
  { hrefs: ["/sigeco"] },
  {
    label: "Atención",
    hrefs: ["/sigeco/recepcion", "/sigeco/consultas", "/sigeco/enfermeria"]
  },
  {
    label: "Operación",
    hrefs: ["/sigeco/administracion", "/sigeco/seguimientos"]
  },
  { label: "Control", hrefs: ["/sigeco/inventario"] }
];

function DesktopNavLink({ item }: { item: SigecoNavItem }) {
  const pathname = usePathname();
  const Icon = item.icon;
  const isActive = item.href === "/sigeco" ? pathname === "/sigeco" : pathname.startsWith(item.href);

  return (
    <Link
      href={item.href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "focus-ring flex items-center gap-2.5 rounded-[7px] px-2.5 py-2 text-[13px] font-medium text-muted transition hover:bg-surface-soft/60 hover:text-text",
        isActive && "bg-surface-soft font-semibold text-primary-dark hover:bg-surface-soft"
      )}
    >
      <Icon
        className={cn("h-4 w-4 shrink-0", isActive ? "text-primary-dark" : "text-muted/80")}
        aria-hidden="true"
      />
      {item.label}
    </Link>
  );
}

export function DesktopSidebarNav({ role }: { role: InternalRole }) {
  const permittedItems = sigecoNavItems.filter((item) =>
    roleHasPermission(role, item.permission)
  );

  return (
    <nav className="hidden px-3 lg:block" aria-label="Módulos de Sigeco">
      {navGroups.map((group, index) => {
        const items = group.hrefs
          .map((href) => permittedItems.find((item) => item.href === href))
          .filter((item): item is SigecoNavItem => Boolean(item));

        if (items.length === 0) return null;

        return (
          <section
            key={group.label ?? "principal"}
            className={cn(index > 0 && "mt-4 border-t border-border pt-3")}
            aria-label={group.label}
          >
            {group.label ? (
              <p className="mb-1 px-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted/80">
                {group.label}
              </p>
            ) : null}
            <div className="flex flex-col gap-0.5">
              {items.map((item) => (
                <DesktopNavLink key={item.href} item={item} />
              ))}
            </div>
          </section>
        );
      })}
    </nav>
  );
}

