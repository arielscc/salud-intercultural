-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "ClinicBranchStatus" AS ENUM ('active', 'preparation', 'inactive');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "InventoryMovementType" ADD VALUE IF NOT EXISTS 'transfer_out';
ALTER TYPE "InventoryMovementType" ADD VALUE IF NOT EXISTS 'transfer_in';

-- AlterTable
ALTER TABLE "CashMovement" ADD COLUMN IF NOT EXISTS "branchCode" TEXT NOT NULL DEFAULT 'el-alto';

-- AlterTable
ALTER TABLE "InventoryAdjustment" ADD COLUMN IF NOT EXISTS "branchCode" TEXT NOT NULL DEFAULT 'el-alto';

-- AlterTable
ALTER TABLE "InventoryMovement" ALTER COLUMN "branchCode" SET DEFAULT 'el-alto';

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "branchCode" TEXT NOT NULL DEFAULT 'el-alto';

-- AlterTable
ALTER TABLE "PurchasePayment" ADD COLUMN IF NOT EXISTS "branchCode" TEXT NOT NULL DEFAULT 'el-alto';

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "branchCode" TEXT NOT NULL DEFAULT 'el-alto';

-- CreateTable
CREATE TABLE IF NOT EXISTS "ClinicBranch" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "status" "ClinicBranchStatus" NOT NULL DEFAULT 'preparation',
    "openedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicBranch_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "InternalUserBranch" (
    "userId" TEXT NOT NULL,
    "branchCode" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InternalUserBranch_pkey" PRIMARY KEY ("userId","branchCode")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "BranchInventoryBalance" (
    "itemId" TEXT NOT NULL,
    "branchCode" TEXT NOT NULL,
    "currentStock" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BranchInventoryBalance_pkey" PRIMARY KEY ("itemId","branchCode")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "InventoryTransfer" (
    "id" TEXT NOT NULL,
    "transferNumber" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "sourceBranchCode" TEXT NOT NULL,
    "destinationBranchCode" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "sourceMovementId" TEXT NOT NULL,
    "destinationMovementId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryTransfer_pkey" PRIMARY KEY ("id")
);

