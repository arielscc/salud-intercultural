"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button, type ButtonProps } from "@/components/internal/ui/Button";
import { cn } from "@/lib/cn";

export function SubmitButton({
  className,
  children,
  pendingLabel,
  ...props
}: Omit<ButtonProps, "type"> & { pendingLabel?: React.ReactNode }) {
  const { pending } = useFormStatus();
  const disabled = pending || props.disabled;

  return (
    <Button
      {...props}
      type="submit"
      disabled={disabled}
      aria-busy={pending || undefined}
      className={cn("relative", pending && "cursor-wait", className)}
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
      {pending && pendingLabel ? pendingLabel : children}
    </Button>
  );
}
