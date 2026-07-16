import { cn } from "@/lib/cn";

export function FormActions({
  className,
  children
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between border-t border-border pt-4 lg:sticky lg:bottom-0 lg:z-[5] lg:bg-background lg:py-3",
        className
      )}
    >
      {children}
    </div>
  );
}

