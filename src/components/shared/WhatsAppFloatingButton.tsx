"use client";

import { MessageCircle } from "lucide-react";
import { usePathname } from "next/navigation";
import { createContextualWhatsAppLink, createWhatsAppMessage } from "@/lib/whatsapp";

type WhatsAppFloatingButtonProps = {
  phone?: string;
};

export function WhatsAppFloatingButton({ phone }: WhatsAppFloatingButtonProps) {
  const pathname = usePathname();
  const message = createWhatsAppMessage({ pagePath: pathname });

  return (
    <a
      href={createContextualWhatsAppLink({ pagePath: pathname }, phone)}
      target="_blank"
      rel="noreferrer"
      aria-label="Escribir por WhatsApp"
      data-conversion-action="whatsapp_click"
      data-conversion-label="floating_whatsapp"
      data-whatsapp-message={message}
      className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full bg-success text-white shadow-lift ring-8 ring-success/10 transition hover:-translate-y-1 hover:bg-primary sm:bottom-5 sm:right-5"
    >
      <MessageCircle className="h-6 w-6" />
    </a>
  );
}
