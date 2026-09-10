import type { CollectionConfig } from "payload";
import { adminOrEditor, isAdmin, isAuthenticated } from "../access.ts";
import { prisma } from "@/modules/database";

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
    },
    {
      name: "payloadBranch",
      type: "text",
      index: true,
      label: "Sucursal operativa",
      admin: {
        description:
          "Obligatoria para editores. Debe coincidir con el código de ClinicBranch."
      }
    }
  ],
  hooks: {
    beforeChange: [
      async ({ data, operation, originalDoc, req }) => {
        let nextData = data;
        if (operation === "create" && !data.role) {
          const users = await req.payload.count({
            collection: "users",
            overrideAccess: true
          });

          nextData = {
            ...data,
            role: users.totalDocs === 0 ? "admin" : "editor"
          };
        }

        const nextRole = nextData.role ?? originalDoc?.role;
        const nextBranchCode = (
          nextData.payloadBranch ?? originalDoc?.payloadBranch
        )?.trim();
        if (nextRole === "editor" && !nextBranchCode) {
          throw new Error("PAYLOAD_EDITOR_BRANCH_REQUIRED");
        }
        if (nextRole === "editor" && nextBranchCode) {
          const branch = await prisma.clinicBranch.findFirst({
            where: { code: nextBranchCode, status: "active" },
            select: { code: true }
          });
          if (!branch) throw new Error("PAYLOAD_EDITOR_BRANCH_NOT_CONFIGURED");
        }
        if (nextData.payloadBranch) {
          return { ...nextData, payloadBranch: nextBranchCode };
        }

        return nextData;
      }
    ]
  }
};

export const authenticatedCollectionAccess = {
  create: adminOrEditor,
  delete: isAdmin,
  update: adminOrEditor
};
