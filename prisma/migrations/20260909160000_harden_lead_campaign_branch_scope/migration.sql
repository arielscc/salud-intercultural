-- Tarea 6, etapa de endurecimiento. Esta migración falla de forma deliberada
-- mientras el reconciliador reporte leads o hijos sin una sede verificable.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Lead" WHERE "branchCode" IS NULL) OR
     EXISTS (SELECT 1 FROM "LeadContactAttempt" WHERE "branchCode" IS NULL) OR
     EXISTS (SELECT 1 FROM "LeadReminder" WHERE "branchCode" IS NULL) OR
     EXISTS (SELECT 1 FROM "LeadStatusHistory" WHERE "branchCode" IS NULL) OR
     EXISTS (SELECT 1 FROM "VisitAttribution" WHERE "branchCode" IS NULL) OR
     EXISTS (SELECT 1 FROM "VisitAttributionTouch" WHERE "branchCode" IS NULL) THEN
    RAISE EXCEPTION
      'BRANCH_RECONCILIATION_REQUIRED: run pnpm branch:reconcile:leads and resolve every pending technical ID';
  END IF;
END $$;

ALTER TABLE "Lead" ALTER COLUMN "branchCode" SET NOT NULL;
ALTER TABLE "LeadContactAttempt" ALTER COLUMN "branchCode" SET NOT NULL;
ALTER TABLE "LeadReminder" ALTER COLUMN "branchCode" SET NOT NULL;
ALTER TABLE "LeadStatusHistory" ALTER COLUMN "branchCode" SET NOT NULL;
ALTER TABLE "VisitAttribution" ALTER COLUMN "branchCode" SET NOT NULL;
ALTER TABLE "VisitAttributionTouch" ALTER COLUMN "branchCode" SET NOT NULL;

CREATE UNIQUE INDEX "Visit_id_branchCode_key" ON "Visit"("id", "branchCode");
CREATE UNIQUE INDEX "Lead_id_branchCode_key" ON "Lead"("id", "branchCode");
CREATE UNIQUE INDEX "Lead_branchCode_idempotencyKey_key"
  ON "Lead"("branchCode", "idempotencyKey");
CREATE UNIQUE INDEX "VisitAttribution_id_branchCode_key"
  ON "VisitAttribution"("id", "branchCode");
CREATE UNIQUE INDEX "VisitAttribution_visitId_branchCode_key"
  ON "VisitAttribution"("visitId", "branchCode");

ALTER TABLE "CaptureCampaignBranch"
  ADD CONSTRAINT "CaptureCampaignBranch_campaignId_fkey"
  FOREIGN KEY ("campaignId") REFERENCES "CaptureCampaign"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "CaptureCampaignBranch_branchCode_fkey"
  FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Lead"
  ADD CONSTRAINT "Lead_branchCode_fkey"
  FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "Lead_campaignId_branchCode_fkey"
  FOREIGN KEY ("campaignId", "branchCode")
  REFERENCES "CaptureCampaignBranch"("campaignId", "branchCode")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "LeadContactAttempt"
  DROP CONSTRAINT "LeadContactAttempt_leadId_fkey",
  ADD CONSTRAINT "LeadContactAttempt_branchCode_fkey"
  FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "LeadContactAttempt_leadId_branchCode_fkey"
  FOREIGN KEY ("leadId", "branchCode") REFERENCES "Lead"("id", "branchCode")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LeadReminder"
  DROP CONSTRAINT "LeadReminder_leadId_fkey",
  ADD CONSTRAINT "LeadReminder_branchCode_fkey"
  FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "LeadReminder_leadId_branchCode_fkey"
  FOREIGN KEY ("leadId", "branchCode") REFERENCES "Lead"("id", "branchCode")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LeadStatusHistory"
  DROP CONSTRAINT "LeadStatusHistory_leadId_fkey",
  ADD CONSTRAINT "LeadStatusHistory_branchCode_fkey"
  FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "LeadStatusHistory_leadId_branchCode_fkey"
  FOREIGN KEY ("leadId", "branchCode") REFERENCES "Lead"("id", "branchCode")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VisitAttribution"
  DROP CONSTRAINT "VisitAttribution_visitId_fkey",
  DROP CONSTRAINT "VisitAttribution_campaignId_fkey",
  ADD CONSTRAINT "VisitAttribution_branchCode_fkey"
  FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "VisitAttribution_visitId_branchCode_fkey"
  FOREIGN KEY ("visitId", "branchCode") REFERENCES "Visit"("id", "branchCode")
  ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "VisitAttribution_campaignId_branchCode_fkey"
  FOREIGN KEY ("campaignId", "branchCode")
  REFERENCES "CaptureCampaignBranch"("campaignId", "branchCode")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "VisitAttributionTouch"
  DROP CONSTRAINT "VisitAttributionTouch_attributionId_fkey",
  ADD CONSTRAINT "VisitAttributionTouch_branchCode_fkey"
  FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "VisitAttributionTouch_attributionId_branchCode_fkey"
  FOREIGN KEY ("attributionId", "branchCode")
  REFERENCES "VisitAttribution"("id", "branchCode")
  ON DELETE CASCADE ON UPDATE CASCADE;
