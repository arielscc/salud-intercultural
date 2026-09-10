-- Tarea 6, etapa estructural: materializa la sede sin inventar ownership.
-- Las columnas quedan temporalmente anulables para ejecutar el reconciliador
-- antes del endurecimiento 20260909160000.

ALTER TABLE "Lead"
  ADD COLUMN "branchCode" TEXT,
  ADD COLUMN "campaignId" TEXT,
  ADD COLUMN "idempotencyKey" TEXT,
  ADD COLUMN "deduplicationKey" TEXT;

ALTER TABLE "LeadContactAttempt" ADD COLUMN "branchCode" TEXT;
ALTER TABLE "LeadReminder" ADD COLUMN "branchCode" TEXT;
ALTER TABLE "LeadStatusHistory" ADD COLUMN "branchCode" TEXT;
ALTER TABLE "VisitAttribution" ADD COLUMN "branchCode" TEXT;
ALTER TABLE "VisitAttributionTouch" ADD COLUMN "branchCode" TEXT;

CREATE TABLE "CaptureCampaignBranch" (
  "campaignId" TEXT NOT NULL,
  "branchCode" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CaptureCampaignBranch_pkey" PRIMARY KEY ("campaignId", "branchCode")
);

-- Una atribución de visita tiene una evidencia inequívoca: la propia visita.
UPDATE "VisitAttribution" AS attribution
SET "branchCode" = visit."branchCode"
FROM "Visit" AS visit
WHERE visit."id" = attribution."visitId";

UPDATE "VisitAttributionTouch" AS touch
SET "branchCode" = attribution."branchCode"
FROM "VisitAttribution" AS attribution
WHERE attribution."id" = touch."attributionId";

-- Un lead histórico solo se deriva automáticamente cuando todas las relaciones
-- operativas disponibles (seguimientos o expediente convertido) coinciden en
-- exactamente una sede. Cero o varias sedes permanecen pendientes.
WITH evidence AS (
  SELECT task."leadId", task."branchCode"
  FROM "FollowUpTask" AS task
  WHERE task."leadId" IS NOT NULL
  UNION
  SELECT lead."id", record."branchCode"
  FROM "Lead" AS lead
  JOIN "PatientBranchRecord" AS record
    ON record."patientId" = lead."convertedPatientId"
  WHERE lead."convertedPatientId" IS NOT NULL
), resolved AS (
  SELECT "leadId", MIN("branchCode") AS "branchCode"
  FROM evidence
  GROUP BY "leadId"
  HAVING COUNT(DISTINCT "branchCode") = 1
)
UPDATE "Lead" AS lead
SET "branchCode" = resolved."branchCode"
FROM resolved
WHERE resolved."leadId" = lead."id";

UPDATE "LeadContactAttempt" AS child
SET "branchCode" = lead."branchCode"
FROM "Lead" AS lead
WHERE lead."id" = child."leadId";

UPDATE "LeadReminder" AS child
SET "branchCode" = lead."branchCode"
FROM "Lead" AS lead
WHERE lead."id" = child."leadId";

UPDATE "LeadStatusHistory" AS child
SET "branchCode" = lead."branchCode"
FROM "Lead" AS lead
WHERE lead."id" = child."leadId";

-- Los resultados históricos solo habilitan la campaña en la sede donde
-- realmente ocurrió la visita. Una campaña sin evidencia no recibe sede por
-- defecto y deberá asignarse explícitamente desde Payload/reconciliación.
INSERT INTO "CaptureCampaignBranch" (
  "campaignId", "branchCode", "active", "assignedAt", "updatedAt"
)
SELECT DISTINCT
  attribution."campaignId",
  attribution."branchCode",
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "VisitAttribution" AS attribution
WHERE attribution."campaignId" IS NOT NULL
  AND attribution."branchCode" IS NOT NULL
ON CONFLICT ("campaignId", "branchCode") DO NOTHING;

CREATE INDEX "Lead_branchCode_createdAt_idx"
  ON "Lead"("branchCode", "createdAt");
CREATE INDEX "Lead_branchCode_phone_idx"
  ON "Lead"("branchCode", "phone");
CREATE INDEX "Lead_branchCode_deduplicationKey_createdAt_idx"
  ON "Lead"("branchCode", "deduplicationKey", "createdAt");
CREATE INDEX "Lead_branchCode_status_createdAt_idx"
  ON "Lead"("branchCode", "status", "createdAt");
CREATE INDEX "Lead_branchCode_source_idx"
  ON "Lead"("branchCode", "source");
CREATE INDEX "Lead_branchCode_assignedToId_idx"
  ON "Lead"("branchCode", "assignedToId");
CREATE INDEX "Lead_branchCode_campaignId_createdAt_idx"
  ON "Lead"("branchCode", "campaignId", "createdAt");
CREATE INDEX "LeadContactAttempt_branchCode_leadId_idx"
  ON "LeadContactAttempt"("branchCode", "leadId");
CREATE INDEX "LeadReminder_branchCode_leadId_idx"
  ON "LeadReminder"("branchCode", "leadId");
CREATE INDEX "LeadStatusHistory_branchCode_leadId_idx"
  ON "LeadStatusHistory"("branchCode", "leadId");
CREATE INDEX "CaptureCampaignBranch_branchCode_active_updatedAt_idx"
  ON "CaptureCampaignBranch"("branchCode", "active", "updatedAt");
CREATE INDEX "VisitAttribution_branchCode_patientId_createdAt_idx"
  ON "VisitAttribution"("branchCode", "patientId", "createdAt");
CREATE INDEX "VisitAttribution_branchCode_campaignId_createdAt_idx"
  ON "VisitAttribution"("branchCode", "campaignId", "createdAt");
CREATE INDEX "VisitAttribution_branchCode_evidenceKind_createdAt_idx"
  ON "VisitAttribution"("branchCode", "evidenceKind", "createdAt");
CREATE INDEX "VisitAttributionTouch_branchCode_sourceId_role_createdAt_idx"
  ON "VisitAttributionTouch"("branchCode", "sourceId", "role", "createdAt");
CREATE INDEX "VisitAttributionTouch_branchCode_campaignCode_createdAt_idx"
  ON "VisitAttributionTouch"("branchCode", "campaignCode", "createdAt");
