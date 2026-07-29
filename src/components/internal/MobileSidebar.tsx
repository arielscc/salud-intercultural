"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import type { InternalRole } from "@/generated/prisma/client";
import { SidebarNav } from "@/components/internal/SidebarNav";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger
} from "@/components/ui/drawer";

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
      <Drawer open={open} onOpenChange={setOpen} direction="left">
        <DrawerTrigger asChild>
          <button
            type="button"
            aria-label="Abrir navegación"
            className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-[9px] border border-border bg-surface text-muted transition hover:text-text"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
        </DrawerTrigger>
        <DrawerContent className="pb-4 data-[vaul-drawer-direction=left]:w-[264px]">
          <DrawerHeader className="flex-row items-start justify-between gap-0 px-5 pb-4 pt-5">
            <div>
              <DrawerTitle className="font-sora text-base font-bold leading-tight text-text">
                Sigeco
              </DrawerTitle>
              <DrawerDescription className="text-[11px] text-muted">
                Salud Intercultural
              </DrawerDescription>
            </div>
            <DrawerClose asChild>
              <button
                type="button"
                aria-label="Cerrar navegación"
                className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-[7px] text-muted transition hover:bg-surface-soft hover:text-text"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </DrawerClose>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto">
            <SidebarNav role={role} onNavigate={() => setOpen(false)} />
          </div>
          <div className="mt-2 border-t border-border px-5 pt-3">
            <DrawerClose asChild>{userSlot}</DrawerClose>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
