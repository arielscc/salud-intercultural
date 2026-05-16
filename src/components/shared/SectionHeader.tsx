import { Badge } from "@/components/shared/Badge";
import { cn } from "@/lib/cn";

export function SectionHeader({
  eyebrow,
  title,
  description,
  align = "center",
  className
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto max-w-3xl",
        align === "center" ? "text-center" : "mx-0 text-left",
        className
      )}
    >
      {eyebrow ? <Badge>{eyebrow}</Badge> : null}
      <h2 className="mt-4 font-sora text-3xl font-semibold leading-tight tracking-normal text-text sm:text-4xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-4 text-base leading-8 text-muted sm:text-lg">
          {description}
        </p>
      ) : null}
    </div>
  );
}
