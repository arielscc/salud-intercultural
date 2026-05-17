import { Phone } from "lucide-react";
import { siteConfig } from "@/config/site";
import { createCallLink } from "@/lib/whatsapp";

export function CallFloatingButton() {
  return (
    <a
      href={createCallLink(siteConfig.contact.phone)}
      aria-label="Llamar ahora"
      data-conversion-action="call_click"
      data-conversion-label="floating_call"
      className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-24 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-white shadow-lift ring-8 ring-secondary/10 transition hover:-translate-y-1 sm:bottom-24 sm:right-5"
    >
      <Phone className="h-6 w-6" />
    </a>
  );
}
