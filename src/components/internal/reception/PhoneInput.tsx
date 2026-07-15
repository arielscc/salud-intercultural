"use client";

import { internalInputClassName } from "@/components/internal/Field";
import { cn } from "@/lib/cn";

function isMobileCoarsePointer() {
  return window.matchMedia("(max-width: 639px) and (pointer: coarse)").matches;
}

export function formatBolivianPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  const hasExplicitCountryCode = value.trimStart().startsWith("+591");
  const hasCountryCode =
    digits.startsWith("591") && (hasExplicitCountryCode || digits.length > 8);
  const localDigits = (hasCountryCode ? digits.slice(3) : digits).slice(0, 8);
  const grouped =
    localDigits.length > 4
      ? `${localDigits.slice(0, 4)} ${localDigits.slice(4)}`
      : localDigits;

  if (!grouped) return hasCountryCode ? "+591" : "";
  return hasCountryCode ? `+591 ${grouped}` : grouped;
}

export function PhoneInput({
  value,
  onValueChange,
  className,
  autoFocus
}: {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  autoFocus?: boolean;
}) {
  return (
    <input
      className={cn(internalInputClassName, className)}
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      enterKeyHint="next"
      value={value}
      onChange={(event) => {
        const nextValue = event.target.value;
        onValueChange(isMobileCoarsePointer() ? formatBolivianPhone(nextValue) : nextValue);
      }}
      placeholder="7123 4567"
      autoFocus={autoFocus}
    />
  );
}
