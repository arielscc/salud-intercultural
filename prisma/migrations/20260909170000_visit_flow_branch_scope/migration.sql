-- Tarea 7, etapa estructural: todos los hijos del recorrido heredan la sede
-- inequívoca de su visita o ruta. Las columnas quedan anulables hasta que la
-- etapa de endurecimiento valide el backfill completo.

ALTER TABLE "VisitDiscontinuation" ADD COLUMN "branchCode" TEXT;
ALTER TABLE "VisitStatusHistory" ADD COLUMN "branchCode" TEXT;
ALTER TABLE "ReceptionCheckIn" ADD COLUMN "branchCode" TEXT;
ALTER TABLE "PatientRoute" ADD COLUMN "branchCode" TEXT;
ALTER TABLE "PatientRouteStep" ADD COLUMN "branchCode" TEXT;
ALTER TABLE "VisitAreaTimeEvent" ADD COLUMN "branchCode" TEXT;
ALTER TABLE "VisitWorkItem" ADD COLUMN "branchCode" TEXT;

UPDATE "VisitDiscontinuation" AS child
SET "branchCode" = visit."branchCode"
FROM "Visit" AS visit
WHERE visit."id" = child."visitId";

UPDATE "VisitStatusHistory" AS child
SET "branchCode" = visit."branchCode"
FROM "Visit" AS visit
WHERE visit."id" = child."visitId";

UPDATE "ReceptionCheckIn" AS child
SET "branchCode" = visit."branchCode"
FROM "Visit" AS visit
WHERE visit."id" = child."visitId";

UPDATE "PatientRoute" AS child
SET "branchCode" = visit."branchCode"
FROM "Visit" AS visit
WHERE visit."id" = child."visitId";

UPDATE "PatientRouteStep" AS child
SET "branchCode" = route."branchCode"
FROM "PatientRoute" AS route
WHERE route."id" = child."routeId";

UPDATE "VisitAreaTimeEvent" AS child
SET "branchCode" = visit."branchCode"
FROM "Visit" AS visit
WHERE visit."id" = child."visitId";

UPDATE "VisitWorkItem" AS child
SET "branchCode" = visit."branchCode"
FROM "Visit" AS visit
WHERE visit."id" = child."visitId";

CREATE INDEX "VisitDiscontinuation_branchCode_occurredAt_idx"
  ON "VisitDiscontinuation"("branchCode", "occurredAt");
CREATE INDEX "VisitDiscontinuation_branchCode_reason_occurredAt_idx"
  ON "VisitDiscontinuation"("branchCode", "reason", "occurredAt");
CREATE INDEX "VisitStatusHistory_branchCode_visitId_createdAt_idx"
  ON "VisitStatusHistory"("branchCode", "visitId", "createdAt");
CREATE INDEX "ReceptionCheckIn_branchCode_createdAt_idx"
  ON "ReceptionCheckIn"("branchCode", "createdAt");
CREATE INDEX "PatientRoute_branchCode_active_currentArea_idx"
  ON "PatientRoute"("branchCode", "active", "currentArea");
CREATE INDEX "PatientRouteStep_branchCode_routeId_startedAt_idx"
  ON "PatientRouteStep"("branchCode", "routeId", "startedAt");
CREATE INDEX "VisitAreaTimeEvent_branchCode_visitId_occurredAt_idx"
  ON "VisitAreaTimeEvent"("branchCode", "visitId", "occurredAt");
CREATE INDEX "VisitAreaTimeEvent_branchCode_routeStepId_occurredAt_idx"
  ON "VisitAreaTimeEvent"("branchCode", "routeStepId", "occurredAt");
CREATE INDEX "VisitWorkItem_branchCode_visitId_idx"
  ON "VisitWorkItem"("branchCode", "visitId");
CREATE INDEX "VisitWorkItem_branchCode_area_status_createdAt_idx"
  ON "VisitWorkItem"("branchCode", "area", "status", "createdAt");
