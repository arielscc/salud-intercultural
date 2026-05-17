import type { CollectionConfig } from "payload";
import { adminOrEditor, isAdmin } from "../access.ts";

const contactedStatuses = ["contacted", "scheduled", "closed"] as const;

export const LeadSubmissions: CollectionConfig = {
  slug: "lead-submissions",
  labels: {
    plural: "Leads",
    singular: "Lead"
  },
  admin: {
    components: {
      beforeList: [
        {
          path: "@/payload/admin/LeadListIntro",
          exportName: "LeadListIntro"
        }
      ],
      edit: {
        beforeDocumentControls: [
          {
            path: "@/payload/admin/LeadDetailActions",
            exportName: "LeadDetailActions"
          }
        ]
      }
    },
    defaultColumns: ["name", "phone", "source", "status", "contactedAt", "createdAt"],
    group: "Comercial",
    listSearchableFields: ["name", "phone", "email"],
    pagination: {
      defaultLimit: 10,
      limits: [10, 25, 50]
    },
    useAsTitle: "phone"
  },
  access: {
    create: adminOrEditor,
    delete: isAdmin,
    read: adminOrEditor,
    update: adminOrEditor
  },
  defaultSort: "-createdAt",
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
  ],
  hooks: {
    beforeChange: [
      ({ data, originalDoc, operation }) => {
        if (
          operation === "update" &&
          contactedStatuses.includes(data.status) &&
          data.status !== originalDoc?.status
        ) {
          return {
            ...data,
            contactedAt: new Date().toISOString()
          };
        }

        return data;
      }
    ]
  }
};
