"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { Container } from "@/components/shared/Container";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { faqs } from "@/data/faqs";
import { cn } from "@/lib/cn";

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section className="bg-gradient-to-b from-background to-surface py-24">
      <Container>
        <SectionHeader eyebrow="Preguntas frecuentes" title="Preguntas frecuentes" />
        <div className="mx-auto mt-12 max-w-4xl divide-y divide-border overflow-hidden rounded-[2rem] border border-border bg-surface shadow-soft">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div key={faq.question}>
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? -1 : index)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left sm:px-7"
                  aria-expanded={isOpen}
                >
                  <span className="font-sora text-base font-semibold text-text">{faq.question}</span>
                  <ChevronDown
                    className={cn("h-5 w-5 shrink-0 text-primary transition", isOpen && "rotate-180")}
                  />
                </button>
                <div className={cn("grid transition-all duration-300", isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
                  <div className="overflow-hidden">
                    <p className="px-5 pb-5 text-sm leading-7 text-muted sm:px-7">{faq.answer}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
