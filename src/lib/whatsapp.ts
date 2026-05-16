import { clinic } from "@/data/clinic";

export function createWhatsAppLink(message: string) {
  const phone = clinic.whatsapp.replace("+", "");
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export const defaultWhatsAppMessage =
  "Hola, quiero información sobre los tratamientos de Salud Intercultural.";
