"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { InternalRole } from "@/generated/prisma/client";
import type { ActiveModules } from "@/features/modules/activation";
import { canUse } from "@/features/modules/access";
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
  {
    label: "Control",
    hrefs: [
      "/sigeco/inventario",
      "/sigeco/compras",
      "/sigeco/atribucion",
      "/sigeco/sucursales",
      "/sigeco/auditoria",
      "/sigeco/usuarios"
    ]
  },
  { label: "Cuenta", hrefs: ["/sigeco/mi-cuenta"] }
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

export function DesktopSidebarNav({
  role,
  activeModules
}: {
  role: InternalRole;
  activeModules: ActiveModules;
}) {
  const permittedItems = sigecoNavItems.filter((item) =>
    canUse(role, activeModules, item.permission, item.module)
  );

  // Todo item permitido que no esté asignado a un grupo se muestra igual en una
  // sección "Más" (antes de "Cuenta"), para que el menú de escritorio nunca
  // oculte un módulo que el rol sí puede abrir.
  const groupedHrefs = new Set(navGroups.flatMap((group) => group.hrefs));
  const ungrouped = permittedItems.filter((item) => !groupedHrefs.has(item.href));
  const accountIndex = navGroups.findIndex((group) =>
    group.hrefs.includes("/sigeco/mi-cuenta")
  );
  const insertAt = accountIndex === -1 ? navGroups.length : accountIndex;
  const resolvedGroups =
    ungrouped.length === 0
      ? navGroups
      : [
          ...navGroups.slice(0, insertAt),
          { label: "Más", hrefs: ungrouped.map((item) => item.href) },
          ...navGroups.slice(insertAt)
        ];

  return (
    <nav className="hidden px-3 lg:block" aria-label="Módulos de Sigeco">
      {resolvedGroups.map((group, index) => {
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
