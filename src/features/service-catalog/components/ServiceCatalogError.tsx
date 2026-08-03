const messages: Record<string, string> = {
  "invalid-item": "Revisa los campos obligatorios, los montos y las sesiones.",
  "invalid-status": "No se pudo cambiar el estado. Revisa el motivo.",
  "invalid-threshold": "Revisa el umbral de descuento y el motivo del cambio.",
  "duplicate-code": "Ese código ya está reservado por otra oferta.",
  "concurrent-update":
    "Otra persona guardó cambios antes. Vuelve a abrir esta pantalla y repite la operación.",
  "invalid-component": "Revisa los productos componentes del tratamiento.",
  "inactive-component": "Uno de los productos componentes ya no está activo."
};

export function ServiceCatalogError({ code }: { code?: string }) {
  if (!code) return null;

  return (
    <div
      className="rounded-[9px] border border-error/30 bg-error/10 px-4 py-3 text-sm text-error"
      role="alert"
    >
      {messages[code] ?? "No se pudo guardar el cambio. Revisa los datos e inténtalo otra vez."}
    </div>
  );
}
