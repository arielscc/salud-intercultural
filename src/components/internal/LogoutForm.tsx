"use client";

import { LogOut } from "lucide-react";
import { logoutInternalUser } from "@/features/internal-auth/actions";
import { clearSigecoBrowserStorage } from "@/features/mobile-resilience/storage";
import { cn } from "@/lib/cn";

export function LogoutForm({
  variant = "icon",
  className
}: {
  variant?: "icon" | "text";
  className?: string;
}) {
  return (
    <form
      action={logoutInternalUser}
      className={className}
      onSubmit={clearSigecoBrowserStorage}
    >
      <button
        type="submit"
        title="Cerrar sesión"
        className={cn(
          "focus-ring inline-flex min-h-11 items-center justify-center font-semibold transition",
          variant === "icon"
            ? "h-11 w-11 rounded-[9px] border border-border bg-surface text-muted hover:border-primary/40 hover:text-text"
            : "px-2 text-sm text-muted hover:text-text"
        )}
      >
        {variant === "icon" ? (
          <>
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Cerrar sesión</span>
          </>
        ) : (
          "Cerrar sesión"
        )}
      </button>
    </form>
  );
}
