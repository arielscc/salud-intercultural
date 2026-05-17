import type { Field } from "payload";

export const slugField: Field = {
  name: "slug",
  type: "text",
  required: true,
  unique: true,
  index: true,
  admin: {
    description: "Identificador para URLs y referencias internas."
  }
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
    label: "Imagen"
  },
  {
    name: "imageUrl",
    type: "text",
    label: "URL externa de imagen",
    admin: {
      description: "Fallback temporal para imágenes externas existentes."
    }
  },
  {
    name: "imageAlt",
    type: "text",
    label: "Texto alternativo"
  }
];

export const listTextField = (name: string, label: string): Field => ({
  name,
  type: "array",
  label,
  fields: [
    {
      name: "text",
      type: "text",
      required: true
    }
  ]
});
