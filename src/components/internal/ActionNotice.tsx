"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ActionSuccessOverlay } from "@/components/internal/ActionSuccessOverlay";
import {
  clearSigecoSessionKey,
  PURCHASE_SAFE_DRAFT_KEY
} from "@/features/mobile-resilience/storage";
import {
  moduleDisabledNotice,
  permissionDeniedNotice
} from "@/features/modules/notices";

/*
 * Lee el search param `?aviso=<codigo>` que dejan las server actions que
 * redirigen al completarse, dispara el toast y limpia la URL (sigeco-movil,
 * Tarea 3). Codigos desconocidos solo se limpian, sin toast.
 */

const noticeMessages: Record<string, string> = {
  "llegada-registrada": "Llegada registrada",
  "ficha-actualizada": "Ficha actualizada",
  "seguimiento-creado": "Seguimiento creado",
  "seguimiento-agendado": "Seguimiento agendado",
  "producto-creado": "Producto creado",
  "producto-actualizado": "Producto actualizado",
  "estado-producto-actualizado": "Estado del producto actualizado",
  "proveedores-actualizados": "Proveedores del producto actualizados",
  "proveedor-creado": "Proveedor creado",
  "proveedor-actualizado": "Proveedor actualizado",
  "estado-proveedor-actualizado": "Estado del proveedor actualizado",
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
  "cash-correction-created": "Corrección registrada",
  "compra-creada": "Borrador de compra creado",
  "compra-confirmada": "Compra confirmada",
  "pago-compra-registrado": "Pago de compra registrado",
  "recepcion-registrada": "Recepción y stock registrados",
  "compra-anulada": "Compra anulada",
  "lote-ajustado": "Ajuste de lote registrado",
  "orden-estudios-enviada": "Paciente derivado a análisis",
  "paciente-enviado-consulta": "Paciente derivado a consulta",
  "paciente-enviado-administracion": "Paciente derivado a administración",
  "paciente-devuelto-recepcion": "Paciente devuelto a recepción",
  "visita-cerrada": "Atención cerrada",
  "tratamiento-pagado": "Tratamiento pagado"
};

const centeredNotices: Record<string, { title: string; description: string }> = {
  "orden-estudios-enviada": {
    title: "Derivado a análisis",
    description: "El paciente salió de recepción y la orden quedó registrada."
  },
  "paciente-enviado-consulta": {
    title: "Derivado a consulta",
    description: "El paciente fue enviado al panel del médico."
  },
  "paciente-enviado-administracion": {
    title: "Derivado a administración",
    description: "El paciente fue enviado para gestión administrativa."
  },
  "paciente-devuelto-recepcion": {
    title: "De vuelta en recepción",
    description: "La derivación fue corregida y el paciente volvió a recepción."
  },
  "visita-cerrada": {
    title: "Atención completada",
    description: "La visita salió de las bandejas activas."
  },
  "tratamiento-pagado": {
    title: "Tratamiento pagado",
    description: "El cobro quedó registrado, la visita terminó y el seguimiento pasó a Recepción."
  },
  "cash-session-closed": {
    title: "Caja cerrada exitosamente",
    description: "El cierre quedó registrado y la Caja fue conciliada."
  }
};

/*
 * Rechazos: no son un exito, asi que salen como advertencia. El modulo apagado y
 * la falta de permiso se avisan distinto a proposito, porque no significan lo
 * mismo para quien esta al otro lado de la pantalla.
 */
const warningNotices: Record<string, string> = {
  [moduleDisabledNotice]: "Esa parte del sistema todavía no está disponible.",
  [permissionDeniedNotice]: "No tienes acceso a esa sección."
};

export function ActionNotice() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const aviso = searchParams.get("aviso");
  const centeredNotice = aviso ? centeredNotices[aviso] : undefined;

  useEffect(() => {
    if (!aviso) return;
    if (aviso === "compra-creada") {
      clearSigecoSessionKey(PURCHASE_SAFE_DRAFT_KEY);
    }
    if (aviso === "llegada-registrada-atribucion-pendiente") {
      toast.warning(
        "Llegada registrada. La campaña quedó pendiente porque Payload no respondió."
      );
    }
    const warning = warningNotices[aviso];
    if (warning) {
      toast.warning(warning);
    }
    const message = noticeMessages[aviso];
    const centered = centeredNotices[aviso];
    if (!centered && message) {
      toast.success(message);
    }
    const params = new URLSearchParams(searchParams);
    params.delete("aviso");
    const query = params.toString();
    const target = query ? `${pathname}?${query}` : pathname;
    const timeout = window.setTimeout(() => {
      router.replace(target, { scroll: false });
    }, centered ? 1450 : 0);
    return () => window.clearTimeout(timeout);
  }, [aviso, pathname, router, searchParams]);

  return (
    <ActionSuccessOverlay
      open={Boolean(centeredNotice)}
      title={centeredNotice?.title ?? ""}
      description={centeredNotice?.description ?? ""}
    />
  );
}
