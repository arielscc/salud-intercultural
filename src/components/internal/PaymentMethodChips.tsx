import { Banknote, CreditCard, Ellipsis, Landmark, QrCode } from "lucide-react";
import { paymentMethodLabels } from "@/features/sales/labels";

const paymentMethods = [
  { value: "cash", icon: Banknote },
  { value: "qr", icon: QrCode },
  { value: "card", icon: CreditCard },
  { value: "transfer", icon: Landmark },
  { value: "other", icon: Ellipsis }
] as const;

export function PaymentMethodChips({ defaultValue = "cash" }: { defaultValue?: string }) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-1.5 text-xs font-semibold text-text">Forma de pago</legend>
      <div className="flex flex-wrap gap-2">
        {paymentMethods.map(({ value, icon: Icon }) => (
          <label key={value} className="cursor-pointer">
            <input
              type="radio"
              name="paymentMethodCode"
              value={value}
              defaultChecked={value === defaultValue}
              className="peer sr-only"
            />
            <span className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-surface px-3 text-[13px] font-medium text-muted transition hover:border-primary/40 hover:text-text peer-focus-visible:ring-4 peer-focus-visible:ring-primary/20 peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:font-semibold peer-checked:text-primary-dark">
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {paymentMethodLabels[value]}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
