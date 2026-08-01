import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/internal/ui/Button";
import { cn } from "@/lib/cn";

type PaginationProps = {
  page: number;
  pageSize: number;
  totalItems: number;
  pathname: string;
  searchParams?: Record<string, string | undefined>;
};

function paginationItems(page: number, totalPages: number) {
  const visible = new Set([1, totalPages, page - 1, page, page + 1]);
  const pages = [...visible].filter((item) => item >= 1 && item <= totalPages).sort((a, b) => a - b);
  const items: Array<number | "ellipsis"> = [];

  pages.forEach((item, index) => {
    if (index > 0 && item - pages[index - 1] > 1) items.push("ellipsis");
    items.push(item);
  });

  return items;
}

export function Pagination({
  page,
  pageSize,
  totalItems,
  pathname,
  searchParams = {}
}: PaginationProps) {
  const totalPages = Math.ceil(totalItems / pageSize);
  if (totalPages <= 1) return null;

  const currentPage = Math.min(page, totalPages);
  const hrefFor = (targetPage: number) => {
    const params = new URLSearchParams();
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    if (targetPage > 1) params.set("page", String(targetPage));
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  };
  const previous = currentPage > 1 ? hrefFor(currentPage - 1) : null;
  const next = currentPage < totalPages ? hrefFor(currentPage + 1) : null;
  const iconClassName = cn(
    buttonVariants({ variant: "outline", size: "sm" }),
    "h-11 w-11 px-0 sm:h-10 sm:w-10"
  );

  return (
    <nav
      className="flex items-center justify-between gap-3 border-t border-border px-3 py-3 sm:px-[18px]"
      aria-label="Paginación"
    >
      <div className="flex w-full items-center justify-between gap-3 sm:hidden">
        <PaginationArrow href={previous} label="Página anterior" direction="previous" className={iconClassName} />
        <span className="text-sm font-semibold tabular-nums text-text">
          Página {currentPage} de {totalPages}
        </span>
        <PaginationArrow href={next} label="Página siguiente" direction="next" className={iconClassName} />
      </div>

      <p className="hidden text-sm tabular-nums text-muted sm:block">
        {Math.min((currentPage - 1) * pageSize + 1, totalItems)}–{Math.min(currentPage * pageSize, totalItems)} de {totalItems}
      </p>
      <div className="hidden items-center gap-1 sm:flex">
        <PaginationArrow href={previous} label="Página anterior" direction="previous" className={iconClassName} />
        {paginationItems(currentPage, totalPages).map((item, index) =>
          item === "ellipsis" ? (
            <span key={`ellipsis-${index}`} className="grid h-10 w-8 place-items-center text-muted" aria-hidden="true">
              …
            </span>
          ) : (
            <Link
              key={item}
              href={hrefFor(item)}
              aria-current={item === currentPage ? "page" : undefined}
              aria-label={`Página ${item}`}
              className={cn(
                buttonVariants({ variant: item === currentPage ? "primary" : "outline", size: "sm" }),
                "h-10 min-w-10 px-3 tabular-nums"
              )}
            >
              {item}
            </Link>
          )
        )}
        <PaginationArrow href={next} label="Página siguiente" direction="next" className={iconClassName} />
      </div>
    </nav>
  );
}

function PaginationArrow({
  href,
  label,
  direction,
  className
}: {
  href: string | null;
  label: string;
  direction: "previous" | "next";
  className: string;
}) {
  const Icon = direction === "previous" ? ChevronLeft : ChevronRight;

  return href ? (
    <Link href={href} aria-label={label} title={label} className={className}>
      <Icon className="h-4 w-4" aria-hidden="true" />
    </Link>
  ) : (
    <span className={cn(className, "cursor-not-allowed opacity-45")} aria-disabled="true">
      <Icon className="h-4 w-4" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}
