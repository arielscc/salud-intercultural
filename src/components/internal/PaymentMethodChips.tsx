import { Banknote, QrCode } from "lucide-react";
export function PaymentMethodChips({
  methods,
  defaultValue
}: {
  methods: Array<{ code: string; name: string }>;
  defaultValue?: string;
}) {
  const selected =
    methods.find((method) => method.code === defaultValue)?.code ??
    methods.find((method) => method.code === "cash")?.code ??
    methods[0]?.code;

  return (
    <fieldset className="min-w-0">
      <legend className="mb-1.5 text-xs font-semibold text-text">Forma de pago</legend>
      <div className="flex flex-wrap gap-2">
        {methods.map((method) => {
          const Icon = method.code === "qr" ? QrCode : Banknote;
          return (
          <label key={method.code} className="cursor-pointer">
            <input
              type="radio"
              name="paymentMethodCode"
              value={method.code}
              defaultChecked={method.code === selected}
              className="peer sr-only"
            />
            <span className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-surface px-3 text-[13px] font-medium text-muted transition hover:border-primary/40 hover:text-text peer-focus-visible:ring-4 peer-focus-visible:ring-primary/20 peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:font-semibold peer-checked:text-primary-dark">
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {method.name}
            </span>
          </label>
          );
        })}
        {methods.length === 0 ? (
          <p className="text-xs text-error">No hay formas de pago habilitadas en esta sucursal.</p>
        ) : null}
      </div>
    </fieldset>
  );
}
