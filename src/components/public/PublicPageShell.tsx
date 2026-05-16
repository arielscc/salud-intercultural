import { ArrowRight, MessageCircle } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { Container } from "@/components/shared/Container";
import { PremiumCard } from "@/components/shared/PremiumCard";
import { siteConfig } from "@/config/site";
import { createWhatsAppLink } from "@/lib/whatsapp";

type PublicPageShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children?: React.ReactNode;
};

export function PublicPageShell({
  eyebrow,
  title,
  description,
  children
}: PublicPageShellProps) {
  return (
    <main className="pt-20">
      <section className="premium-hero-surface premium-grid py-20 sm:py-24">
        <Container>
          <div className="max-w-4xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary-dark">
              {eyebrow}
            </p>
            <h1 className="text-balance mt-5 font-sora text-4xl font-semibold leading-tight tracking-normal text-text sm:text-5xl">
              {title}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-muted sm:text-lg">
              {description}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                href={createWhatsAppLink(siteConfig.primaryCta.message)}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                {siteConfig.primaryCta.label}
              </Button>
              <Button href="/contacto" variant="secondary">
                Contacto
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </Container>
      </section>

      <section className="py-16 sm:py-20">
        <Container>
          {children ?? (
            <PremiumCard tone="empty">
              <p className="font-sora text-lg font-semibold text-text">
                Sección preparada para contenido administrable.
              </p>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-muted">
                Esta ruta ya forma parte de la estructura institucional V2 y
                quedará conectada al CMS en las siguientes tareas.
              </p>
            </PremiumCard>
          )}
        </Container>
      </section>
    </main>
  );
}
