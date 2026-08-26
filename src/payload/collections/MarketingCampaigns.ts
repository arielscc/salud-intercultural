import type { CollectionConfig } from "payload";
import { normalizeCampaignCode } from "@/features/attribution/catalog";
import {
  deactivatePayloadCampaignInSigeco,
  syncPayloadCampaignToSigeco
} from "@/modules/payload-sigeco/campaign-sync";
import { adminOrEditor } from "../access.ts";
import { authenticatedCollectionAccess } from "./Users.ts";

export const MarketingCampaigns: CollectionConfig = {
  slug: "marketing-campaigns",
  labels: {
    plural: "Campañas",
    singular: "Campaña"
  },
  admin: {
    defaultColumns: ["name", "code", "sourceCode", "trafficType", "active", "updatedAt"],
    group: "Comercial",
    listSearchableFields: ["name", "code", "accountLabel", "accountHandle"],
    useAsTitle: "name"
  },
  access: {
    ...authenticatedCollectionAccess,
    read: adminOrEditor
  },
  defaultSort: "-updatedAt",
  fields: [
    {
      name: "code",
      type: "text",
      required: true,
      unique: true,
      maxLength: 80,
      label: "Código",
      admin: {
        description: "Identificador estable usado en enlaces, por ejemplo TIKTOK-DR."
      }
    },
    {
      name: "name",
      type: "text",
      required: true,
      maxLength: 140,
      label: "Nombre"
    },
    {
      name: "sourceCode",
      type: "select",
      required: true,
      label: "Fuente",
      options: [
        { label: "Facebook", value: "facebook" },
        { label: "TikTok", value: "tiktok" },
        { label: "WhatsApp", value: "whatsapp" },
        { label: "Referido", value: "referral" },
        { label: "Paciente anterior", value: "previous_patient" },
        { label: "Volante", value: "flyer" },
        { label: "Sitio web", value: "website" },
        { label: "Google", value: "google" },
        { label: "Llamada", value: "call" },
        { label: "Otro", value: "other" }
      ]
    },
    {
      name: "accountLabel",
      type: "text",
      maxLength: 120,
      label: "Cuenta identificada"
    },
    {
      name: "accountHandle",
      type: "text",
      maxLength: 120,
      label: "Usuario o cuenta"
    },
    {
      name: "trafficType",
      type: "select",
      required: true,
      defaultValue: "unidentified",
      label: "Tipo de tráfico",
      options: [
        { label: "No identificado", value: "unidentified" },
        { label: "Orgánico", value: "organic" },
        { label: "Publicidad pagada", value: "paid" }
      ]
    },
    {
      name: "startsAt",
      type: "date",
      label: "Inicio"
    },
    {
      name: "endsAt",
      type: "date",
      label: "Final"
    },
    {
      name: "active",
      type: "checkbox",
      defaultValue: true,
      required: true,
      label: "Activa"
    }
  ],
  hooks: {
    beforeValidate: [
      ({ data, operation, originalDoc }) => {
        if (operation === "update" && originalDoc?.code) {
          return { ...data, code: originalDoc.code };
        }
        return data?.code
          ? { ...data, code: normalizeCampaignCode(String(data.code)) }
          : data;
      }
    ],
    afterChange: [
      async ({ doc, req }) => {
        await syncPayloadCampaignToSigeco({
          externalId: doc.id,
          revision: doc.updatedAt,
          code: doc.code,
          name: doc.name,
          sourceCode: doc.sourceCode,
          accountLabel: doc.accountLabel,
          accountHandle: doc.accountHandle,
          trafficType: doc.trafficType,
          active: doc.active,
          startsAt: doc.startsAt,
          endsAt: doc.endsAt
        }).catch(() => {
          req.payload.logger.warn(
            "La campaña se guardó en Payload, pero su copia técnica de SIGECO quedó pendiente."
          );
        });
        return doc;
      }
    ],
    afterDelete: [
      async ({ doc, req }) => {
        await deactivatePayloadCampaignInSigeco(String(doc.id)).catch(() => {
          req.payload.logger.warn(
            "La campaña se eliminó en Payload, pero SIGECO aún debe desactivarla."
          );
        });
        return doc;
      }
    ]
  }
};
