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
    listSearchableFields: ["question", "answer"],
    pagination: {
      defaultLimit: 10,
      limits: [10, 25, 50]
    },
    useAsTitle: "question"
  },
  access: {
    ...authenticatedCollectionAccess,
    read: publicOrAuthenticatedActiveRead
  },
  defaultSort: "order",
  fields: [
    {
      name: "question",
      type: "text",
      maxLength: 120,
      required: true,
      label: "Pregunta"
    },
    {
      name: "answer",
      type: "textarea",
      maxLength: 360,
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
