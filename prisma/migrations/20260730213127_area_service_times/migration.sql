-- CreateEnum
CREATE TYPE "VisitAreaTimeEventType" AS ENUM ('entered', 'attention_started', 'blocked', 'resumed_waiting', 'resumed_attention', 'exited');

-- AlterEnum
ALTER TYPE "InternalPermission" ADD VALUE 'area_time_write';

-- AlterTable
ALTER TABLE "Visit" ADD COLUMN     "isTestData" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "VisitAreaTimeEvent" (
    "id" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "routeStepId" TEXT NOT NULL,
    "area" "PatientRouteArea" NOT NULL,
    "type" "VisitAreaTimeEventType" NOT NULL,
    "reason" TEXT,
    "inferred" BOOLEAN NOT NULL DEFAULT false,
    "recordedById" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisitAreaTimeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VisitAreaTimeEvent_visitId_occurredAt_idx" ON "VisitAreaTimeEvent"("visitId", "occurredAt");

-- CreateIndex
CREATE INDEX "VisitAreaTimeEvent_routeStepId_occurredAt_idx" ON "VisitAreaTimeEvent"("routeStepId", "occurredAt");

-- CreateIndex
CREATE INDEX "VisitAreaTimeEvent_area_occurredAt_idx" ON "VisitAreaTimeEvent"("area", "occurredAt");

-- CreateIndex
CREATE INDEX "VisitAreaTimeEvent_type_occurredAt_idx" ON "VisitAreaTimeEvent"("type", "occurredAt");

-- AddForeignKey
ALTER TABLE "VisitAreaTimeEvent" ADD CONSTRAINT "VisitAreaTimeEvent_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitAreaTimeEvent" ADD CONSTRAINT "VisitAreaTimeEvent_routeStepId_fkey" FOREIGN KEY ("routeStepId") REFERENCES "PatientRouteStep"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitAreaTimeEvent" ADD CONSTRAINT "VisitAreaTimeEvent_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "InternalUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Mark only the reserved staging fixtures as test data. Real visits keep the
-- default false and are never inferred from a vague name.
UPDATE "Visit" AS visit
SET "isTestData" = true
FROM "Patient" AS patient
WHERE visit."patientId" = patient."id"
  AND (
    patient."internalCode" LIKE 'QA-%'
    OR patient."fullName" LIKE '[QA]%'
  );

-- Preserve the route history that already exists. These boundaries are exact,
-- but they cannot tell how much was waiting versus active attention, so they
-- remain explicitly inferred and are excluded from detailed phase statistics.
INSERT INTO "VisitAreaTimeEvent"
  ("id", "visitId", "routeStepId", "area", "type", "inferred", "occurredAt", "createdAt")
SELECT
  step."id" || '_time_entered',
  route."visitId",
  step."id",
  step."area",
  'entered'::"VisitAreaTimeEventType",
  true,
  step."startedAt",
  CURRENT_TIMESTAMP
FROM "PatientRouteStep" AS step
JOIN "PatientRoute" AS route ON route."id" = step."routeId"
WHERE step."area" IN (
  'recepcion'::"PatientRouteArea",
  'medico'::"PatientRouteArea",
  'enfermeria'::"PatientRouteArea",
  'administracion'::"PatientRouteArea"
);

INSERT INTO "VisitAreaTimeEvent"
  ("id", "visitId", "routeStepId", "area", "type", "inferred", "occurredAt", "createdAt")
SELECT
  step."id" || '_time_exited',
  route."visitId",
  step."id",
  step."area",
  'exited'::"VisitAreaTimeEventType",
  true,
  step."endedAt",
  CURRENT_TIMESTAMP
FROM "PatientRouteStep" AS step
JOIN "PatientRoute" AS route ON route."id" = step."routeId"
WHERE step."endedAt" IS NOT NULL
  AND step."area" IN (
    'recepcion'::"PatientRouteArea",
    'medico'::"PatientRouteArea",
    'enfermeria'::"PatientRouteArea",
    'administracion'::"PatientRouteArea"
  );

CREATE UNIQUE INDEX "VisitAreaTimeEvent_one_entered_per_step"
  ON "VisitAreaTimeEvent" ("routeStepId")
  WHERE "type" = 'entered';

CREATE UNIQUE INDEX "VisitAreaTimeEvent_one_exited_per_step"
  ON "VisitAreaTimeEvent" ("routeStepId")
  WHERE "type" = 'exited';

CREATE OR REPLACE FUNCTION prevent_visit_area_time_event_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'VisitAreaTimeEvent is append-only: % is not allowed', TG_OP
    USING ERRCODE = '55000';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "VisitAreaTimeEvent_prevent_update_delete"
BEFORE UPDATE OR DELETE ON "VisitAreaTimeEvent"
FOR EACH ROW
EXECUTE FUNCTION prevent_visit_area_time_event_mutation();
