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
    useAsTitle: "name"
  },
  access: {
    ...authenticatedCollectionAccess,
    read: publicOrAuthenticatedActiveRead
  },
  fields: [
    slugField,
    {
      name: "name",
      type: "text",
      required: true,
      label: "Nombre"
    },
    ...imageFields,
    {
      name: "role",
      type: "text",
      required: true,
      label: "Cargo"
    },
    {
      name: "specialty",
      type: "text",
      required: true,
      label: "Especialidad"
    },
    {
      name: "description",
      type: "textarea",
      required: true,
      label: "Descripción"
    },
    listTextField("credentials", "Credenciales"),
    listTextField("focusAreas", "Áreas de enfoque"),
    ...statusOrderFields,
    seoFields
  ]
};
