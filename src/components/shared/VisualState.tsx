import { AlertCircle, CheckCircle2, Loader2, Search } from "lucide-react";
import { PremiumCard } from "@/components/shared/PremiumCard";
import { cn } from "@/lib/cn";

const stateIcon = {
  loading: Loader2,
  error: AlertCircle,
  success: CheckCircle2,
  empty: Search
} as const;

type VisualStateProps = {
  state: keyof typeof stateIcon;
  title: string;
  description?: string;
  className?: string;
};

export function VisualState({
  state,
  title,
  description,
  className
}: VisualStateProps) {
  const Icon = stateIcon[state];

  return (
    <PremiumCard
      tone={state === "error" ? "error" : state === "success" ? "success" : "empty"}
      className={cn("flex items-start gap-4", className)}
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-surface text-primary shadow-sm">
        <Icon
          className={cn("h-5 w-5", state === "loading" && "animate-spin")}
          aria-hidden="true"
        />
      </span>
      <div>
        <p className="font-sora text-base font-semibold text-text">{title}</p>
        {description ? (
          <p className="mt-1 text-sm leading-6 text-muted">{description}</p>
        ) : null}
      </div>
    </PremiumCard>
  );
}
