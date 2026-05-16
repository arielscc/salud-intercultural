"use client";

import { Menu, MessageCircle, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Container } from "@/components/shared/Container";
import { Button } from "@/components/shared/Button";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { primaryPublicRoutes } from "@/config/routes";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/cn";
import { createWhatsAppLink } from "@/lib/whatsapp";

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed left-0 right-0 top-0 z-50 transition-all duration-300",
        scrolled || open ? "bg-surface/88 shadow-sm backdrop-blur-xl" : "bg-transparent"
      )}
    >
      <Container className="flex h-20 items-center justify-between">
        <Link href="/" className="flex items-center gap-3" aria-label="Ir al inicio">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary text-lg font-bold text-white shadow-soft">
            SI
          </span>
          <span className="min-w-0">
            <span className="block font-sora text-sm font-semibold text-text sm:text-base">
              {siteConfig.name}
            </span>
            <span className="block text-xs font-medium text-muted">
              Medicina natural e integrativa
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Navegación principal">
          {primaryPublicRoutes.map((item) => {
            const active = pathname === item.href;

            return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-full px-3 py-2 text-sm font-semibold transition hover:bg-surface-soft hover:text-primary-dark",
                active ? "bg-surface-soft text-primary-dark" : "text-muted"
              )}
              aria-current={active ? "page" : undefined}
            >
              {item.label}
            </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <ThemeToggle />
          <Button href={createWhatsAppLink(siteConfig.primaryCta.message)} target="_blank" rel="noreferrer">
            <MessageCircle className="mr-2 h-4 w-4" />
            {siteConfig.primaryCta.label}
          </Button>
        </div>

        <button
          type="button"
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface text-text shadow-sm lg:hidden"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </Container>

      {open ? (
        <div className="border-t border-border bg-surface/95 px-4 py-4 shadow-soft backdrop-blur-xl lg:hidden">
          <nav className="mx-auto grid max-w-7xl gap-2" aria-label="Navegación móvil">
            <div className="mb-2 flex items-center justify-between rounded-2xl bg-surface-soft px-4 py-3">
              <span className="text-sm font-semibold text-text">Tema</span>
              <ThemeToggle />
            </div>
            {primaryPublicRoutes.map((item) => {
              const active = pathname === item.href;

              return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "rounded-2xl px-4 py-3 text-sm font-semibold hover:bg-surface-soft",
                  active ? "bg-surface-soft text-primary-dark" : "text-text"
                )}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </Link>
              );
            })}
            <Button
              href={createWhatsAppLink(siteConfig.primaryCta.message)}
              target="_blank"
              rel="noreferrer"
              className="mt-2 w-full"
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              {siteConfig.primaryCta.label}
            </Button>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
