import { cn } from "@/lib/cn";

export function Table({
  className,
  children
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto">
      <table
        className={cn(
          "w-full border-collapse text-sm [&_tbody_tr:last-child_td]:border-b-0",
          className
        )}
      >
        {children}
      </table>
    </div>
  );
}

export function Th({ className, children, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "whitespace-nowrap border-b border-border bg-background px-3.5 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted",
        className
      )}
      {...props}
    >
      {children}
    </th>
  );
}

export function Tr({ className, children, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={cn("transition hover:bg-surface-soft/40", className)} {...props}>
      {children}
    </tr>
  );
}

export function Td({ className, children, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn("border-b border-border px-3.5 py-2.5 text-sm text-muted", className)} {...props}>
      {children}
    </td>
  );
}
