import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

export const buttonVariants = cva(
  "focus-ring inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[9px] text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-55",
  {
    variants: {
      variant: {
        primary: "bg-primary text-white hover:bg-primary-dark",
        outline: "border border-border bg-surface text-text hover:border-primary/40 hover:text-primary-dark",
        ghost: "text-muted hover:bg-surface-soft hover:text-text",
        danger: "bg-error text-white hover:bg-error/90",
        link: "text-primary-dark underline-offset-4 hover:underline"
      },
      size: {
        sm: "min-h-11 px-3 text-[13px] sm:min-h-9",
        md: "min-h-11 px-4"
      }
    },
    compoundVariants: [
      {
        variant: "link",
        class: "min-h-0 px-0"
      }
    ],
    defaultVariants: {
      variant: "primary",
      size: "md"
    }
  }
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
