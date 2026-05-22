import type { CollectionConfig } from "payload";
import { adminOrEditor } from "../access.ts";

export const Media: CollectionConfig = {
  slug: "media",
  admin: {
    defaultColumns: ["alt", "caption", "updatedAt"],
    group: "Contenido",
    listSearchableFields: ["alt", "caption"],
    pagination: {
      defaultLimit: 25,
      limits: [10, 25, 50]
    },
    useAsTitle: "alt"
  },
  access: {
    create: adminOrEditor,
    delete: adminOrEditor,
    read: () => true,
    update: adminOrEditor
  },
  upload: {
    adminThumbnail: "thumbnail",
    focalPoint: true,
    imageSizes: [
      {
        name: "thumbnail",
        width: 320,
        height: 240
      },
      {
        name: "card",
        width: 900,
        height: 600
      },
      {
        name: "portrait",
        width: 720,
        height: 900
      },
      {
        name: "hero",
        width: 1600,
        height: 1200
      }
    ],
    staticDir: "public/media",
    mimeTypes: ["image/*", "video/*"]
  },
  fields: [
    {
      name: "alt",
      type: "text",
      admin: {
        description: "Obligatorio para accesibilidad y SEO. Describe la imagen o video sin repetir el titulo."
      },
      maxLength: 140,
      required: true,
      label: "Texto alternativo"
    },
    {
      name: "caption",
      type: "text",
      maxLength: 160,
      label: "Leyenda"
    },
    {
      name: "internalNotes",
      type: "textarea",
      access: {
        read: ({ req }) => Boolean(req.user)
      },
      label: "Notas internas"
    }
  ]
};
