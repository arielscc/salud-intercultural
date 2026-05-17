import type { GlobalConfig } from "payload";
import { adminOrEditor } from "../access.ts";
import { seoFields } from "../fields.ts";

export const SiteSettings: GlobalConfig = {
  slug: "site-settings",
  label: "Configuración global",
  admin: {
    group: "Configuración"
  },
  access: {
    read: () => true,
    update: adminOrEditor
  },
  fields: [
    {
      name: "brand",
      type: "group",
      label: "Marca",
      fields: [
        { name: "name", type: "text", maxLength: 70, required: true, label: "Nombre" },
        { name: "legalName", type: "text", maxLength: 120, label: "Razón social" },
        { name: "slogan", type: "text", maxLength: 80, label: "Slogan" },
        { name: "description", type: "textarea", maxLength: 220, label: "Descripción" }
      ]
    },
    {
      name: "contact",
      type: "group",
      label: "Contacto",
      fields: [
        { name: "whatsapp", type: "text", maxLength: 24, required: true, label: "WhatsApp" },
        { name: "phone", type: "text", maxLength: 24, required: true, label: "Teléfono" },
        { name: "email", type: "email", label: "Email" },
        { name: "address", type: "text", maxLength: 140, label: "Dirección" },
        { name: "zone", type: "text", maxLength: 80, label: "Zona" },
        { name: "city", type: "text", maxLength: 80, label: "Ciudad" },
        { name: "schedule", type: "text", maxLength: 80, label: "Horario" },
        { name: "mapsUrl", type: "text", label: "URL Google Maps" }
      ]
    },
    {
      name: "conversion",
      type: "group",
      label: "Conversión",
      fields: [
        {
          name: "defaultWhatsAppMessage",
          type: "text",
          maxLength: 180,
          label: "Mensaje WhatsApp por defecto"
        },
        {
          name: "afterLeadWhatsAppMessage",
          type: "text",
          maxLength: 180,
          label: "Mensaje WhatsApp después de enviar lead"
        }
      ]
    },
    {
      name: "social",
      type: "group",
      label: "Redes sociales",
      fields: [
        { name: "facebook", type: "text", label: "Facebook" },
        { name: "tiktok", type: "text", label: "TikTok" }
      ]
    },
    seoFields
  ]
};
