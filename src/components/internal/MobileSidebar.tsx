"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import type { InternalRole } from "@/generated/prisma/client";
import { SidebarNav } from "@/components/internal/SidebarNav";

export function MobileSidebar({
  role,
  userSlot
}: {
  role: InternalRole;
  userSlot: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir navegación"
        aria-expanded={open}
        className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-[9px] border border-border bg-surface text-muted transition hover:text-text"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex">
          <button
            type="button"
            aria-label="Cerrar navegación"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-text/30"
          />
          <div className="relative flex h-full w-[264px] flex-col border-r border-border bg-surface pb-4 pt-5">
            <div className="mb-4 flex items-start justify-between px-5">
              <div>
                <p className="font-sora text-base font-bold leading-tight text-text">Sigeco</p>
                <p className="text-[11px] text-muted">Salud Intercultural</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar navegación"
                className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-[7px] text-muted transition hover:bg-surface-soft hover:text-text"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <SidebarNav role={role} onNavigate={() => setOpen(false)} />
            </div>
            <div className="mt-2 border-t border-border px-5 pt-3">{userSlot}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
