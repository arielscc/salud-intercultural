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
    listSearchableFields: ["title", "summary", "content"],
    pagination: {
      defaultLimit: 10,
      limits: [10, 25, 50]
    },
    useAsTitle: "title"
  },
  access: {
    ...authenticatedCollectionAccess,
    read: publicOrAuthenticatedActiveRead
  },
  defaultSort: "order",
  versions: {
    drafts: true
  },
  fields: [
    slugField,
    {
      name: "title",
      type: "text",
      maxLength: 90,
      required: true,
      label: "Título"
    },
    {
      name: "summary",
      type: "textarea",
      maxLength: 220,
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
          maxLength: 48,
          label: "Eyebrow"
        },
        ...imageFields
      ]
    },
    {
      name: "content",
      type: "textarea",
      maxLength: 1200,
      label: "Contenido"
    },
    ...statusOrderFields,
    seoFields
  ]
};
