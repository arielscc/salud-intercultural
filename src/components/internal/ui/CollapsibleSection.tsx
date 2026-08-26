import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

export function CollapsibleSection({
  title,
  description,
  defaultOpen = false,
  className,
  children
}: {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <details
      className={cn(
        "group rounded-[9px] border border-border bg-background open:bg-surface",
        className
      )}
      open={defaultOpen}
    >
      <summary className="focus-ring flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-[9px] px-4 py-3 [&::-webkit-details-marker]:hidden">
        <span>
          <span className="block text-[13px] font-semibold text-text">{title}</span>
          {description ? <span className="mt-0.5 block text-xs text-muted">{description}</span> : null}
        </span>
        <ChevronDown
          className="h-4 w-4 shrink-0 text-muted transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div className="grid gap-3 border-t border-border px-4 py-4">{children}</div>
    </details>
  );
}
