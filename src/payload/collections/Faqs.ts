import type { CollectionConfig } from "payload";
import { publicOrAuthenticatedActiveRead } from "../access.ts";
import { seoFields, statusOrderFields } from "../fields.ts";
import { authenticatedCollectionAccess } from "./Users.ts";

export const Faqs: CollectionConfig = {
  slug: "faqs",
  labels: {
    plural: "Preguntas frecuentes",
    singular: "Pregunta frecuente"
  },
  admin: {
    defaultColumns: ["question", "category", "active", "featured", "order"],
    group: "Contenido V2",
    useAsTitle: "question"
  },
  access: {
    ...authenticatedCollectionAccess,
    read: publicOrAuthenticatedActiveRead
  },
  fields: [
    {
      name: "question",
      type: "text",
      required: true,
      label: "Pregunta"
    },
    {
      name: "answer",
      type: "textarea",
      required: true,
      label: "Respuesta"
    },
    {
      name: "category",
      type: "select",
      defaultValue: "treatments",
      required: true,
      options: [
        { label: "Citas", value: "appointments" },
        { label: "Ubicación", value: "location" },
        { label: "Contacto", value: "contact" },
        { label: "Tratamientos", value: "treatments" },
        { label: "Precios", value: "pricing" }
      ],
      label: "Categoría"
    },
    ...statusOrderFields,
    seoFields
  ]
};
