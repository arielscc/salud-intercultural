const messages: Record<string, string> = {
  "invalid-lines": "Revisa productos, cantidades y costos.",
  "inactive-supplier": "El proveedor ya no está activo.",
  "inactive-item": "Uno de los productos ya no está activo.",
  "invalid-status": "La compra ya no admite esta operación.",
  "concurrent-update": "Otra persona actualizó la compra. Vuelve a abrir la pantalla.",
  "cash-session-required": "Selecciona una Caja abierta para registrar el pago.",
  "cash-session-not-open": "La Caja seleccionada ya no está abierta.",
  "payment-exceeds-balance": "El pago supera el saldo pendiente.",
  "source-expense-invalid": "La compra urgente ya fue vinculada o no requiere inventario.",
  "source-expense-total-mismatch": "El total de las líneas no coincide con el egreso urgente.",
  "receipt-exceeds-pending": "Una cantidad recibida supera lo que seguía pendiente.",
  "receipt-empty": "Indica al menos una cantidad recibida mayor que cero.",
  "branch-mismatch": "La recepción debe registrarse en la sucursal de la compra.",
  "invalid-authorizer": "La autorización debe pertenecer a Dirección.",
  "insufficient-lot-stock": "El lote no tiene cantidad suficiente.",
  "invalid-document": "El documento debe ser PDF, JPG, PNG o WebP válido.",
  "invalid-payment": "Revisa monto, medio, Caja y referencia.",
  "invalid-adjustment": "Revisa lote, cantidad, motivo y autorización."
};

export function PurchaseError({ code }: { code?: string }) {
  if (!code) return null;
  return (
    <div
      className="rounded-[9px] border border-error/30 bg-error/10 px-4 py-3 text-sm text-error"
      role="alert"
    >
      {messages[code] ?? "No se pudo completar la operación."}
    </div>
  );
}
