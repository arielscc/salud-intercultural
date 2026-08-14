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
  autoFocus,
  maxDigits = 8,
  digitsOnly = false,
  placeholder = "71234567"
}: {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  autoFocus?: boolean;
  maxDigits?: number;
  digitsOnly?: boolean;
  placeholder?: string;
}) {
  return (
    <input
      className={cn(internalInputClassName, className)}
      type="tel"
      inputMode="numeric"
      autoComplete="tel"
      enterKeyHint="next"
      value={value}
      onChange={(event) => {
        const nextValue = event.target.value;
        if (digitsOnly) {
          onValueChange(nextValue.replace(/\D/g, "").slice(0, maxDigits));
          return;
        }
        onValueChange(isMobileCoarsePointer() ? formatBolivianPhone(nextValue) : nextValue);
      }}
      placeholder={placeholder}
      autoFocus={autoFocus}
      maxLength={digitsOnly ? maxDigits : undefined}
    />
  );
}
