import { cn } from "@/lib/cn";

/*
 * Cápsula (chip) seleccionable para formularios: mismo aspecto que `ChipOption`
 * pero basada en un `<input type="radio">` nativo, así funciona dentro de un
 * `<form action={serverAction}>` sin estado de cliente ni JS, con validación
 * `required` nativa. Uso global en pantallas internas donde una pregunta de un
 * solo valor se responde tocando una opción.
 */
export function ChipRadio({
  name,
  value,
  label,
  defaultChecked,
  required
}: {
  name: string;
  value: string;
  label: React.ReactNode;
  defaultChecked?: boolean;
  required?: boolean;
}) {
  return (
    <label className="cursor-pointer">
      <input
        type="radio"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        required={required}
        className="peer sr-only"
      />
      <span
        className={cn(
          "inline-flex min-h-9 items-center rounded-full border border-border bg-surface px-3.5 text-[13px] font-semibold text-muted transition",
          "hover:border-primary/40 hover:text-text",
          "peer-checked:border-primary peer-checked:bg-surface-soft peer-checked:text-primary-dark",
          "peer-focus-visible:ring-2 peer-focus-visible:ring-primary/40 peer-focus-visible:ring-offset-1"
        )}
      >
        {label}
      </span>
    </label>
  );
}
