"use client";

import { Menu, MessageCircle, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/shared/Button";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { primaryPublicRoutes } from "@/config/routes";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/cn";
import type { SiteSettings } from "@/lib/cms/public-content";
import { createContextualWhatsAppLink } from "@/lib/whatsapp";

type HeaderProps = {
  site?: SiteSettings;
};

export function Header({ site = siteConfig }: HeaderProps) {
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
      <div className="grid h-20 w-full grid-cols-[1fr_auto] items-center gap-3 px-4 sm:px-6 lg:px-8 xl:grid-cols-[minmax(18rem,1fr)_auto_minmax(18rem,1fr)]">
        <Link href="/" className="flex min-w-0 items-center gap-3 justify-self-start" aria-label="Ir al inicio">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary text-lg font-bold text-white shadow-soft">
            SI
          </span>
          <span className="min-w-0">
            <span className="block font-sora text-sm font-semibold leading-tight text-text sm:text-base">
              {site.name}
            </span>
            <span className="block max-w-[13rem] text-xs font-medium leading-snug text-muted sm:max-w-none">
              {site.slogan}
            </span>
          </span>
        </Link>

        <div className="hidden items-center gap-3 justify-self-center xl:flex">
          <nav className="flex items-center gap-1" aria-label="Navegación principal">
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
          <Button
            href={createContextualWhatsAppLink({ pagePath: pathname }, site.conversion.whatsappPhone)}
            target="_blank"
            rel="noreferrer"
            size="sm"
            data-conversion-action="whatsapp_click"
            data-conversion-label="header_whatsapp"
          >
            <MessageCircle className="mr-2 h-4 w-4" />
            Agenda tu cita
          </Button>
        </div>

        <div className="flex items-center gap-2 justify-self-end">
          <button
            type="button"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface text-text shadow-sm xl:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <ThemeToggle />
        </div>
      </div>

      {open ? (
        <div className="border-t border-border bg-surface/95 px-4 py-4 shadow-soft backdrop-blur-xl xl:hidden">
          <nav className="mx-auto grid max-w-7xl gap-2" aria-label="Navegación móvil">
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
              href={createContextualWhatsAppLink({ pagePath: pathname }, site.conversion.whatsappPhone)}
              target="_blank"
              rel="noreferrer"
              className="mt-2 w-full"
              data-conversion-action="whatsapp_click"
              data-conversion-label="mobile_menu_whatsapp"
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              Agenda tu cita
            </Button>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
