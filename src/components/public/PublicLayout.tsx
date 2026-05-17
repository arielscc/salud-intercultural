import { Footer } from "@/components/landing/Footer";
import { Header } from "@/components/landing/Header";
import { CallFloatingButton } from "@/components/shared/CallFloatingButton";
import { ConversionTracker } from "@/components/shared/ConversionTracker";
import { WhatsAppFloatingButton } from "@/components/shared/WhatsAppFloatingButton";

export function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ConversionTracker />
      <Header />
      {children}
      <Footer />
      <WhatsAppFloatingButton />
      <CallFloatingButton />
    </>
  );
}
