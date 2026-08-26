"use client";

import { internalInputClassName } from "@/components/internal/Field";

export function MobileAutoSubmitSelect({
  name,
  defaultValue,
  label,
  options
}: {
  name: string;
  defaultValue: string;
  label: string;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <form className="sm:hidden">
      <label className="grid gap-1.5 text-[13px] font-medium text-text">
        <span className="sr-only">{label}</span>
        <select
          className={internalInputClassName}
          name={name}
          defaultValue={defaultValue}
          aria-label={label}
          onChange={(event) => {
            if (window.matchMedia("(max-width: 639px)").matches) {
              event.currentTarget.form?.requestSubmit();
            }
          }}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </form>
  );
}
