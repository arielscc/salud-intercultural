import type { GlobalConfig } from "payload";
import { adminOrEditor } from "../access.ts";
import { seoFields } from "../fields.ts";

export const HomeContent: GlobalConfig = {
  slug: "home-content",
  label: "Contenido de inicio",
  admin: {
    group: "Contenido V2"
  },
  access: {
    read: () => true,
    update: adminOrEditor
  },
  fields: [
    {
      name: "hero",
      type: "group",
      label: "Hero",
      fields: [
        {
          name: "eyebrow",
          type: "array",
          label: "Etiquetas superiores",
          maxRows: 3,
          minRows: 1,
          fields: [
            {
              name: "text",
              type: "text",
              maxLength: 48,
              required: true
            }
          ]
        },
        {
          name: "title",
          type: "text",
          maxLength: 95,
          required: true,
          label: "Título"
        },
        {
          name: "description",
          type: "textarea",
          maxLength: 260,
          required: true,
          label: "Descripción"
        },
        {
          name: "primaryCta",
          type: "group",
          label: "CTA principal",
          fields: [
            { name: "label", type: "text", maxLength: 48, required: true, label: "Texto" },
            {
              name: "message",
              type: "text",
              maxLength: 180,
              required: true,
              label: "Mensaje WhatsApp"
            }
          ]
        },
        {
          name: "secondaryCta",
          type: "group",
          label: "CTA secundario",
          fields: [
            { name: "label", type: "text", maxLength: 40, required: true, label: "Texto" }
          ]
        },
        {
          name: "trustNote",
          type: "text",
          maxLength: 120,
          label: "Nota de confianza"
        }
      ]
    },
    {
      name: "stats",
      type: "array",
      label: "Estadísticas",
      maxRows: 4,
      minRows: 1,
      fields: [
        { name: "value", type: "text", maxLength: 16, required: true, label: "Valor" },
        { name: "label", type: "text", maxLength: 80, required: true, label: "Etiqueta" }
      ]
    },
    {
      name: "featuredServices",
      type: "relationship",
      hasMany: true,
      label: "Servicios destacados en home",
      relationTo: "services"
    },
    {
      name: "featuredVideo",
      type: "group",
      label: "Video destacado",
      fields: [
        { name: "title", type: "text", maxLength: 80, required: true, label: "Título" },
        {
          name: "description",
          type: "textarea",
          maxLength: 220,
          required: true,
          label: "Descripción"
        },
        { name: "ctaLabel", type: "text", maxLength: 40, required: true, label: "CTA" }
      ]
    },
    {
      name: "editableBlocks",
      type: "array",
      label: "Bloques editables",
      maxRows: 6,
      minRows: 1,
      fields: [
        { name: "title", type: "text", maxLength: 70, required: true, label: "Título" },
        {
          name: "description",
          type: "textarea",
          maxLength: 220,
          required: true,
          label: "Descripción"
        }
      ]
    },
    seoFields
  ]
};
