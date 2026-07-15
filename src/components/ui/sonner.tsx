"use client";

import { Toaster as SonnerToaster } from "sonner";

/*
 * Toaster de sonner adaptado a los tokens Marea (sigeco-movil, Tarea 3).
 * Se monta una sola vez en el layout de Sigeco dentro de un contenedor
 * sm:hidden: los toasts solo existen en movil; desktop queda como hoy.
 */
export function Toaster(props: React.ComponentProps<typeof SonnerToaster>) {
  return (
    <SonnerToaster
      position="bottom-center"
      duration={3500}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "flex w-full items-center gap-2.5 rounded-[9px] border border-border bg-surface px-4 py-3.5 font-sans shadow-[0_12px_32px_rgba(11,44,54,0.18)]",
          title: "text-sm font-semibold text-text",
          description: "text-sm text-muted",
          icon: "flex h-5 w-5 shrink-0 items-center justify-center [&_svg]:h-full [&_svg]:w-full",
          success: "[&_[data-icon]]:text-success",
          error: "[&_[data-icon]]:text-error",
          warning: "[&_[data-icon]]:text-warning",
          info: "[&_[data-icon]]:text-primary-dark"
        }
      }}
      {...props}
    />
  );
}
