-- CreateEnum
CREATE TYPE "VisitDiscontinuationReason" AS ENUM ('wait', 'cost', 'rejection', 'emergency', 'missing_supply', 'referral', 'other');

-- CreateEnum
CREATE TYPE "VisitPendingType" AS ENUM ('consultation', 'study', 'application', 'payment', 'delivery', 'follow_up');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "InternalPermission" ADD VALUE 'visit_discontinuations_read';
ALTER TYPE "InternalPermission" ADD VALUE 'visit_discontinuations_write';

-- CreateTable
CREATE TABLE "VisitDiscontinuation" (
    "id" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "fromStatus" "VisitStatus" NOT NULL,
    "area" "PatientRouteArea" NOT NULL,
    "reason" "VisitDiscontinuationReason" NOT NULL,
    "pendingTypes" "VisitPendingType"[] NOT NULL DEFAULT ARRAY[]::"VisitPendingType"[],
    "note" TEXT,
    "recordedById" TEXT,
    "followUpTaskId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisitDiscontinuation_pkey" PRIMARY KEY ("id")
);

-- Backfill conservador para abandonos registrados antes de la Tarea 16.
-- No inventa pendientes ni motivos que el personal nunca documentó.
INSERT INTO "VisitDiscontinuation" (
    "id",
    "visitId",
    "fromStatus",
    "area",
    "reason",
    "pendingTypes",
    "note",
    "recordedById",
    "occurredAt"
)
SELECT
    'discontinuation-' || MD5(visit."id"),
    visit."id",
    COALESCE(history."fromStatus", 'in_reception'::"VisitStatus"),
    COALESCE(route."currentArea", 'recepcion'::"PatientRouteArea"),
    'other'::"VisitDiscontinuationReason",
    ARRAY[]::"VisitPendingType"[],
    history."note",
    history."userId",
    COALESCE(history."createdAt", visit."updatedAt")
FROM "Visit" AS visit
LEFT JOIN "PatientRoute" AS route ON route."visitId" = visit."id"
LEFT JOIN LATERAL (
    SELECT
        status_history."fromStatus",
        status_history."note",
        status_history."userId",
        status_history."createdAt"
    FROM "VisitStatusHistory" AS status_history
    WHERE status_history."visitId" = visit."id"
      AND status_history."toStatus" = 'left_without_care'
    ORDER BY status_history."createdAt" DESC
    LIMIT 1
) AS history ON TRUE
WHERE visit."status" = 'left_without_care';

-- CreateIndex
CREATE UNIQUE INDEX "VisitDiscontinuation_visitId_key" ON "VisitDiscontinuation"("visitId");

-- CreateIndex
CREATE UNIQUE INDEX "VisitDiscontinuation_followUpTaskId_key" ON "VisitDiscontinuation"("followUpTaskId");

-- CreateIndex
CREATE INDEX "VisitDiscontinuation_reason_occurredAt_idx" ON "VisitDiscontinuation"("reason", "occurredAt");

-- CreateIndex
CREATE INDEX "VisitDiscontinuation_area_occurredAt_idx" ON "VisitDiscontinuation"("area", "occurredAt");

-- CreateIndex
CREATE INDEX "VisitDiscontinuation_recordedById_occurredAt_idx" ON "VisitDiscontinuation"("recordedById", "occurredAt");

-- CreateIndex
CREATE INDEX "VisitDiscontinuation_occurredAt_idx" ON "VisitDiscontinuation"("occurredAt");

-- AddForeignKey
ALTER TABLE "VisitDiscontinuation" ADD CONSTRAINT "VisitDiscontinuation_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitDiscontinuation" ADD CONSTRAINT "VisitDiscontinuation_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "InternalUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitDiscontinuation" ADD CONSTRAINT "VisitDiscontinuation_followUpTaskId_fkey" FOREIGN KEY ("followUpTaskId") REFERENCES "FollowUpTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;
