import type { CollectionConfig } from "payload";
import { publicOrAuthenticatedActiveRead } from "../access.ts";
import { imageFields, listTextField, seoFields, slugField, statusOrderFields } from "../fields.ts";
import { authenticatedCollectionAccess } from "./Users.ts";

const iconOptions = [
  "heartPulse",
  "activity",
  "droplets",
  "leaf",
  "sparkles",
  "stethoscope",
  "shieldCheck",
  "messageCircle",
  "apple"
].map((value) => ({ label: value, value }));

export const Services: CollectionConfig = {
  slug: "services",
  labels: {
    plural: "Servicios",
    singular: "Servicio"
  },
  admin: {
    defaultColumns: ["title", "active", "featured", "order", "updatedAt"],
    group: "Contenido V2",
    useAsTitle: "title"
  },
  access: {
    ...authenticatedCollectionAccess,
    read: publicOrAuthenticatedActiveRead
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
      name: "description",
      type: "textarea",
      required: true,
      label: "Descripción"
    },
    ...imageFields,
    {
      name: "icon",
      type: "select",
      options: iconOptions,
      label: "Icono"
    },
    listTextField("benefits", "Beneficios"),
    listTextField("relatedProblems", "Problemas relacionados"),
    {
      name: "whatsappMessage",
      type: "text",
      label: "Mensaje prellenado de WhatsApp"
    },
    ...statusOrderFields,
    seoFields
  ]
};
