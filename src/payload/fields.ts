import type { Field } from "payload";

export const slugField: Field = {
  name: "slug",
  type: "text",
  required: true,
  unique: true,
  index: true,
  admin: {
    description: "Identificador para URLs y referencias internas."
  },
  maxLength: 90
};

export const statusOrderFields: Field[] = [
  {
    name: "active",
    type: "checkbox",
    defaultValue: true,
    index: true,
    label: "Activo"
  },
  {
    name: "featured",
    type: "checkbox",
    defaultValue: false,
    index: true,
    label: "Destacado"
  },
  {
    name: "order",
    type: "number",
    defaultValue: 0,
    index: true,
    min: 0,
    label: "Orden"
  }
];

export const seoFields: Field = {
  name: "seo",
  type: "group",
  label: "SEO",
  fields: [
    {
      name: "title",
      type: "text",
      maxLength: 70,
      label: "Título SEO"
    },
    {
      name: "description",
      type: "textarea",
      maxLength: 170,
      label: "Descripción SEO"
    },
    {
      name: "keywords",
      type: "array",
      label: "Palabras clave",
      fields: [
        {
          name: "keyword",
          type: "text",
          required: true
        }
      ]
    }
  ]
};

export const imageFields: Field[] = [
  {
    name: "image",
    type: "relationship",
    relationTo: "media",
    label: "Imagen CMS",
    admin: {
      description: "Prioridad visual recomendada. Payload genera miniatura, card, retrato y hero."
    }
  },
  {
    name: "imageUrl",
    type: "text",
    maxLength: 500,
    label: "URL externa de imagen",
    admin: {
      description: "Fallback temporal para imágenes externas existentes."
    }
  },
  {
    name: "imageAlt",
    type: "text",
    admin: {
      description: "Obligatorio aunque exista imagen CMS; se usa como fallback accesible del contenido."
    },
    maxLength: 140,
    required: true,
    label: "Texto alternativo"
  }
];

export const listTextField = (name: string, label: string): Field => ({
  name,
  type: "array",
  label,
  minRows: 1,
  fields: [
    {
      name: "text",
      type: "text",
      maxLength: 140,
      required: true
    }
  ]
});
