import { MessageCircle } from "lucide-react";
import { siteConfig } from "@/config/site";
import { createWhatsAppLink } from "@/lib/whatsapp";

export function WhatsAppFloatingButton() {
  return (
    <a
      href={createWhatsAppLink(siteConfig.primaryCta.message)}
      target="_blank"
      rel="noreferrer"
      aria-label="Escribir por WhatsApp"
      className="fixed bottom-5 right-5 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full bg-success text-white shadow-lift ring-8 ring-success/10 transition hover:-translate-y-1 hover:bg-primary"
    >
      <MessageCircle className="h-6 w-6" />
    </a>
  );
}
