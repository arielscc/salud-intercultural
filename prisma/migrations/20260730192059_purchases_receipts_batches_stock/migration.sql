/*
  Warnings:

  - A unique constraint covering the columns `[receiptLineId]` on the table `InventoryMovement` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[lotAdjustmentId]` on the table `InventoryMovement` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "PurchaseStatus" AS ENUM ('draft', 'confirmed', 'partially_received', 'received', 'cancelled');

-- CreateEnum
CREATE TYPE "PurchasePaymentMethod" AS ENUM ('cash', 'transfer', 'credit', 'other');

-- CreateEnum
CREATE TYPE "InventoryLotAdjustmentKind" AS ENUM ('damage', 'waste', 'expired', 'supplier_return', 'patient_return', 'correction');

-- CreateEnum
CREATE TYPE "PurchaseDocumentKind" AS ENUM ('purchase', 'receipt');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "InternalPermission" ADD VALUE 'purchases_read';
ALTER TYPE "InternalPermission" ADD VALUE 'purchases_write';
ALTER TYPE "InternalPermission" ADD VALUE 'purchase_receipts_write';
ALTER TYPE "InternalPermission" ADD VALUE 'inventory_lot_adjust';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "InventoryMovementType" ADD VALUE 'purchase_receipt';
ALTER TYPE "InventoryMovementType" ADD VALUE 'lot_adjustment';
ALTER TYPE "InventoryMovementType" ADD VALUE 'supplier_return';
ALTER TYPE "InventoryMovementType" ADD VALUE 'patient_return';

-- AlterTable
ALTER TABLE "InventoryMovement" ADD COLUMN     "branchCode" TEXT,
ADD COLUMN     "locationCode" TEXT,
ADD COLUMN     "lotAdjustmentId" TEXT,
ADD COLUMN     "lotId" TEXT,
ADD COLUMN     "purchaseId" TEXT,
ADD COLUMN     "purchaseLineId" TEXT,
ADD COLUMN     "receiptId" TEXT,
ADD COLUMN     "receiptLineId" TEXT;

-- CreateTable
CREATE TABLE "Purchase" (
    "id" TEXT NOT NULL,
    "purchaseNumber" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "sourceCashExpenseId" TEXT,
    "createdById" TEXT NOT NULL,
    "confirmedById" TEXT,
    "cancelledById" TEXT,
    "branchCode" TEXT NOT NULL,
    "purchaseDate" DATE NOT NULL,
    "documentNumber" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'BOB',
    "status" "PurchaseStatus" NOT NULL DEFAULT 'draft',
    "intendedPaymentMethod" "PurchasePaymentMethod" NOT NULL DEFAULT 'credit',
    "totalCents" INTEGER NOT NULL,
    "notes" TEXT,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "idempotencyKey" TEXT NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseLine" (
    "id" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "orderedQuantity" INTEGER NOT NULL,
    "receivedQuantity" INTEGER NOT NULL DEFAULT 0,
    "unitCostCents" INTEGER NOT NULL,
    "subtotalCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchasePayment" (
    "id" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "cashSessionId" TEXT,
    "cashMovementId" TEXT,
    "recordedById" TEXT NOT NULL,
    "method" "PurchasePaymentMethod" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "reference" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchasePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseReceipt" (
    "id" TEXT NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "recordedById" TEXT NOT NULL,
    "receivedById" TEXT NOT NULL,
    "branchCode" TEXT NOT NULL,
    "locationCode" TEXT NOT NULL,
    "documentNumber" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseReceiptLine" (
    "id" TEXT NOT NULL,
    "receiptId" TEXT NOT NULL,
    "purchaseLineId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitCostCents" INTEGER NOT NULL,
    "subtotalCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseReceiptLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryLot" (
    "id" TEXT NOT NULL,
    "internalLotCode" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "purchaseLineId" TEXT NOT NULL,
    "receiptId" TEXT NOT NULL,
    "batchNumber" TEXT,
    "expirationDate" DATE,
    "branchCode" TEXT NOT NULL,
    "locationCode" TEXT NOT NULL,
    "receivedQuantity" INTEGER NOT NULL,
    "currentQuantity" INTEGER NOT NULL,
    "unitCostCents" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryLot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryLotAdjustment" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "recordedById" TEXT NOT NULL,
    "authorizedById" TEXT NOT NULL,
    "kind" "InventoryLotAdjustmentKind" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "stockDelta" INTEGER NOT NULL,
    "restocked" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryLotAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseDocument" (
    "id" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "receiptId" TEXT,
    "uploadedById" TEXT NOT NULL,
    "kind" "PurchaseDocumentKind" NOT NULL,
    "storageKey" TEXT NOT NULL,
    "storageDriver" "ClinicalAttachmentStorageDriver" NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "checksumSha256" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Purchase_purchaseNumber_key" ON "Purchase"("purchaseNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Purchase_sourceCashExpenseId_key" ON "Purchase"("sourceCashExpenseId");

-- CreateIndex
CREATE UNIQUE INDEX "Purchase_idempotencyKey_key" ON "Purchase"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Purchase_supplierId_purchaseDate_idx" ON "Purchase"("supplierId", "purchaseDate");

-- CreateIndex
CREATE INDEX "Purchase_status_purchaseDate_idx" ON "Purchase"("status", "purchaseDate");

-- CreateIndex
CREATE INDEX "Purchase_branchCode_purchaseDate_idx" ON "Purchase"("branchCode", "purchaseDate");

-- CreateIndex
CREATE INDEX "Purchase_createdById_idx" ON "Purchase"("createdById");

-- CreateIndex
CREATE INDEX "PurchaseLine_purchaseId_idx" ON "PurchaseLine"("purchaseId");

-- CreateIndex
CREATE INDEX "PurchaseLine_itemId_idx" ON "PurchaseLine"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchasePayment_cashMovementId_key" ON "PurchasePayment"("cashMovementId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchasePayment_idempotencyKey_key" ON "PurchasePayment"("idempotencyKey");

-- CreateIndex
CREATE INDEX "PurchasePayment_purchaseId_paidAt_idx" ON "PurchasePayment"("purchaseId", "paidAt");

-- CreateIndex
CREATE INDEX "PurchasePayment_cashSessionId_idx" ON "PurchasePayment"("cashSessionId");

-- CreateIndex
CREATE INDEX "PurchasePayment_recordedById_idx" ON "PurchasePayment"("recordedById");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseReceipt_receiptNumber_key" ON "PurchaseReceipt"("receiptNumber");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseReceipt_idempotencyKey_key" ON "PurchaseReceipt"("idempotencyKey");

-- CreateIndex
CREATE INDEX "PurchaseReceipt_purchaseId_receivedAt_idx" ON "PurchaseReceipt"("purchaseId", "receivedAt");

-- CreateIndex
CREATE INDEX "PurchaseReceipt_branchCode_locationCode_receivedAt_idx" ON "PurchaseReceipt"("branchCode", "locationCode", "receivedAt");

-- CreateIndex
CREATE INDEX "PurchaseReceipt_recordedById_idx" ON "PurchaseReceipt"("recordedById");

-- CreateIndex
CREATE INDEX "PurchaseReceipt_receivedById_idx" ON "PurchaseReceipt"("receivedById");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseReceiptLine_lotId_key" ON "PurchaseReceiptLine"("lotId");

-- CreateIndex
CREATE INDEX "PurchaseReceiptLine_receiptId_idx" ON "PurchaseReceiptLine"("receiptId");

-- CreateIndex
CREATE INDEX "PurchaseReceiptLine_purchaseLineId_idx" ON "PurchaseReceiptLine"("purchaseLineId");

-- CreateIndex
CREATE INDEX "PurchaseReceiptLine_itemId_idx" ON "PurchaseReceiptLine"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryLot_internalLotCode_key" ON "InventoryLot"("internalLotCode");

-- CreateIndex
CREATE INDEX "InventoryLot_itemId_branchCode_locationCode_expirationDate_idx" ON "InventoryLot"("itemId", "branchCode", "locationCode", "expirationDate");

-- CreateIndex
CREATE INDEX "InventoryLot_supplierId_idx" ON "InventoryLot"("supplierId");

-- CreateIndex
CREATE INDEX "InventoryLot_purchaseId_idx" ON "InventoryLot"("purchaseId");

-- CreateIndex
CREATE INDEX "InventoryLot_receiptId_idx" ON "InventoryLot"("receiptId");

-- CreateIndex
CREATE INDEX "InventoryLot_batchNumber_idx" ON "InventoryLot"("batchNumber");

-- CreateIndex
CREATE INDEX "InventoryLot_active_expirationDate_idx" ON "InventoryLot"("active", "expirationDate");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryLotAdjustment_idempotencyKey_key" ON "InventoryLotAdjustment"("idempotencyKey");

-- CreateIndex
CREATE INDEX "InventoryLotAdjustment_itemId_createdAt_idx" ON "InventoryLotAdjustment"("itemId", "createdAt");

-- CreateIndex
CREATE INDEX "InventoryLotAdjustment_lotId_createdAt_idx" ON "InventoryLotAdjustment"("lotId", "createdAt");

-- CreateIndex
CREATE INDEX "InventoryLotAdjustment_recordedById_idx" ON "InventoryLotAdjustment"("recordedById");

-- CreateIndex
CREATE INDEX "InventoryLotAdjustment_authorizedById_idx" ON "InventoryLotAdjustment"("authorizedById");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseDocument_storageKey_key" ON "PurchaseDocument"("storageKey");

-- CreateIndex
CREATE INDEX "PurchaseDocument_purchaseId_createdAt_idx" ON "PurchaseDocument"("purchaseId", "createdAt");

-- CreateIndex
CREATE INDEX "PurchaseDocument_receiptId_idx" ON "PurchaseDocument"("receiptId");

-- CreateIndex
CREATE INDEX "PurchaseDocument_uploadedById_idx" ON "PurchaseDocument"("uploadedById");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryMovement_receiptLineId_key" ON "InventoryMovement"("receiptLineId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryMovement_lotAdjustmentId_key" ON "InventoryMovement"("lotAdjustmentId");

-- CreateIndex
CREATE INDEX "InventoryMovement_purchaseId_idx" ON "InventoryMovement"("purchaseId");

-- CreateIndex
CREATE INDEX "InventoryMovement_purchaseLineId_idx" ON "InventoryMovement"("purchaseLineId");

-- CreateIndex
CREATE INDEX "InventoryMovement_receiptId_idx" ON "InventoryMovement"("receiptId");

-- CreateIndex
CREATE INDEX "InventoryMovement_lotId_idx" ON "InventoryMovement"("lotId");

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_sourceCashExpenseId_fkey" FOREIGN KEY ("sourceCashExpenseId") REFERENCES "CashExpense"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "InternalUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "InternalUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_cancelledById_fkey" FOREIGN KEY ("cancelledById") REFERENCES "InternalUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseLine" ADD CONSTRAINT "PurchaseLine_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseLine" ADD CONSTRAINT "PurchaseLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchasePayment" ADD CONSTRAINT "PurchasePayment_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchasePayment" ADD CONSTRAINT "PurchasePayment_cashSessionId_fkey" FOREIGN KEY ("cashSessionId") REFERENCES "CashSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchasePayment" ADD CONSTRAINT "PurchasePayment_cashMovementId_fkey" FOREIGN KEY ("cashMovementId") REFERENCES "CashMovement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchasePayment" ADD CONSTRAINT "PurchasePayment_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "InternalUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseReceipt" ADD CONSTRAINT "PurchaseReceipt_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseReceipt" ADD CONSTRAINT "PurchaseReceipt_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "InternalUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseReceipt" ADD CONSTRAINT "PurchaseReceipt_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "InternalUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseReceiptLine" ADD CONSTRAINT "PurchaseReceiptLine_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "PurchaseReceipt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseReceiptLine" ADD CONSTRAINT "PurchaseReceiptLine_purchaseLineId_fkey" FOREIGN KEY ("purchaseLineId") REFERENCES "PurchaseLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseReceiptLine" ADD CONSTRAINT "PurchaseReceiptLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseReceiptLine" ADD CONSTRAINT "PurchaseReceiptLine_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "InventoryLot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLot" ADD CONSTRAINT "InventoryLot_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLot" ADD CONSTRAINT "InventoryLot_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLot" ADD CONSTRAINT "InventoryLot_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLot" ADD CONSTRAINT "InventoryLot_purchaseLineId_fkey" FOREIGN KEY ("purchaseLineId") REFERENCES "PurchaseLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLot" ADD CONSTRAINT "InventoryLot_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "PurchaseReceipt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLotAdjustment" ADD CONSTRAINT "InventoryLotAdjustment_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLotAdjustment" ADD CONSTRAINT "InventoryLotAdjustment_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "InventoryLot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLotAdjustment" ADD CONSTRAINT "InventoryLotAdjustment_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "InternalUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLotAdjustment" ADD CONSTRAINT "InventoryLotAdjustment_authorizedById_fkey" FOREIGN KEY ("authorizedById") REFERENCES "InternalUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseDocument" ADD CONSTRAINT "PurchaseDocument_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseDocument" ADD CONSTRAINT "PurchaseDocument_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "PurchaseReceipt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseDocument" ADD CONSTRAINT "PurchaseDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "InternalUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_purchaseLineId_fkey" FOREIGN KEY ("purchaseLineId") REFERENCES "PurchaseLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "PurchaseReceipt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_receiptLineId_fkey" FOREIGN KEY ("receiptLineId") REFERENCES "PurchaseReceiptLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "InventoryLot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_lotAdjustmentId_fkey" FOREIGN KEY ("lotAdjustmentId") REFERENCES "InventoryLotAdjustment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Reglas de integridad monetaria, de cantidades y revisiones.
ALTER TABLE "Purchase"
ADD CONSTRAINT "Purchase_totalCents_check" CHECK ("totalCents" > 0),
ADD CONSTRAINT "Purchase_revision_check" CHECK ("revision" > 0),
ADD CONSTRAINT "Purchase_currency_check" CHECK ("currency" = 'BOB');

ALTER TABLE "PurchaseLine"
ADD CONSTRAINT "PurchaseLine_orderedQuantity_check" CHECK ("orderedQuantity" > 0),
ADD CONSTRAINT "PurchaseLine_receivedQuantity_check" CHECK (
  "receivedQuantity" >= 0 AND "receivedQuantity" <= "orderedQuantity"
),
ADD CONSTRAINT "PurchaseLine_unitCostCents_check" CHECK ("unitCostCents" > 0),
ADD CONSTRAINT "PurchaseLine_subtotalCents_check" CHECK (
  "subtotalCents" = "orderedQuantity" * "unitCostCents"
);

ALTER TABLE "PurchasePayment"
ADD CONSTRAINT "PurchasePayment_amountCents_check" CHECK ("amountCents" > 0),
ADD CONSTRAINT "PurchasePayment_method_check" CHECK ("method" <> 'credit');

ALTER TABLE "PurchaseReceiptLine"
ADD CONSTRAINT "PurchaseReceiptLine_quantity_check" CHECK ("quantity" > 0),
ADD CONSTRAINT "PurchaseReceiptLine_unitCostCents_check" CHECK ("unitCostCents" > 0),
ADD CONSTRAINT "PurchaseReceiptLine_subtotalCents_check" CHECK (
  "subtotalCents" = "quantity" * "unitCostCents"
);

ALTER TABLE "InventoryLot"
ADD CONSTRAINT "InventoryLot_receivedQuantity_check" CHECK ("receivedQuantity" > 0),
ADD CONSTRAINT "InventoryLot_currentQuantity_check" CHECK (
  "currentQuantity" >= 0
),
ADD CONSTRAINT "InventoryLot_unitCostCents_check" CHECK ("unitCostCents" > 0);

ALTER TABLE "InventoryLotAdjustment"
ADD CONSTRAINT "InventoryLotAdjustment_quantity_check" CHECK ("quantity" > 0);

ALTER TABLE "PurchaseDocument"
ADD CONSTRAINT "PurchaseDocument_sizeBytes_check" CHECK ("sizeBytes" > 0);

-- Compras y stock conservan su evidencia; las correcciones son nuevos eventos.
CREATE OR REPLACE FUNCTION "prevent_purchase_evidence_mutation"()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'La evidencia de compras, recepciones y stock no se edita ni elimina';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "PurchasePayment_append_only"
BEFORE UPDATE OR DELETE ON "PurchasePayment"
FOR EACH ROW EXECUTE FUNCTION "prevent_purchase_evidence_mutation"();

CREATE TRIGGER "PurchaseReceipt_append_only"
BEFORE UPDATE OR DELETE ON "PurchaseReceipt"
FOR EACH ROW EXECUTE FUNCTION "prevent_purchase_evidence_mutation"();

CREATE TRIGGER "PurchaseReceiptLine_append_only"
BEFORE UPDATE OR DELETE ON "PurchaseReceiptLine"
FOR EACH ROW EXECUTE FUNCTION "prevent_purchase_evidence_mutation"();

CREATE TRIGGER "InventoryLotAdjustment_append_only"
BEFORE UPDATE OR DELETE ON "InventoryLotAdjustment"
FOR EACH ROW EXECUTE FUNCTION "prevent_purchase_evidence_mutation"();

CREATE TRIGGER "PurchaseDocument_append_only"
BEFORE UPDATE OR DELETE ON "PurchaseDocument"
FOR EACH ROW EXECUTE FUNCTION "prevent_purchase_evidence_mutation"();

CREATE TRIGGER "InventoryMovement_append_only"
BEFORE UPDATE OR DELETE ON "InventoryMovement"
FOR EACH ROW EXECUTE FUNCTION "prevent_purchase_evidence_mutation"();

CREATE TRIGGER "InventoryAdjustment_append_only"
BEFORE UPDATE OR DELETE ON "InventoryAdjustment"
FOR EACH ROW EXECUTE FUNCTION "prevent_purchase_evidence_mutation"();

CREATE OR REPLACE FUNCTION "prevent_purchase_master_delete"()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Las compras, líneas y lotes se conservan; use estado o ajuste';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Purchase_no_delete"
BEFORE DELETE ON "Purchase"
FOR EACH ROW EXECUTE FUNCTION "prevent_purchase_master_delete"();

CREATE TRIGGER "PurchaseLine_no_delete"
BEFORE DELETE ON "PurchaseLine"
FOR EACH ROW EXECUTE FUNCTION "prevent_purchase_master_delete"();

CREATE TRIGGER "InventoryLot_no_delete"
BEFORE DELETE ON "InventoryLot"
FOR EACH ROW EXECUTE FUNCTION "prevent_purchase_master_delete"();

-- Después de confirmar, la línea solo puede acumular recepción.
CREATE OR REPLACE FUNCTION "protect_confirmed_purchase_line"()
RETURNS trigger AS $$
DECLARE
  purchase_status "PurchaseStatus";
BEGIN
  SELECT "status" INTO purchase_status
  FROM "Purchase"
  WHERE "id" = OLD."purchaseId";

  IF purchase_status <> 'draft' AND (
    NEW."purchaseId" IS DISTINCT FROM OLD."purchaseId"
    OR NEW."itemId" IS DISTINCT FROM OLD."itemId"
    OR NEW."description" IS DISTINCT FROM OLD."description"
    OR NEW."unit" IS DISTINCT FROM OLD."unit"
    OR NEW."orderedQuantity" IS DISTINCT FROM OLD."orderedQuantity"
    OR NEW."unitCostCents" IS DISTINCT FROM OLD."unitCostCents"
    OR NEW."subtotalCents" IS DISTINCT FROM OLD."subtotalCents"
  ) THEN
    RAISE EXCEPTION 'Una línea confirmada solo puede actualizar su cantidad recibida';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "PurchaseLine_protect_confirmed"
BEFORE UPDATE ON "PurchaseLine"
FOR EACH ROW EXECUTE FUNCTION "protect_confirmed_purchase_line"();
