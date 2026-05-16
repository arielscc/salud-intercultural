import { AboutSection } from "@/components/landing/AboutSection";
import { BenefitsSection } from "@/components/landing/BenefitsSection";
import { ContactSection } from "@/components/landing/ContactSection";
import { FAQSection } from "@/components/landing/FAQSection";
import { FinalCTASection } from "@/components/landing/FinalCTASection";
import { HeroSection } from "@/components/landing/HeroSection";
import { ProblemsSection } from "@/components/landing/ProblemsSection";
import { ProcessSection } from "@/components/landing/ProcessSection";
import { ServicesSection } from "@/components/landing/ServicesSection";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";
import { TrustBar } from "@/components/landing/TrustBar";
import { VideoSection } from "@/components/landing/VideoSection";
import { SEOJsonLd } from "@/components/shared/SEOJsonLd";

export default function Home() {
  return (
    <>
      <SEOJsonLd />
      <main>
        <HeroSection />
        <TrustBar />
        <ProblemsSection />
        <ServicesSection />
        <AboutSection />
        <BenefitsSection />
        <ProcessSection />
        <TestimonialsSection />
        <VideoSection />
        <FAQSection />
        <ContactSection />
        <FinalCTASection />
      </main>
    </>
  );
}
