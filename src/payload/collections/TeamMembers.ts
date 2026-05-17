import type { CollectionConfig } from "payload";
import { publicOrAuthenticatedActiveRead } from "../access.ts";
import { imageFields, listTextField, seoFields, slugField, statusOrderFields } from "../fields.ts";
import { authenticatedCollectionAccess } from "./Users.ts";

export const TeamMembers: CollectionConfig = {
  slug: "team-members",
  labels: {
    plural: "Equipo",
    singular: "Integrante"
  },
  admin: {
    defaultColumns: ["name", "role", "active", "featured", "order"],
    group: "Contenido V2",
    listSearchableFields: ["name", "role", "specialty", "description"],
    pagination: {
      defaultLimit: 10,
      limits: [10, 25, 50]
    },
    useAsTitle: "name"
  },
  access: {
    ...authenticatedCollectionAccess,
    read: publicOrAuthenticatedActiveRead
  },
  defaultSort: "order",
  fields: [
    slugField,
    {
      name: "name",
      type: "text",
      maxLength: 90,
      required: true,
      label: "Nombre"
    },
    ...imageFields,
    {
      name: "role",
      type: "text",
      maxLength: 80,
      required: true,
      label: "Cargo"
    },
    {
      name: "specialty",
      type: "text",
      maxLength: 100,
      required: true,
      label: "Especialidad"
    },
    {
      name: "description",
      type: "textarea",
      maxLength: 360,
      required: true,
      label: "Descripción"
    },
    listTextField("credentials", "Credenciales"),
    listTextField("focusAreas", "Áreas de enfoque"),
    ...statusOrderFields,
    seoFields
  ]
};
