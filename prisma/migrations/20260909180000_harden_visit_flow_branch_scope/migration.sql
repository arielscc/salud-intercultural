-- Tarea 7, etapa de endurecimiento. Falla antes de crear constraints si algún
-- hijo no pudo derivarse o si un evento enlaza una visita y un paso de rutas
-- diferentes.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "VisitDiscontinuation" WHERE "branchCode" IS NULL) OR
     EXISTS (SELECT 1 FROM "VisitStatusHistory" WHERE "branchCode" IS NULL) OR
     EXISTS (SELECT 1 FROM "ReceptionCheckIn" WHERE "branchCode" IS NULL) OR
     EXISTS (SELECT 1 FROM "PatientRoute" WHERE "branchCode" IS NULL) OR
     EXISTS (SELECT 1 FROM "PatientRouteStep" WHERE "branchCode" IS NULL) OR
     EXISTS (SELECT 1 FROM "VisitAreaTimeEvent" WHERE "branchCode" IS NULL) OR
     EXISTS (SELECT 1 FROM "VisitWorkItem" WHERE "branchCode" IS NULL) THEN
    RAISE EXCEPTION 'VISIT_FLOW_BRANCH_BACKFILL_INCOMPLETE';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "VisitAreaTimeEvent" AS event
    JOIN "PatientRouteStep" AS step ON step."id" = event."routeStepId"
    JOIN "PatientRoute" AS route ON route."id" = step."routeId"
    WHERE event."visitId" <> route."visitId"
       OR event."branchCode" <> step."branchCode"
  ) THEN
    RAISE EXCEPTION 'VISIT_AREA_EVENT_ROUTE_MISMATCH_REQUIRES_RECONCILIATION';
  END IF;
END $$;

ALTER TABLE "VisitDiscontinuation" ALTER COLUMN "branchCode" SET NOT NULL;
ALTER TABLE "VisitStatusHistory" ALTER COLUMN "branchCode" SET NOT NULL;
ALTER TABLE "ReceptionCheckIn" ALTER COLUMN "branchCode" SET NOT NULL;
ALTER TABLE "PatientRoute" ALTER COLUMN "branchCode" SET NOT NULL;
ALTER TABLE "PatientRouteStep" ALTER COLUMN "branchCode" SET NOT NULL;
ALTER TABLE "VisitAreaTimeEvent" ALTER COLUMN "branchCode" SET NOT NULL;
ALTER TABLE "VisitWorkItem" ALTER COLUMN "branchCode" SET NOT NULL;

DROP INDEX "Visit_idempotencyKey_key";
CREATE UNIQUE INDEX "Visit_branchCode_idempotencyKey_key"
  ON "Visit"("branchCode", "idempotencyKey");
CREATE UNIQUE INDEX "VisitDiscontinuation_visitId_branchCode_key"
  ON "VisitDiscontinuation"("visitId", "branchCode");
CREATE UNIQUE INDEX "ReceptionCheckIn_visitId_branchCode_key"
  ON "ReceptionCheckIn"("visitId", "branchCode");
CREATE UNIQUE INDEX "PatientRoute_id_branchCode_key"
  ON "PatientRoute"("id", "branchCode");
CREATE UNIQUE INDEX "PatientRoute_visitId_branchCode_key"
  ON "PatientRoute"("visitId", "branchCode");
CREATE UNIQUE INDEX "PatientRouteStep_id_branchCode_key"
  ON "PatientRouteStep"("id", "branchCode");
CREATE UNIQUE INDEX "VisitWorkItem_id_branchCode_key"
  ON "VisitWorkItem"("id", "branchCode");

ALTER TABLE "VisitDiscontinuation"
  DROP CONSTRAINT "VisitDiscontinuation_visitId_fkey",
  ADD CONSTRAINT "VisitDiscontinuation_branchCode_fkey"
  FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "VisitDiscontinuation_visitId_branchCode_fkey"
  FOREIGN KEY ("visitId", "branchCode") REFERENCES "Visit"("id", "branchCode")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "VisitStatusHistory"
  DROP CONSTRAINT "VisitStatusHistory_visitId_fkey",
  ADD CONSTRAINT "VisitStatusHistory_branchCode_fkey"
  FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "VisitStatusHistory_visitId_branchCode_fkey"
  FOREIGN KEY ("visitId", "branchCode") REFERENCES "Visit"("id", "branchCode")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReceptionCheckIn"
  DROP CONSTRAINT "ReceptionCheckIn_visitId_fkey",
  ADD CONSTRAINT "ReceptionCheckIn_branchCode_fkey"
  FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ReceptionCheckIn_visitId_branchCode_fkey"
  FOREIGN KEY ("visitId", "branchCode") REFERENCES "Visit"("id", "branchCode")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PatientRoute"
  DROP CONSTRAINT "PatientRoute_visitId_fkey",
  ADD CONSTRAINT "PatientRoute_branchCode_fkey"
  FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "PatientRoute_visitId_branchCode_fkey"
  FOREIGN KEY ("visitId", "branchCode") REFERENCES "Visit"("id", "branchCode")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PatientRouteStep"
  DROP CONSTRAINT "PatientRouteStep_routeId_fkey",
  ADD CONSTRAINT "PatientRouteStep_branchCode_fkey"
  FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "PatientRouteStep_routeId_branchCode_fkey"
  FOREIGN KEY ("routeId", "branchCode") REFERENCES "PatientRoute"("id", "branchCode")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VisitAreaTimeEvent"
  DROP CONSTRAINT "VisitAreaTimeEvent_visitId_fkey",
  DROP CONSTRAINT "VisitAreaTimeEvent_routeStepId_fkey",
  ADD CONSTRAINT "VisitAreaTimeEvent_branchCode_fkey"
  FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "VisitAreaTimeEvent_visitId_branchCode_fkey"
  FOREIGN KEY ("visitId", "branchCode") REFERENCES "Visit"("id", "branchCode")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "VisitAreaTimeEvent_routeStepId_branchCode_fkey"
  FOREIGN KEY ("routeStepId", "branchCode")
  REFERENCES "PatientRouteStep"("id", "branchCode")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "VisitWorkItem"
  DROP CONSTRAINT "VisitWorkItem_visitId_fkey",
  ADD CONSTRAINT "VisitWorkItem_branchCode_fkey"
  FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "VisitWorkItem_visitId_branchCode_fkey"
  FOREIGN KEY ("visitId", "branchCode") REFERENCES "Visit"("id", "branchCode")
  ON DELETE CASCADE ON UPDATE CASCADE;
