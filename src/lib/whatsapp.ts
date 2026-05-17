import { siteConfig } from "@/config/site";

export type WhatsAppMessageContext = {
  pagePath?: string;
  service?: string;
  topic?: string;
};

const pageMessages: Record<string, string> = {
  "/": "Hola, quiero agendar una valoración en Salud Intercultural.",
  "/servicios": "Hola, quiero información sobre los servicios de Salud Intercultural.",
  "/tratamientos": "Hola, quiero orientación sobre un tratamiento.",
  "/contacto": "Hola, estoy en la página de contacto y quiero coordinar una consulta.",
  "/equipo": "Hola, quiero agendar una consulta con el equipo de Salud Intercultural.",
  "/nosotros": "Hola, quiero conocer más sobre Salud Intercultural.",
  "/preguntas-frecuentes": "Hola, tengo una pregunta sobre la atención de Salud Intercultural.",
  "/testimonios": "Hola, quiero consultar por la atención de Salud Intercultural."
};

function normalizePhoneNumber(phone: string) {
  return phone.replace(/[^\d]/g, "");
}

export function createWhatsAppMessage(context: WhatsAppMessageContext = {}) {
  if (context.service) {
    return `Hola, quiero consultar por ${context.service}.`;
  }

  if (context.topic) {
    return `Hola, quiero consultar por ${context.topic}.`;
  }

  if (context.pagePath && pageMessages[context.pagePath]) {
    return pageMessages[context.pagePath];
  }

  return defaultWhatsAppMessage;
}

export function createWhatsAppLink(
  message: string = defaultWhatsAppMessage,
  phoneNumber: string = siteConfig.conversion.whatsappPhone
) {
  const phone = normalizePhoneNumber(phoneNumber);
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export function createContextualWhatsAppLink(
  context: WhatsAppMessageContext = {},
  phoneNumber?: string
) {
  return createWhatsAppLink(createWhatsAppMessage(context), phoneNumber);
}

export function createCallLink(phone: string = siteConfig.conversion.callPhone) {
  return `tel:${phone.replace(/\s+/g, "")}`;
}

export const defaultWhatsAppMessage =
  siteConfig.conversion.defaultWhatsAppMessage;
