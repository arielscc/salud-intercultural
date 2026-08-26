import { Chip } from "@/components/internal/ui/Chip";
import { formatDateTime } from "@/lib/dates";

/**
 * Resumen de lo que se le pidio cancelar al paciente, tal como lo dejo el medico
 * o Recepcion. Reemplaza el bloque generico que mostraba el primer item como
 * titulo y la lista completa como subtitulo: aqui cada cosa pedida es una fila
 * con su tipo y su cantidad, y el pie deja claro quien lo solicito y cuando.
 *
 * Nunca muestra precios: el detalle de costos por producto es de uso exclusivo
 * del medico. Caja ve el que, de que tipo y cuanto.
 */
export type RequestedItem = {
  id: string;
  label: string;
  typeLabel: string;
  /** Clave normalizada del tipo; define el encabezado cuando todo es del mismo tipo. */
  kind: string;
  quantity: number;
  detail?: string | null;
};

export type RequestedBy = {
  name: string;
  roleLabel: string;
};

/** De donde salio la lista, para que Caja sepa que tan firme es lo que ve. */
export type RequestSource = "sale" | "doctor_order" | "clinical_order";

const sourceLabels: Record<RequestSource, string> = {
  sale: "Venta registrada",
  doctor_order: "Pedido del médico",
  clinical_order: "Orden clínica"
};

/** Encabezado cuando todo lo pedido comparte el mismo tipo. */
const headingByKind: Record<string, string> = {
  study: "Estudios solicitados",
  service: "Servicios solicitados",
  serum: "Sueroterapia solicitada",
  treatment: "Tratamiento indicado",
  medication: "Medicamentos indicados",
  product: "Productos indicados",
  resonance: "Resonancia solicitada"
};

function resolveHeading(items: RequestedItem[]) {
  const kinds = new Set(items.map((item) => item.kind));
  if (kinds.size === 1) {
    const [kind] = [...kinds];
    return headingByKind[kind] ?? "Pendiente por cobrar";
  }
  return "Pedido por cobrar";
}

export function AdministrativeRequestSummary({
  items,
  source,
  requestedBy,
  requestedAt,
  note,
  accepted,
  fallbackTitle
}: {
  items: RequestedItem[];
  source: RequestSource;
  requestedBy: RequestedBy | null;
  requestedAt: Date;
  note?: string | null;
  accepted?: boolean;
  fallbackTitle: string;
}) {
  const heading = items.length > 0 ? resolveHeading(items) : "Pendiente administrativo";
  const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="mt-4 rounded-[9px] border border-border bg-background p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
          {heading}
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          <Chip>{sourceLabels[source]}</Chip>
          {accepted ? (
            <Chip tone="success" dot>
              Aceptado por el paciente
            </Chip>
          ) : null}
        </div>
      </div>

      {items.length > 0 ? (
        <>
          <ul className="mt-3 grid gap-1.5">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-start gap-3 rounded-[9px] border border-border bg-surface px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-text">{item.label}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {item.typeLabel}
                    {item.detail ? ` · ${item.detail}` : ""}
                  </p>
                </div>
                <span className="mt-0.5 shrink-0 rounded-full bg-surface-soft px-2.5 py-1 text-xs font-semibold tabular-nums text-text">
                  <span className="sr-only">Cantidad: </span>×&nbsp;{item.quantity}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs tabular-nums text-muted">
            {items.length} {items.length === 1 ? "concepto" : "conceptos"} · {totalUnits}{" "}
            {totalUnits === 1 ? "unidad" : "unidades"} en total
          </p>
        </>
      ) : (
        <p className="mt-1 text-sm font-semibold text-text">{fallbackTitle}</p>
      )}

      {note ? (
        <div className="mt-3 border-t border-border pt-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
            Indicación
          </p>
          <p className="mt-1 text-sm text-text">{note}</p>
        </div>
      ) : null}

      <p className="mt-3 border-t border-border pt-3 text-xs text-muted">
        {requestedBy ? (
          <>
            Solicitado por{" "}
            <span className="font-semibold text-text">{requestedBy.name}</span> ·{" "}
            {requestedBy.roleLabel} · {formatDateTime(requestedAt)}
          </>
        ) : (
          <>Registrado el {formatDateTime(requestedAt)}</>
        )}
      </p>
    </div>
  );
}
