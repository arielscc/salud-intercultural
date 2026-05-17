import type { CollectionConfig } from "payload";
import { adminOrEditor } from "../access.ts";

export const Media: CollectionConfig = {
  slug: "media",
  admin: {
    group: "Contenido",
    useAsTitle: "alt"
  },
  access: {
    create: adminOrEditor,
    delete: adminOrEditor,
    read: () => true,
    update: adminOrEditor
  },
  upload: {
    staticDir: "public/media",
    mimeTypes: ["image/*"]
  },
  fields: [
    {
      name: "alt",
      type: "text",
      required: true,
      label: "Texto alternativo"
    },
    {
      name: "caption",
      type: "text",
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
