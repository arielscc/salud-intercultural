import type { CollectionConfig } from "payload";
import { publicOrAuthenticatedActiveRead } from "../access.ts";
import { imageFields, seoFields, slugField, statusOrderFields } from "../fields.ts";
import { authenticatedCollectionAccess } from "./Users.ts";

export const Pages: CollectionConfig = {
  slug: "pages",
  labels: {
    plural: "Páginas",
    singular: "Página"
  },
  admin: {
    defaultColumns: ["title", "slug", "active", "updatedAt"],
    group: "Contenido V2",
    useAsTitle: "title"
  },
  access: {
    ...authenticatedCollectionAccess,
    read: publicOrAuthenticatedActiveRead
  },
  versions: {
    drafts: true
  },
  fields: [
    slugField,
    {
      name: "title",
      type: "text",
      required: true,
      label: "Título"
    },
    {
      name: "summary",
      type: "textarea",
      label: "Resumen"
    },
    {
      name: "hero",
      type: "group",
      label: "Hero",
      fields: [
        {
          name: "eyebrow",
          type: "text",
          label: "Eyebrow"
        },
        ...imageFields
      ]
    },
    {
      name: "content",
      type: "textarea",
      label: "Contenido"
    },
    ...statusOrderFields,
    seoFields
  ]
};
