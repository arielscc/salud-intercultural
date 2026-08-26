-- Tarea 27: Payload conserva la campaña editable. Prisma mantiene únicamente
-- una copia técnica para relacionarla con llegadas y conservar la historia.
ALTER TABLE "CaptureCampaign"
  ADD COLUMN "payloadCampaignId" TEXT,
  ADD COLUMN "payloadUpdatedAt" TIMESTAMP(3),
  ADD COLUMN "syncedAt" TIMESTAMP(3),
  ADD COLUMN "managedByPayload" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX "CaptureCampaign_payloadCampaignId_key"
ON "CaptureCampaign"("payloadCampaignId");
