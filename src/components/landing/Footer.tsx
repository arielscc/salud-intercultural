import { Facebook, Instagram, Mail, MapPin, Phone } from "lucide-react";
import Link from "next/link";
import { Container } from "@/components/shared/Container";
import { legalPublicRoutes, primaryPublicRoutes } from "@/config/routes";
import { siteConfig as fallbackSiteConfig } from "@/config/site";
import { services as fallbackServices } from "@/data/services";
import type { SiteSettings } from "@/lib/cms/public-content";
import type { Service } from "@/types/landing";

type FooterProps = {
  services?: Service[];
  site?: SiteSettings;
};

export function Footer({
  services = fallbackServices,
  site = fallbackSiteConfig
}: FooterProps) {
  return (
    <footer className="border-t border-border bg-primary-dark pb-[calc(7rem+env(safe-area-inset-bottom))] pt-14 text-white sm:py-14">
      <Container className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr]">
        <div>
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-lg font-bold text-primary-dark">
              SI
            </span>
            <div>
              <p className="font-sora font-semibold">{site.name}</p>
              <p className="text-sm text-white/70">{site.slogan}</p>
            </div>
          </div>
          <p className="mt-5 max-w-sm text-sm leading-7 text-white/72">
            {site.description}
          </p>
          <p className="mt-5 text-xs leading-6 text-white/62">
            La información de este sitio es orientativa y no reemplaza una consulta profesional. Cada tratamiento debe definirse mediante evaluación individual.
          </p>
        </div>
        <div>
          <h3 className="font-sora font-semibold">Contacto</h3>
          <div className="mt-4 space-y-3 text-sm text-white/72">
            <p className="flex gap-2"><Phone className="h-4 w-4 shrink-0" /> {site.contact.whatsapp}</p>
            <p className="flex gap-2"><Phone className="h-4 w-4 shrink-0" /> {site.contact.phone}</p>
            <p className="flex gap-2"><Mail className="h-4 w-4 shrink-0" /> {site.contact.email}</p>
            <p className="flex gap-2"><MapPin className="h-4 w-4 shrink-0" /> {site.contact.zone}, {site.contact.city}</p>
          </div>
        </div>
        <div>
          <h3 className="font-sora font-semibold">Links rápidos</h3>
          <div className="mt-4 grid gap-2 text-sm text-white/72">
            {primaryPublicRoutes.map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-white">
                {item.label}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <h3 className="font-sora font-semibold">Servicios</h3>
          <div className="mt-4 grid gap-2 text-sm text-white/72">
            {services.slice(0, 5).map((service) => (
              <Link key={service.slug} href="/servicios" className="hover:text-white">{service.title}</Link>
            ))}
          </div>
          <div className="mt-5 flex gap-3">
            <a href={site.social.facebook} target="_blank" rel="noreferrer" aria-label="Facebook" className="grid h-10 w-10 place-items-center rounded-full bg-white/10 hover:bg-white/18">
              <Facebook className="h-5 w-5" />
            </a>
            <a href={site.social.tiktok} target="_blank" rel="noreferrer" aria-label="TikTok" className="grid h-10 w-10 place-items-center rounded-full bg-white/10 hover:bg-white/18">
              <Instagram className="h-5 w-5" />
            </a>
          </div>
        </div>
      </Container>
      <Container className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-white/58 sm:flex-row sm:items-center sm:justify-between">
        <p>© 2026 Salud Intercultural. Todos los derechos reservados.</p>
        <div className="flex gap-4">
          {legalPublicRoutes.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-white">
              {item.label}
            </Link>
          ))}
        </div>
      </Container>
    </footer>
  );
}
