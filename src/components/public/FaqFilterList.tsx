"use client";

import { ChevronDown, Loader2, Search } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { Badge } from "@/components/shared/Badge";
import { PremiumCard } from "@/components/shared/PremiumCard";
import { faqCategories } from "@/data/faqs";
import { cn } from "@/lib/cn";
import type { FAQ } from "@/types/landing";

type CategoryId = (typeof faqCategories)[number]["id"];

export function FaqFilterList({ faqs }: { faqs: FAQ[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryId>("all");
  const [openId, setOpenId] = useState(faqs[0]?.id ?? "");
  const [isPending, startTransition] = useTransition();

  const filteredFaqs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return faqs.filter((faq) => {
      const matchesCategory = category === "all" || faq.category === category;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        `${faq.question} ${faq.answer}`.toLowerCase().includes(normalizedQuery);

      return matchesCategory && matchesQuery;
    });
  }, [category, faqs, query]);

  const handleCategoryChange = (nextCategory: CategoryId) => {
    startTransition(() => {
      setCategory(nextCategory);
      setOpenId("");
    });
  };

  return (
    <div>
      <div className="grid gap-4 rounded-[1.75rem] border border-border bg-surface p-4 shadow-soft lg:grid-cols-[1fr_auto] lg:items-center">
        <label className="focus-within:ring-primary/25 flex min-h-12 items-center gap-3 rounded-full border border-border bg-background px-4 transition focus-within:ring-4">
          <Search className="h-4 w-4 shrink-0 text-primary" />
          <span className="sr-only">Buscar pregunta frecuente</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por palabra clave"
            className="w-full bg-transparent text-sm text-text outline-none placeholder:text-muted"
          />
        </label>

        <div className="flex flex-wrap gap-2">
          {faqCategories.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleCategoryChange(item.id)}
              className={cn(
                "focus-ring rounded-full border px-4 py-2 text-xs font-semibold transition",
                category === item.id
                  ? "border-primary bg-primary text-white shadow-soft"
                  : "border-border bg-background text-primary-dark hover:border-primary/35"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between gap-4">
        <p className="text-sm font-semibold text-muted">
          {filteredFaqs.length} pregunta{filteredFaqs.length === 1 ? "" : "s"} encontrada
          {filteredFaqs.length === 1 ? "" : "s"}
        </p>
        {isPending ? (
          <span className="inline-flex items-center gap-2 text-xs font-semibold text-primary">
            <Loader2 className="h-4 w-4 animate-spin" />
            Filtrando
          </span>
        ) : null}
      </div>

      {filteredFaqs.length > 0 ? (
        <div className="mt-6 divide-y divide-border overflow-hidden rounded-[2rem] border border-border bg-surface shadow-soft">
          {filteredFaqs.map((faq) => {
            const isOpen = openId === faq.id;

            return (
              <article key={faq.id}>
                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? "" : faq.id)}
                  className="flex w-full items-start justify-between gap-4 px-5 py-5 text-left transition hover:bg-surface-soft/70 sm:px-7"
                  aria-expanded={isOpen}
                >
                  <span>
                    <span className="font-sora text-base font-semibold text-text">
                      {faq.question}
                    </span>
                    <span className="mt-3 flex flex-wrap gap-2">
                      <Badge>{faqCategories.find((item) => item.id === faq.category)?.label}</Badge>
                      {faq.featured ? <Badge>Destacada</Badge> : null}
                    </span>
                  </span>
                  <ChevronDown
                    className={cn(
                      "mt-1 h-5 w-5 shrink-0 text-primary transition",
                      isOpen && "rotate-180"
                    )}
                  />
                </button>
                <div
                  className={cn(
                    "grid transition-all duration-300",
                    isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  )}
                >
                  <div className="overflow-hidden">
                    <p className="px-5 pb-6 text-sm leading-7 text-muted sm:px-7">{faq.answer}</p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <PremiumCard tone="empty" className="mt-6">
          <p className="font-sora text-lg font-semibold text-text">
            No encontramos preguntas con esos filtros.
          </p>
          <p className="mt-2 text-sm leading-7 text-muted">
            Prueba con otra categoría o escribe por WhatsApp para resolver tu duda directamente.
          </p>
        </PremiumCard>
      )}
    </div>
  );
}
