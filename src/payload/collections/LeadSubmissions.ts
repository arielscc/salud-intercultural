import type { CollectionConfig } from "payload";
import { adminOrEditor, isAdmin } from "../access.ts";

export const LeadSubmissions: CollectionConfig = {
  slug: "lead-submissions",
  labels: {
    plural: "Leads",
    singular: "Lead"
  },
  admin: {
    defaultColumns: ["name", "phone", "source", "status", "createdAt"],
    group: "Comercial",
    useAsTitle: "phone"
  },
  access: {
    create: adminOrEditor,
    delete: isAdmin,
    read: adminOrEditor,
    update: adminOrEditor
  },
  fields: [
    {
      name: "name",
      type: "text",
      label: "Nombre"
    },
    {
      name: "phone",
      type: "text",
      required: true,
      label: "Teléfono"
    },
    {
      name: "email",
      type: "email",
      label: "Email"
    },
    {
      name: "interest",
      type: "text",
      label: "Motivo de consulta"
    },
    {
      name: "message",
      type: "textarea",
      label: "Mensaje"
    },
    {
      name: "source",
      type: "select",
      defaultValue: "website",
      options: [
        { label: "Sitio web", value: "website" },
        { label: "WhatsApp", value: "whatsapp" },
        { label: "Facebook", value: "facebook" },
        { label: "TikTok", value: "tiktok" },
        { label: "Google", value: "google" },
        { label: "Llamada", value: "call" }
      ],
      label: "Fuente"
    },
    {
      name: "status",
      type: "select",
      defaultValue: "new",
      options: [
        { label: "Nuevo", value: "new" },
        { label: "Contactado", value: "contacted" },
        { label: "Agendado", value: "scheduled" },
        { label: "Cerrado", value: "closed" },
        { label: "Perdido", value: "lost" }
      ],
      label: "Estado"
    },
    {
      name: "pagePath",
      type: "text",
      label: "Página de origen"
    },
    {
      name: "notes",
      type: "textarea",
      label: "Notas internas"
    },
    {
      name: "contactedAt",
      type: "date",
      label: "Fecha de contacto"
    }
  ]
};
