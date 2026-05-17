import type { CollectionConfig } from "payload";
import { adminOrEditor, isAdmin, isAuthenticated } from "../access.ts";

const adminSessionSeconds = Number(process.env.ADMIN_SESSION_SECONDS ?? 60 * 60 * 8);
const adminLockMinutes = Number(process.env.ADMIN_LOCK_MINUTES ?? 10);

export const Users: CollectionConfig = {
  slug: "users",
  auth: {
    cookies: {
      sameSite: "Lax",
      secure: process.env.NODE_ENV === "production"
    },
    lockTime: adminLockMinutes * 60 * 1000,
    maxLoginAttempts: 5,
    tokenExpiration: Number.isFinite(adminSessionSeconds)
      ? adminSessionSeconds
      : 60 * 60 * 8,
    useSessions: true
  },
  admin: {
    group: "Administración",
    useAsTitle: "email"
  },
  access: {
    create: isAdmin,
    delete: isAdmin,
    read: isAuthenticated,
    update: isAdmin
  },
  fields: [
    {
      name: "role",
      type: "select",
      defaultValue: "editor",
      required: true,
      options: [
        { label: "Administrador", value: "admin" },
        { label: "Editor", value: "editor" }
      ]
    },
    {
      name: "name",
      type: "text",
      label: "Nombre"
    }
  ],
  hooks: {
    beforeChange: [
      async ({ data, operation, req }) => {
        if (operation === "create" && !data.role) {
          const users = await req.payload.count({
            collection: "users",
            overrideAccess: true
          });

          return {
            ...data,
            role: users.totalDocs === 0 ? "admin" : "editor"
          };
        }

        return data;
      }
    ]
  }
};

export const authenticatedCollectionAccess = {
  create: adminOrEditor,
  delete: isAdmin,
  update: adminOrEditor
};
