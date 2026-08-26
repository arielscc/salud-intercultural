"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";

/*
 * Muestra como toast (no como franja fija) el mensaje de error que dejó una
 * server action al redirigir con `?error=`, y limpia el parámetro de la URL. El
 * mensaje ya viene resuelto por la página (mismo texto que mostraba la franja).
 * Dura lo suficiente para leerse y se puede cerrar con un clic.
 */
export function ActionErrorToast({
  message,
  title,
  preserveScrollKey
}: {
  message?: string;
  title?: string;
  preserveScrollKey?: string;
}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const shown = useRef(false);

  useEffect(() => {
    if (!preserveScrollKey) return;
    const saveScroll = () => {
      window.sessionStorage.setItem(preserveScrollKey, String(window.scrollY));
    };
    document.addEventListener("submit", saveScroll, { capture: true });
    return () => {
      document.removeEventListener("submit", saveScroll, { capture: true });
    };
  }, [preserveScrollKey]);

  useEffect(() => {
    if (!message || shown.current) return;
    shown.current = true;
    toast.error(title ?? message, {
      description: title ? message : undefined,
      duration: 10000
    });
    const params = new URLSearchParams(searchParams);
    params.delete("error");
    const query = params.toString();
    const target = query ? `${pathname}?${query}` : pathname;
    window.history.replaceState(window.history.state, "", target);
    if (preserveScrollKey) {
      const savedScroll = window.sessionStorage.getItem(preserveScrollKey);
      if (savedScroll) {
        window.sessionStorage.removeItem(preserveScrollKey);
        window.requestAnimationFrame(() => {
          window.scrollTo({ top: Number(savedScroll), behavior: "instant" });
        });
      }
    }
  }, [message, pathname, preserveScrollKey, searchParams, title]);

  return null;
}
