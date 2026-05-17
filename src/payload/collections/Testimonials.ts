import type { CollectionConfig } from "payload";
import { publicOrAuthenticatedActiveRead } from "../access.ts";
import { seoFields, slugField, statusOrderFields } from "../fields.ts";
import { authenticatedCollectionAccess } from "./Users.ts";

export const Testimonials: CollectionConfig = {
  slug: "testimonials",
  labels: {
    plural: "Testimonios",
    singular: "Testimonio"
  },
  admin: {
    defaultColumns: ["author", "treatmentType", "active", "featured", "order"],
    group: "Contenido V2",
    useAsTitle: "author"
  },
  access: {
    ...authenticatedCollectionAccess,
    read: publicOrAuthenticatedActiveRead
  },
  fields: [
    slugField,
    {
      name: "author",
      type: "text",
      required: true,
      label: "Autor"
    },
    {
      name: "quote",
      type: "textarea",
      required: true,
      label: "Testimonio"
    },
    {
      name: "treatmentType",
      type: "text",
      required: true,
      label: "Tipo de tratamiento"
    },
    {
      name: "rating",
      type: "number",
      max: 5,
      min: 1,
      label: "Calificación"
    },
    {
      name: "publishedAt",
      type: "date",
      label: "Fecha de publicación"
    },
    {
      name: "privacyNotice",
      type: "textarea",
      label: "Aviso de privacidad"
    },
    ...statusOrderFields,
    seoFields
  ]
};
