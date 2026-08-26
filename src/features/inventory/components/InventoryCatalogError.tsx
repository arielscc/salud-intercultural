const messages: Record<string, string> = {
  "invalid-item": "Revisa los campos obligatorios, cantidades y montos.",
  "invalid-supplier": "Revisa el nombre y los datos de contacto del proveedor.",
  "invalid-status": "No se pudo cambiar el estado. Revisa el motivo.",
  "invalid-suppliers": "Selecciona proveedores válidos y un solo preferido.",
  "duplicate-code": "Ese código interno ya está reservado por otro producto.",
  "duplicate-sku": "Ese SKU ya pertenece a otro producto.",
  "duplicate-supplier": "Ya existe un proveedor con ese nombre.",
  "concurrent-update":
    "Otra persona guardó cambios antes. Vuelve a abrir esta pantalla y repite la operación.",
  "inactive-item": "El producto está inactivo y no admite movimientos.",
  "not-for-sale": "El producto está clasificado solo para uso interno.",
  "inactive-supplier": "Uno de los proveedores ya no está activo.",
  "invalid-preferred": "El proveedor preferido también debe estar seleccionado."
};

export function InventoryCatalogError({ code }: { code?: string }) {
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
