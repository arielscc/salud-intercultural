import { Phone } from "lucide-react";
import { siteConfig } from "@/config/site";

export function CallFloatingButton() {
  return (
    <a
      href={`tel:${siteConfig.contact.phone}`}
      aria-label="Llamar ahora"
      className="fixed bottom-5 left-5 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-white shadow-lift ring-8 ring-secondary/10 transition hover:-translate-y-1 sm:hidden"
    >
      <Phone className="h-6 w-6" />
    </a>
  );
}
