import Link from "next/link";
import { cn } from "@/lib/cn";

/*
 * Patron de lista responsive (sigeco-movil, Tarea 1): debajo de `sm` cada
 * registro se muestra como fila tocable tipo card; la tabla existente se
 * conserva sin cambios desde `sm` envuelta en RecordTable. La web/desktop
 * no cambia: RecordList solo existe en movil (sm:hidden).
 */

export function RecordList({
  className,
  children
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <ul className={cn("divide-y divide-border sm:hidden", className)}>{children}</ul>;
}

export function RecordItem({
  href,
  title,
  status,
  action,
  className,
  children
}: {
  href?: string;
  title: React.ReactNode;
  status?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <li
      className={cn(
        "relative grid gap-2 px-4 py-3.5",
        href && "transition active:bg-surface-soft/60",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        {href ? (
          <Link
            href={href}
            className="focus-ring min-w-0 rounded-[7px] text-sm font-semibold leading-snug text-text after:absolute after:inset-0"
          >
            {title}
          </Link>
        ) : (
          <span className="min-w-0 text-sm font-semibold leading-snug text-text">{title}</span>
        )}
        {status ? <span className="shrink-0">{status}</span> : null}
      </div>
      {children ? <div className="grid gap-1 text-[13px] text-muted">{children}</div> : null}
      {action ? <div className="relative flex justify-end">{action}</div> : null}
    </li>
  );
}

export function RecordListEmpty({ children }: { children: React.ReactNode }) {
  return <li className="px-4 py-8 text-center">{children}</li>;
}

export function RecordTable({
  className,
  children
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn("hidden sm:block", className)}>{children}</div>;
}