-- Seed de sedes. Cochabamba queda configurada, pero no habilitada para operar.
INSERT INTO "ClinicBranch" (
    "code", "name", "city", "department", "status", "openedAt", "updatedAt"
) VALUES
    ('el-alto', 'El Alto', 'El Alto', 'La Paz', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('cochabamba', 'Cochabamba', 'Cochabamba', 'Cochabamba', 'preparation', NULL, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;

-- Todo usuario existente conserva El Alto como sede predeterminada. Las nuevas
-- asignaciones se administran explícitamente y no duplican la cuenta.
INSERT INTO "InternalUserBranch" ("userId", "branchCode", "isDefault")
SELECT "id", 'el-alto', true FROM "InternalUser"
ON CONFLICT ("userId", "branchCode") DO NOTHING;

-- Backfill por la relación más cercana. La operación actual era de una sola
-- sede, por lo que cualquier registro histórico sin relación queda en El Alto.
UPDATE "Sale" AS s
SET "branchCode" = COALESCE(v."branchCode", 'el-alto')
FROM "Visit" AS v
WHERE s."visitId" = v."id";

UPDATE "Payment" AS p
SET "branchCode" = s."branchCode"
FROM "Sale" AS s
WHERE p."saleId" = s."id";

UPDATE "CashMovement" AS m
SET "branchCode" = COALESCE(
    (SELECT cs."branchCode" FROM "CashSession" AS cs WHERE cs."id" = m."cashSessionId"),
    (SELECT s."branchCode" FROM "Sale" AS s WHERE s."id" = m."saleId"),
    (SELECT v."branchCode" FROM "Visit" AS v WHERE v."id" = m."visitId"),
    'el-alto'
);

UPDATE "PurchasePayment" AS pp
SET "branchCode" = p."branchCode"
FROM "Purchase" AS p
WHERE pp."purchaseId" = p."id";

-- La evidencia sigue siendo append-only para la aplicación. El trigger se
-- suspende solo dentro de esta migración controlada para completar el dato
-- obligatorio de sucursal en filas históricas y se restablece enseguida.
DROP TRIGGER IF EXISTS "InventoryMovement_append_only" ON "InventoryMovement";

UPDATE "InventoryMovement" AS m
SET "branchCode" = COALESCE(
    (SELECT l."branchCode" FROM "InventoryLot" AS l WHERE l."id" = m."lotId"),
    (SELECT p."branchCode" FROM "Purchase" AS p WHERE p."id" = m."purchaseId"),
    (SELECT s."branchCode" FROM "Sale" AS s WHERE s."id" = m."saleId"),
    'el-alto'
);

UPDATE "InventoryMovement" SET "branchCode" = 'el-alto' WHERE "branchCode" IS NULL;
ALTER TABLE "InventoryMovement" ALTER COLUMN "branchCode" SET NOT NULL;

CREATE TRIGGER "InventoryMovement_append_only"
BEFORE UPDATE OR DELETE ON "InventoryMovement"
FOR EACH ROW EXECUTE FUNCTION "prevent_purchase_evidence_mutation"();

-- Se crea un saldo independiente por producto y sede. El stock histórico
-- pertenece a El Alto; Cochabamba inicia en cero.
INSERT INTO "BranchInventoryBalance" ("itemId", "branchCode", "currentStock", "updatedAt")
SELECT i."id", b."code",
       CASE WHEN b."code" = 'el-alto' THEN i."currentStock" ELSE 0 END,
       CURRENT_TIMESTAMP
FROM "InventoryItem" AS i
CROSS JOIN "ClinicBranch" AS b
ON CONFLICT ("itemId", "branchCode") DO NOTHING;

ALTER TABLE "InventoryTransfer"
  ADD CONSTRAINT "InventoryTransfer_positive_quantity_check" CHECK ("quantity" > 0),
  ADD CONSTRAINT "InventoryTransfer_distinct_branches_check" CHECK ("sourceBranchCode" <> "destinationBranchCode");

-- CreateIndex
CREATE INDEX "ClinicBranch_status_name_idx" ON "ClinicBranch"("status", "name");

-- CreateIndex
CREATE INDEX "InternalUserBranch_branchCode_userId_idx" ON "InternalUserBranch"("branchCode", "userId");

-- CreateIndex
CREATE INDEX "InternalUserBranch_userId_isDefault_idx" ON "InternalUserBranch"("userId", "isDefault");

CREATE UNIQUE INDEX "InternalUserBranch_one_default_per_user_key"
ON "InternalUserBranch"("userId") WHERE "isDefault" = true;

-- CreateIndex
CREATE INDEX "BranchInventoryBalance_branchCode_currentStock_idx" ON "BranchInventoryBalance"("branchCode", "currentStock");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryTransfer_transferNumber_key" ON "InventoryTransfer"("transferNumber");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryTransfer_sourceMovementId_key" ON "InventoryTransfer"("sourceMovementId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryTransfer_destinationMovementId_key" ON "InventoryTransfer"("destinationMovementId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryTransfer_idempotencyKey_key" ON "InventoryTransfer"("idempotencyKey");

-- CreateIndex
CREATE INDEX "InventoryTransfer_sourceBranchCode_createdAt_idx" ON "InventoryTransfer"("sourceBranchCode", "createdAt");

-- CreateIndex
CREATE INDEX "InventoryTransfer_destinationBranchCode_createdAt_idx" ON "InventoryTransfer"("destinationBranchCode", "createdAt");

-- CreateIndex
CREATE INDEX "InventoryTransfer_itemId_createdAt_idx" ON "InventoryTransfer"("itemId", "createdAt");

-- CreateIndex
CREATE INDEX "CashMovement_branchCode_occurredAt_idx" ON "CashMovement"("branchCode", "occurredAt");

-- CreateIndex
CREATE INDEX "InventoryAdjustment_branchCode_createdAt_idx" ON "InventoryAdjustment"("branchCode", "createdAt");

-- CreateIndex
CREATE INDEX "InventoryMovement_branchCode_createdAt_idx" ON "InventoryMovement"("branchCode", "createdAt");

-- CreateIndex
CREATE INDEX "Payment_branchCode_paidAt_idx" ON "Payment"("branchCode", "paidAt");

-- CreateIndex
CREATE INDEX "PurchasePayment_branchCode_paidAt_idx" ON "PurchasePayment"("branchCode", "paidAt");

-- CreateIndex
CREATE INDEX "Sale_branchCode_createdAt_idx" ON "Sale"("branchCode", "createdAt");

-- AddForeignKey
ALTER TABLE "InternalUserBranch" ADD CONSTRAINT "InternalUserBranch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "InternalUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalUserBranch" ADD CONSTRAINT "InternalUserBranch_branchCode_fkey" FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_branchCode_fkey" FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_branchCode_fkey" FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_branchCode_fkey" FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_branchCode_fkey" FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashSession" ADD CONSTRAINT "CashSession_branchCode_fkey" FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BranchInventoryBalance" ADD CONSTRAINT "BranchInventoryBalance_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BranchInventoryBalance" ADD CONSTRAINT "BranchInventoryBalance_branchCode_fkey" FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_branchCode_fkey" FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchasePayment" ADD CONSTRAINT "PurchasePayment_branchCode_fkey" FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseReceipt" ADD CONSTRAINT "PurchaseReceipt_branchCode_fkey" FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLot" ADD CONSTRAINT "InventoryLot_branchCode_fkey" FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_branchCode_fkey" FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryAdjustment" ADD CONSTRAINT "InventoryAdjustment_branchCode_fkey" FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransfer" ADD CONSTRAINT "InventoryTransfer_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransfer" ADD CONSTRAINT "InventoryTransfer_sourceBranchCode_fkey" FOREIGN KEY ("sourceBranchCode") REFERENCES "ClinicBranch"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransfer" ADD CONSTRAINT "InventoryTransfer_destinationBranchCode_fkey" FOREIGN KEY ("destinationBranchCode") REFERENCES "ClinicBranch"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransfer" ADD CONSTRAINT "InventoryTransfer_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "InternalUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransfer" ADD CONSTRAINT "InventoryTransfer_sourceMovementId_fkey" FOREIGN KEY ("sourceMovementId") REFERENCES "InventoryMovement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransfer" ADD CONSTRAINT "InventoryTransfer_destinationMovementId_fkey" FOREIGN KEY ("destinationMovementId") REFERENCES "InventoryMovement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
