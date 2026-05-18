import { Footer } from "@/components/landing/Footer";
import { Header } from "@/components/landing/Header";
import { RouteScrollReset } from "@/components/public/RouteScrollReset";
import { CallFloatingButton } from "@/components/shared/CallFloatingButton";
import { WhatsAppFloatingButton } from "@/components/shared/WhatsAppFloatingButton";
import { AnalyticsPageView, AnalyticsScripts, ConversionTracker } from "@/features/analytics";
import { getPublicServices, getSiteSettings } from "@/lib/cms/public-content";

export async function PublicLayout({ children }: { children: React.ReactNode }) {
  const [siteSettings, services] = await Promise.all([
    getSiteSettings(),
    getPublicServices()
  ]);
  const site = siteSettings.data;

  return (
    <>
      <a href="#contenido-principal" className="skip-link">
        Saltar al contenido principal
      </a>
      <AnalyticsScripts />
      <AnalyticsPageView />
      <ConversionTracker />
      <RouteScrollReset />
      <Header site={site} />
      {children}
      <Footer site={site} services={services.data} />
      <WhatsAppFloatingButton phone={site.conversion.whatsappPhone} />
      <CallFloatingButton phone={site.conversion.callPhone} />
    </>
  );
}
