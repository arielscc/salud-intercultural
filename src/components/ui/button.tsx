import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "focus-ring group/button inline-flex shrink-0 items-center justify-center gap-1.5 rounded-[9px] border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition select-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-55 aria-invalid:border-error aria-invalid:ring-3 aria-invalid:ring-error/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-white hover:bg-primary-dark",
        outline:
          "border-border bg-surface text-text shadow-xs hover:bg-surface-soft hover:text-text aria-expanded:bg-surface-soft aria-expanded:text-text",
        secondary: "bg-secondary text-white hover:bg-secondary/90",
        ghost: "text-muted hover:bg-surface-soft hover:text-text aria-expanded:bg-surface-soft aria-expanded:text-text",
        destructive: "bg-error/10 text-error hover:bg-error/20 focus-visible:ring-error/30",
        link: "text-primary-dark underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-2.5",
        xs: "h-6 gap-1 px-2 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 px-2.5",
        lg: "h-10 px-2.5",
        icon: "size-9",
        "icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
