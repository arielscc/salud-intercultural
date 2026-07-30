"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

/*
 * Lee el search param `?aviso=<codigo>` que dejan las server actions que
 * redirigen al completarse, dispara el toast y limpia la URL (sigeco-movil,
 * Tarea 3). Codigos desconocidos solo se limpian, sin toast.
 */

const noticeMessages: Record<string, string> = {
  "llegada-registrada": "Llegada registrada",
  "ficha-actualizada": "Ficha actualizada",
  "seguimiento-creado": "Seguimiento creado",
  "producto-creado": "Producto creado",
  "venta-creada": "Venta registrada",
  "usuario-creado": "Usuario creado",
  "acceso-actualizado": "Acceso actualizado",
  "contrasena-actualizada": "Contraseña actualizada",
  "cash-session-opened": "Caja abierta",
  "cash-staff-expense-created": "Dinero al personal registrado",
  "cash-purchase-created": "Compra urgente registrada",
  "cash-expense-created": "Egreso registrado",
  "cash-close-pending": "Cierre enviado a Dirección",
  "cash-session-closed": "Caja cerrada y conciliada",
  "cash-close-approved": "Diferencia aprobada y Caja cerrada",
  "cash-correction-created": "Corrección registrada"
};

export function ActionNotice() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const aviso = searchParams.get("aviso");

  useEffect(() => {
    if (!aviso) return;
    const message = noticeMessages[aviso];
    if (message) toast.success(message);
    const params = new URLSearchParams(searchParams);
    params.delete("aviso");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [aviso, pathname, router, searchParams]);

  return null;
}
