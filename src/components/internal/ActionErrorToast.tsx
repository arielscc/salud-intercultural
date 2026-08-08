"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

/*
 * Muestra como toast (no como franja fija) el mensaje de error que dejó una
 * server action al redirigir con `?error=`, y limpia el parámetro de la URL. El
 * mensaje ya viene resuelto por la página (mismo texto que mostraba la franja).
 * Dura lo suficiente para leerse y se puede cerrar con un clic.
 */
export function ActionErrorToast({ message }: { message: string }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const shown = useRef(false);

  useEffect(() => {
    if (!message || shown.current) return;
    shown.current = true;
    toast.error(message, { duration: 10000 });
    const params = new URLSearchParams(searchParams);
    params.delete("error");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [message, pathname, router, searchParams]);

  return null;
}
