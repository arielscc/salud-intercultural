import { cn } from "@/lib/cn";

export function PageHeader({
  title,
  description,
  actions,
  actionsClassName,
  className
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  actionsClassName?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-3", className)}>
      <div>
        <h2 className="font-sora text-xl font-bold tracking-tight text-text">{title}</h2>
        {description ? <p className="mt-0.5 text-xs text-muted">{description}</p> : null}
      </div>
      {actions ? <div className={cn("flex items-center gap-2", actionsClassName)}>{actions}</div> : null}
    </div>
  );
}
