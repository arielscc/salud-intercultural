import Link from "next/link";
import { cn } from "@/lib/cn";

export type MobileTabItem = {
  href: string;
  label: string;
  active: boolean;
  count?: number;
};

export function MobileTabs({ label, items }: { label: string; items: MobileTabItem[] }) {
  return (
    <nav className="overflow-x-auto sm:hidden" aria-label={label}>
      <div className="inline-flex min-w-full rounded-[9px] border border-border bg-surface-soft p-1">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={item.active ? "page" : undefined}
            className={cn(
              "focus-ring inline-flex min-h-10 min-w-fit flex-1 items-center justify-center gap-1.5 rounded-[7px] px-3 text-[13px] font-semibold transition",
              item.active
                ? "bg-surface text-primary-dark"
                : "text-muted active:bg-surface/70 active:text-text"
            )}
          >
            <span>{item.label}</span>
            {item.count !== undefined ? (
              <span
                className={cn(
                  "inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] tabular-nums",
                  item.active ? "bg-primary/10 text-primary-dark" : "bg-border/70 text-muted"
                )}
              >
                {item.count}
              </span>
            ) : null}
          </Link>
        ))}
      </div>
    </nav>
  );
}
