import type { CollectionConfig } from "payload";
import { branchScopedAccess, isAdmin } from "../access.ts";
import { prisma } from "@/modules/database";

const contactedStatuses = ["contacted", "scheduled", "closed"] as const;

export const LeadSubmissions: CollectionConfig = {
  slug: "lead-submissions",
  labels: {
    plural: "Leads",
    singular: "Lead"
  },
  admin: {
    components: {
      beforeList: [
        {
          path: "@/payload/admin/LeadListIntro",
          exportName: "LeadListIntro"
        }
      ],
      edit: {
        beforeDocumentControls: [
          {
            path: "@/payload/admin/LeadDetailActions",
            exportName: "LeadDetailActions"
          }
        ]
      }
    },
    defaultColumns: ["name", "phone", "source", "status", "contactedAt", "createdAt"],
    group: "Comercial",
    listSearchableFields: ["name", "phone", "email"],
    pagination: {
      defaultLimit: 10,
      limits: [10, 25, 50]
    },
    useAsTitle: "phone"
  },
  access: {
    create: isAdmin,
    delete: isAdmin,
    read: branchScopedAccess,
    update: branchScopedAccess
  },
  defaultSort: "-createdAt",
  fields: [
    {
      name: "branchCode",
      type: "text",
      required: true,
      index: true,
      label: "Sucursal",
      admin: { readOnly: true }
    },
    {
      name: "idempotencyKey",
      type: "text",
      required: true,
      unique: true,
      index: true,
      admin: { hidden: true }
    },
    {
      name: "deduplicationKey",
      type: "text",
      required: true,
      index: true,
      admin: { hidden: true }
    },
    {
      name: "name",
      type: "text",
      label: "Nombre"
    },
    {
      name: "phone",
      type: "text",
      required: true,
      label: "Teléfono"
    },
    {
      name: "email",
      type: "email",
      label: "Email"
    },
    {
      name: "interest",
      type: "text",
      label: "Motivo de consulta"
    },
    {
      name: "message",
      type: "textarea",
      label: "Mensaje"
    },
    {
      name: "source",
      type: "select",
      defaultValue: "website",
      options: [
        { label: "Sitio web", value: "website" },
        { label: "WhatsApp", value: "whatsapp" },
        { label: "Facebook", value: "facebook" },
        { label: "TikTok", value: "tiktok" },
        { label: "Google", value: "google" },
        { label: "Llamada", value: "call" }
      ],
      label: "Fuente"
    },
    {
      name: "status",
      type: "select",
      defaultValue: "new",
      options: [
        { label: "Nuevo", value: "new" },
        { label: "Contactado", value: "contacted" },
        { label: "Agendado", value: "scheduled" },
        { label: "Cerrado", value: "closed" },
        { label: "Perdido", value: "lost" }
      ],
      label: "Estado"
    },
    {
      name: "pagePath",
      type: "text",
      label: "Página de origen"
    },
    {
      name: "campaignCode",
      type: "text",
      label: "Código de campaña",
      admin: {
        description:
          "Se completa automáticamente desde un enlace o formulario identificado."
      }
    },
    {
      name: "attributedAccount",
      type: "text",
      label: "Cuenta atribuida",
      admin: {
        readOnly: true
      }
    },
    {
      name: "attributionTrafficType",
      type: "select",
      label: "Tipo de tráfico",
      defaultValue: "unidentified",
      options: [
        { label: "No identificado", value: "unidentified" },
        { label: "Orgánico", value: "organic" },
        { label: "Publicidad pagada", value: "paid" }
      ],
      admin: {
        readOnly: true
      }
    },
    {
      name: "utmSource",
      type: "text",
      label: "UTM source",
      admin: { readOnly: true }
    },
    {
      name: "utmMedium",
      type: "text",
      label: "UTM medium",
      admin: { readOnly: true }
    },
    {
      name: "utmCampaign",
      type: "text",
      label: "UTM campaign",
      admin: { readOnly: true }
    },
    {
      name: "notes",
      type: "textarea",
      label: "Notas internas"
    },
    {
      name: "contactedAt",
      type: "date",
      label: "Fecha de contacto"
    }
  ],
  hooks: {
    beforeChange: [
      async ({ data, originalDoc, operation, req }) => {
        if (
          operation === "update" &&
          originalDoc?.branchCode &&
          data.branchCode &&
          data.branchCode !== originalDoc.branchCode
        ) {
          throw new Error("LEAD_BRANCH_IMMUTABLE");
        }
        const branchCode =
          typeof data.branchCode === "string"
            ? data.branchCode
            : originalDoc?.branchCode;
        const branch = branchCode
          ? await prisma.clinicBranch.findFirst({
              where: { code: branchCode, status: "active" },
              select: { code: true }
            })
          : null;
        if (!branch) throw new Error("LEAD_BRANCH_NOT_CONFIGURED");
        const campaignCode = data.campaignCode ?? originalDoc?.campaignCode;
        if (campaignCode) {
          const campaign = await req.payload.find({
            collection: "marketing-campaigns",
            limit: 1,
            overrideAccess: true,
            where: {
              and: [
                { code: { equals: campaignCode } },
                { "branchAssignments.branchCode": { equals: branch.code } }
              ]
            }
          });
          if (!campaign.docs[0]) throw new Error("LEAD_CAMPAIGN_NOT_ASSIGNED_TO_BRANCH");
        }
        if (
          operation === "update" &&
          contactedStatuses.includes(data.status) &&
          data.status !== originalDoc?.status
        ) {
          return {
            ...data,
            contactedAt: new Date().toISOString()
          };
        }

        return data;
      }
    ]
  }
};
