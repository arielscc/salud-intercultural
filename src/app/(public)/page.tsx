import { AboutSection } from "@/components/landing/AboutSection";
import { BenefitsSection } from "@/components/landing/BenefitsSection";
import { ContactSection } from "@/components/landing/ContactSection";
import { FAQSection } from "@/components/landing/FAQSection";
import { FinalCTASection } from "@/components/landing/FinalCTASection";
import { HomeEditableBlocksSection } from "@/components/landing/HomeEditableBlocksSection";
import { HomeStatsSection } from "@/components/landing/HomeStatsSection";
import { HeroSection } from "@/components/landing/HeroSection";
import { ProblemsSection } from "@/components/landing/ProblemsSection";
import { ProcessSection } from "@/components/landing/ProcessSection";
import { ServicesSection } from "@/components/landing/ServicesSection";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";
import { TrustBar } from "@/components/landing/TrustBar";
import { VideoSection } from "@/components/landing/VideoSection";
import { SEOJsonLd } from "@/components/shared/SEOJsonLd";
import {
  getFeaturedFaqs,
  getFeaturedTestimonials,
  getPublicFaqs,
  getPublicHomeContent,
  getPublicPageMetadata,
  getPublicServices,
  getPublicTestimonials
} from "@/lib/cms/public-content";

export const revalidate = 60;

export async function generateMetadata() {
  return getPublicPageMetadata("home", {
    title: "Clínica de Medicina Natural y Tradicional en El Alto | Salud Intercultural",
    description:
      "Salud Intercultural es una clínica de medicina natural, tradicional e integrativa en El Alto. Atención personalizada, terapias complementarias y orientación integral.",
    path: "/"
  });
}

export default async function Home() {
  const [home, services, testimonials, faqs] = await Promise.all([
    getPublicHomeContent(),
    getPublicServices(),
    getPublicTestimonials(),
    getPublicFaqs()
  ]);

  const homeData = home.data;

  return (
    <>
      <SEOJsonLd
        breadcrumbs={[{ name: "Inicio", path: "/" }]}
        services={services.data}
        faqs={faqs.data}
      />
      <main>
        <HeroSection content={homeData} />
        <TrustBar />
        <HomeStatsSection content={homeData} />
        <ProblemsSection />
        <ServicesSection content={homeData} services={services.data} />
        <AboutSection />
        <BenefitsSection />
        <HomeEditableBlocksSection content={homeData} />
        <ProcessSection />
        <TestimonialsSection testimonials={getFeaturedTestimonials(testimonials.data)} />
        <VideoSection content={homeData} />
        <FAQSection faqs={getFeaturedFaqs(faqs.data)} />
        <ContactSection />
        <FinalCTASection />
      </main>
    </>
  );
}
