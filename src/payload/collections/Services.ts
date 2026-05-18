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
  "mapPin",
  "messageCircle",
  "phone",
  "users",
  "calendarCheck",
  "handHeart",
  "brain",
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
    listSearchableFields: ["title", "description", "whatsappMessage"],
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
      name: "description",
      type: "textarea",
      maxLength: 260,
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
      maxLength: 180,
      label: "Mensaje prellenado de WhatsApp"
    },
    ...statusOrderFields,
    seoFields
  ]
};
