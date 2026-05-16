import { Container } from "@/components/shared/Container";
import { cn } from "@/lib/cn";

type PublicSectionProps = React.HTMLAttributes<HTMLElement> & {
  tone?: "default" | "surface" | "gradient" | "hero";
  contained?: boolean;
};

export function PublicSection({
  className,
  children,
  tone = "default",
  contained = true,
  ...props
}: PublicSectionProps) {
  return (
    <section
      className={cn(
        "public-section",
        tone === "surface" && "bg-surface",
        tone === "gradient" && "premium-gradient-soft",
        tone === "hero" && "premium-hero-surface premium-grid pt-28",
        className
      )}
      {...props}
    >
      {contained ? <Container>{children}</Container> : children}
    </section>
  );
}
