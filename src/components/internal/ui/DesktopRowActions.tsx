"use client";

import { Ellipsis } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function DesktopRowActions({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="hidden lg:block">
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            title={label}
            aria-label={label}
            className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-[7px] text-muted transition hover:bg-surface-soft hover:text-text"
          >
            <Ellipsis className="h-4 w-4" aria-hidden="true" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" sideOffset={4} className="w-44 gap-1 p-1.5 shadow-none">
          {children}
        </PopoverContent>
      </Popover>
    </div>
  );
}

