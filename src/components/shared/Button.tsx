import { cn } from "@/lib/cn";

type ButtonProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: "primary" | "secondary" | "ghost" | "light";
};

export function Button({
  className,
  variant = "primary",
  children,
  ...props
}: ButtonProps) {
  return (
    <a
      className={cn(
        "inline-flex min-h-11 items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        variant === "primary" &&
          "bg-primary text-white shadow-soft hover:-translate-y-0.5 hover:bg-primary-dark",
        variant === "secondary" &&
          "border border-border bg-surface text-text hover:-translate-y-0.5 hover:border-primary/35 hover:bg-surface-soft",
        variant === "ghost" && "text-text hover:bg-surface-soft",
        variant === "light" &&
          "bg-surface text-primary-dark shadow-soft hover:-translate-y-0.5 hover:bg-surface-soft",
        className
      )}
      {...props}
    >
      {children}
    </a>
  );
}
