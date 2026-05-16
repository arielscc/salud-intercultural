import { cn } from "@/lib/cn";

type ButtonProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: "primary" | "secondary" | "ghost" | "light";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  disabled?: boolean;
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  isLoading = false,
  disabled = false,
  children,
  ...props
}: ButtonProps) {
  return (
    <a
      aria-disabled={disabled || isLoading}
      className={cn(
        "focus-ring inline-flex items-center justify-center rounded-full text-sm font-semibold transition duration-200 active:scale-[0.99]",
        size === "sm" && "min-h-10 px-4 py-2",
        size === "md" && "min-h-11 px-5 py-3",
        size === "lg" && "min-h-12 px-6 py-3.5",
        variant === "primary" &&
          "bg-primary text-white shadow-soft hover:-translate-y-0.5 hover:bg-primary-dark",
        variant === "secondary" &&
          "border border-border bg-surface text-text hover:-translate-y-0.5 hover:border-primary/35 hover:bg-surface-soft",
        variant === "ghost" && "text-text hover:bg-surface-soft",
        variant === "light" &&
          "bg-surface text-primary-dark shadow-soft hover:-translate-y-0.5 hover:bg-surface-soft",
        (disabled || isLoading) &&
          "pointer-events-none cursor-not-allowed opacity-60 hover:translate-y-0",
        className
      )}
      {...props}
    >
      {isLoading ? (
        <span
          className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      ) : null}
      {children}
    </a>
  );
}
