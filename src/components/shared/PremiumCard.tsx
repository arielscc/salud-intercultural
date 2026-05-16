import { cn } from "@/lib/cn";

type PremiumCardProps = React.HTMLAttributes<HTMLDivElement> & {
  tone?: "default" | "soft" | "glass" | "success" | "error" | "empty";
  interactive?: boolean;
};

export function PremiumCard({
  className,
  tone = "default",
  interactive = false,
  ...props
}: PremiumCardProps) {
  return (
    <div
      className={cn(
        "premium-card",
        tone === "soft" && "bg-surface-soft/70",
        tone === "glass" && "glass",
        tone === "success" && "border-success/25 bg-success/10",
        tone === "error" && "border-destructive/25 bg-destructive/10",
        tone === "empty" && "border-dashed bg-surface-soft/55 shadow-none",
        interactive && "premium-card-interactive",
        className
      )}
      {...props}
    />
  );
}
