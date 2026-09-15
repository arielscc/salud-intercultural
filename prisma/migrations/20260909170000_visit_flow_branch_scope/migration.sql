-- Tarea 7, etapa estructural: todos los hijos del recorrido heredan la sede
-- inequívoca de su visita o ruta. Las columnas quedan anulables hasta que la
-- etapa de endurecimiento valide el backfill completo.

BEGIN;

ALTER TABLE "VisitDiscontinuation" ADD COLUMN IF NOT EXISTS "branchCode" TEXT;
ALTER TABLE "VisitStatusHistory" ADD COLUMN IF NOT EXISTS "branchCode" TEXT;
ALTER TABLE "ReceptionCheckIn" ADD COLUMN IF NOT EXISTS "branchCode" TEXT;
ALTER TABLE "PatientRoute" ADD COLUMN IF NOT EXISTS "branchCode" TEXT;
ALTER TABLE "PatientRouteStep" ADD COLUMN IF NOT EXISTS "branchCode" TEXT;
ALTER TABLE "VisitAreaTimeEvent" ADD COLUMN IF NOT EXISTS "branchCode" TEXT;
ALTER TABLE "VisitWorkItem" ADD COLUMN IF NOT EXISTS "branchCode" TEXT;

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

-- El historial conserva su prohibición de UPDATE fuera de migraciones. Esta
-- ventana vive dentro de la transacción y se revierte si el backfill falla.
ALTER TABLE "VisitAreaTimeEvent"
  DISABLE TRIGGER "VisitAreaTimeEvent_prevent_update_delete";

UPDATE "VisitAreaTimeEvent" AS child
SET "branchCode" = visit."branchCode"
FROM "Visit" AS visit
WHERE visit."id" = child."visitId";

ALTER TABLE "VisitAreaTimeEvent"
  ENABLE TRIGGER "VisitAreaTimeEvent_prevent_update_delete";

UPDATE "VisitWorkItem" AS child
SET "branchCode" = visit."branchCode"
FROM "Visit" AS visit
WHERE visit."id" = child."visitId";

CREATE INDEX IF NOT EXISTS "VisitDiscontinuation_branchCode_occurredAt_idx"
  ON "VisitDiscontinuation"("branchCode", "occurredAt");
CREATE INDEX IF NOT EXISTS "VisitDiscontinuation_branchCode_reason_occurredAt_idx"
  ON "VisitDiscontinuation"("branchCode", "reason", "occurredAt");
CREATE INDEX IF NOT EXISTS "VisitStatusHistory_branchCode_visitId_createdAt_idx"
  ON "VisitStatusHistory"("branchCode", "visitId", "createdAt");
CREATE INDEX IF NOT EXISTS "ReceptionCheckIn_branchCode_createdAt_idx"
  ON "ReceptionCheckIn"("branchCode", "createdAt");
CREATE INDEX IF NOT EXISTS "PatientRoute_branchCode_active_currentArea_idx"
  ON "PatientRoute"("branchCode", "active", "currentArea");
CREATE INDEX IF NOT EXISTS "PatientRouteStep_branchCode_routeId_startedAt_idx"
  ON "PatientRouteStep"("branchCode", "routeId", "startedAt");
CREATE INDEX IF NOT EXISTS "VisitAreaTimeEvent_branchCode_visitId_occurredAt_idx"
  ON "VisitAreaTimeEvent"("branchCode", "visitId", "occurredAt");
CREATE INDEX IF NOT EXISTS "VisitAreaTimeEvent_branchCode_routeStepId_occurredAt_idx"
  ON "VisitAreaTimeEvent"("branchCode", "routeStepId", "occurredAt");
CREATE INDEX IF NOT EXISTS "VisitWorkItem_branchCode_visitId_idx"
  ON "VisitWorkItem"("branchCode", "visitId");
CREATE INDEX IF NOT EXISTS "VisitWorkItem_branchCode_area_status_createdAt_idx"
  ON "VisitWorkItem"("branchCode", "area", "status", "createdAt");

COMMIT;
