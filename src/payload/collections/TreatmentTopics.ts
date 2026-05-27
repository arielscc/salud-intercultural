import type { CollectionConfig } from "payload";
import { publicOrAuthenticatedActiveRead } from "../access.ts";
import { seoFields, slugField, statusOrderFields } from "../fields.ts";
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

export const TreatmentTopics: CollectionConfig = {
  slug: "treatment-topics",
  labels: {
    plural: "Problemas frecuentes",
    singular: "Problema frecuente"
  },
  admin: {
    defaultColumns: ["title", "active", "featured", "order", "updatedAt"],
    group: "Contenido V2",
    listSearchableFields: ["title", "headline", "description", "whatsappMessage"],
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
      name: "headline",
      type: "text",
      maxLength: 120,
      required: true,
      label: "Titular"
    },
    {
      name: "description",
      type: "textarea",
      maxLength: 260,
      required: true,
      label: "Descripción"
    },
    {
      name: "cta",
      type: "text",
      maxLength: 90,
      required: true,
      label: "Texto del botón"
    },
    {
      name: "whatsappMessage",
      type: "text",
      maxLength: 180,
      required: true,
      label: "Mensaje prellenado de WhatsApp"
    },
    {
      name: "icon",
      type: "select",
      options: iconOptions,
      required: true,
      label: "Icono"
    },
    ...statusOrderFields,
    seoFields
  ]
};
