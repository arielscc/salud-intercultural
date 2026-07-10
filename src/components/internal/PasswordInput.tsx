"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { internalInputClassName } from "@/components/internal/Field";
import { cn } from "@/lib/cn";

export function PasswordInput({
  name = "password",
  autoComplete = "current-password",
  required
}: {
  name?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        className={cn(internalInputClassName, "pr-11")}
        type={visible ? "text" : "password"}
        name={name}
        autoComplete={autoComplete}
        required={required}
      />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        aria-pressed={visible}
        className="focus-ring absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-[9px] text-muted transition hover:text-text"
      >
        {visible ? (
          <EyeOff className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Eye className="h-4 w-4" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
