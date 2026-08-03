const messages: Record<string, string> = {
  "invalid-order": "Revisa las líneas del pedido: oferta, cantidad y montos.",
  "discount-over-cap":
    "El descuento total supera el tope permitido (suma de los umbrales por producto). Ajusta el descuento.",
  "empty-order": "Agrega al menos una línea antes de enviar el pedido.",
  "consultation-not-finalized":
    "Finaliza y firma la consulta antes de enviar el pedido a Administración.",
  "visit-not-in-consultation": "La visita ya no admite cambios en el pedido.",
  "already-confirmed": "Administración ya confirmó este pedido; no se puede editar.",
  "invalid-line": "Una línea apunta a una oferta o producto que ya no está disponible."
};

export function DoctorOrderError({ code }: { code?: string }) {
  if (!code || !(code in messages)) return null;

  return (
    <div
      className="rounded-[9px] border border-error/30 bg-error/10 px-4 py-3 text-sm text-error"
      role="alert"
    >
      {messages[code]}
    </div>
  );
}
