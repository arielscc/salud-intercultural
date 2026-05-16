import { AboutSection } from "@/components/landing/AboutSection";
import { BenefitsSection } from "@/components/landing/BenefitsSection";
import { ContactSection } from "@/components/landing/ContactSection";
import { FAQSection } from "@/components/landing/FAQSection";
import { FinalCTASection } from "@/components/landing/FinalCTASection";
import { Footer } from "@/components/landing/Footer";
import { Header } from "@/components/landing/Header";
import { HeroSection } from "@/components/landing/HeroSection";
import { ProblemsSection } from "@/components/landing/ProblemsSection";
import { ProcessSection } from "@/components/landing/ProcessSection";
import { ServicesSection } from "@/components/landing/ServicesSection";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";
import { TrustBar } from "@/components/landing/TrustBar";
import { VideoSection } from "@/components/landing/VideoSection";
import { CallFloatingButton } from "@/components/shared/CallFloatingButton";
import { SEOJsonLd } from "@/components/shared/SEOJsonLd";
import { WhatsAppFloatingButton } from "@/components/shared/WhatsAppFloatingButton";

export default function Home() {
  return (
    <>
      <SEOJsonLd />
      <Header />
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
      <Footer />
      <WhatsAppFloatingButton />
      <CallFloatingButton />
    </>
  );
}
