-- Tarea 11: materializa la sede en toda la evidencia de compras e inventario.
-- Solo deriva sucursales desde padres inequívocos. Las alertas ambiguas quedan
-- pendientes para el reconciliador y bloquean el endurecimiento.
BEGIN;

ALTER TABLE "PurchaseLine" ADD COLUMN "branchCode" TEXT;
ALTER TABLE "PurchaseReceiptLine" ADD COLUMN "branchCode" TEXT;
ALTER TABLE "InventoryLotAdjustment" ADD COLUMN "branchCode" TEXT;
ALTER TABLE "PurchaseDocument" ADD COLUMN "branchCode" TEXT;
ALTER TABLE "InventoryTransferLotAllocation"
  ADD COLUMN "sourceBranchCode" TEXT,
  ADD COLUMN "destinationBranchCode" TEXT;
ALTER TABLE "InventoryAlert" ADD COLUMN "branchCode" TEXT;
ALTER TABLE "InventoryLot"
  ALTER COLUMN "purchaseId" DROP NOT NULL,
  ALTER COLUMN "purchaseLineId" DROP NOT NULL,
  ALTER COLUMN "receiptId" DROP NOT NULL;

-- Estas tablas son append-only para la aplicación. Los triggers se suspenden
-- únicamente dentro de esta migración controlada para materializar la sede.
DROP TRIGGER IF EXISTS "PurchaseReceiptLine_append_only" ON "PurchaseReceiptLine";
DROP TRIGGER IF EXISTS "InventoryLotAdjustment_append_only" ON "InventoryLotAdjustment";
DROP TRIGGER IF EXISTS "PurchaseDocument_append_only" ON "PurchaseDocument";
DROP TRIGGER IF EXISTS "InventoryTransferLotAllocation_append_only" ON "InventoryTransferLotAllocation";

-- Padres directos e inmutables: estas atribuciones no requieren una decisión.
UPDATE "PurchaseLine" child
SET "branchCode" = parent."branchCode"
FROM "Purchase" parent
WHERE parent."id" = child."purchaseId";

UPDATE "PurchaseReceiptLine" child
SET "branchCode" = parent."branchCode"
FROM "PurchaseReceipt" parent
WHERE parent."id" = child."receiptId";

UPDATE "InventoryLotAdjustment" child
SET "branchCode" = parent."branchCode"
FROM "InventoryLot" parent
WHERE parent."id" = child."lotId";

UPDATE "PurchaseDocument" child
SET "branchCode" = parent."branchCode"
FROM "Purchase" parent
WHERE parent."id" = child."purchaseId";

UPDATE "InventoryTransferLotAllocation" child
SET "sourceBranchCode" = parent."sourceBranchCode",
    "destinationBranchCode" = parent."destinationBranchCode"
FROM "InventoryTransfer" parent
WHERE parent."id" = child."transferId";

-- El lote creado en destino se origina en el traslado, no en una compra de esa
-- sucursal. Su trazabilidad permanece en la asignación inmutable entre lotes.
UPDATE "InventoryLot" destination
SET "purchaseId" = NULL,
    "purchaseLineId" = NULL,
    "receiptId" = NULL
FROM "InventoryTransferLotAllocation" allocation
WHERE allocation."destinationLotId" = destination."id";

-- Todo producto configurado localmente tiene un saldo local explícito, incluso
-- cuando todavía es cero y nunca registró un movimiento.
INSERT INTO "BranchInventoryBalance" ("itemId", "branchCode", "currentStock", "updatedAt")
SELECT configured."itemId", configured."branchCode", 0, CURRENT_TIMESTAMP
FROM "BranchInventoryItem" configured
WHERE NOT EXISTS (
  SELECT 1 FROM "BranchInventoryBalance" balance
  WHERE balance."itemId" = configured."itemId"
    AND balance."branchCode" = configured."branchCode"
);

-- Una alerta histórica solo se atribuye automáticamente cuando el producto
-- existía en exactamente una sede. No se interpreta texto ni se elige El Alto.
WITH single_branch AS (
  SELECT "itemId", MIN("branchCode") AS "branchCode"
  FROM "BranchInventoryItem"
  GROUP BY "itemId"
  HAVING COUNT(*) = 1
)
UPDATE "InventoryAlert" alert
SET "branchCode" = evidence."branchCode"
FROM single_branch evidence
WHERE evidence."itemId" = alert."itemId";

CREATE UNIQUE INDEX "Purchase_id_branchCode_key"
  ON "Purchase"("id", "branchCode");
CREATE UNIQUE INDEX "CashSession_id_branchCode_key"
  ON "CashSession"("id", "branchCode");
CREATE UNIQUE INDEX "PurchaseLine_id_branchCode_key"
  ON "PurchaseLine"("id", "branchCode");
CREATE UNIQUE INDEX "PurchaseReceipt_id_branchCode_key"
  ON "PurchaseReceipt"("id", "branchCode");
CREATE UNIQUE INDEX "PurchaseReceiptLine_id_branchCode_key"
  ON "PurchaseReceiptLine"("id", "branchCode");
CREATE UNIQUE INDEX "PurchaseReceiptLine_lotId_branchCode_key"
  ON "PurchaseReceiptLine"("lotId", "branchCode");
CREATE UNIQUE INDEX "InventoryLot_id_branchCode_key"
  ON "InventoryLot"("id", "branchCode");
CREATE UNIQUE INDEX "InventoryLotAdjustment_id_branchCode_key"
  ON "InventoryLotAdjustment"("id", "branchCode");
CREATE UNIQUE INDEX "PurchaseDocument_id_branchCode_key"
  ON "PurchaseDocument"("id", "branchCode");
CREATE UNIQUE INDEX "InventoryMovement_id_branchCode_key"
  ON "InventoryMovement"("id", "branchCode");
CREATE UNIQUE INDEX "InventoryMovement_receiptLineId_branchCode_key"
  ON "InventoryMovement"("receiptLineId", "branchCode");
CREATE UNIQUE INDEX "InventoryMovement_lotAdjustmentId_branchCode_key"
  ON "InventoryMovement"("lotAdjustmentId", "branchCode");
CREATE UNIQUE INDEX "InventoryTransfer_id_sourceBranchCode_destinationBranchCode_key"
  ON "InventoryTransfer"("id", "sourceBranchCode", "destinationBranchCode");
CREATE UNIQUE INDEX "InventoryTransfer_sourceMovementId_sourceBranchCode_key"
  ON "InventoryTransfer"("sourceMovementId", "sourceBranchCode");
CREATE UNIQUE INDEX "InventoryTransfer_destinationMovementId_destinationBranchCode_key"
  ON "InventoryTransfer"("destinationMovementId", "destinationBranchCode");
CREATE UNIQUE INDEX "InventoryTransferLotAllocation_destinationLotId_destinationBranchCode_key"
  ON "InventoryTransferLotAllocation"("destinationLotId", "destinationBranchCode");

CREATE INDEX "PurchaseLine_itemId_branchCode_idx"
  ON "PurchaseLine"("itemId", "branchCode");
CREATE INDEX "PurchaseLine_branchCode_createdAt_idx"
  ON "PurchaseLine"("branchCode", "createdAt");
CREATE INDEX "PurchaseReceiptLine_receiptId_branchCode_idx"
  ON "PurchaseReceiptLine"("receiptId", "branchCode");
CREATE INDEX "PurchaseReceiptLine_purchaseLineId_branchCode_idx"
  ON "PurchaseReceiptLine"("purchaseLineId", "branchCode");
CREATE INDEX "PurchaseReceiptLine_itemId_branchCode_idx"
  ON "PurchaseReceiptLine"("itemId", "branchCode");
CREATE INDEX "InventoryLotAdjustment_itemId_branchCode_createdAt_idx"
  ON "InventoryLotAdjustment"("itemId", "branchCode", "createdAt");
CREATE INDEX "InventoryLotAdjustment_lotId_branchCode_createdAt_idx"
  ON "InventoryLotAdjustment"("lotId", "branchCode", "createdAt");
CREATE INDEX "PurchaseDocument_purchaseId_branchCode_createdAt_idx"
  ON "PurchaseDocument"("purchaseId", "branchCode", "createdAt");
CREATE INDEX "PurchaseDocument_receiptId_branchCode_idx"
  ON "PurchaseDocument"("receiptId", "branchCode");
CREATE INDEX "InventoryAlert_itemId_branchCode_idx"
  ON "InventoryAlert"("itemId", "branchCode");
CREATE INDEX "InventoryAlert_branchCode_status_createdAt_idx"
  ON "InventoryAlert"("branchCode", "status", "createdAt");
CREATE INDEX "InventoryTransferLotAllocation_sourceLotId_sourceBranchCode_createdAt_idx"
  ON "InventoryTransferLotAllocation"("sourceLotId", "sourceBranchCode", "createdAt");
CREATE INDEX "InventoryTransferLotAllocation_transferId_sourceBranchCode_destinationBranchCode_idx"
  ON "InventoryTransferLotAllocation"("transferId", "sourceBranchCode", "destinationBranchCode");

-- Las nuevas claves se agregan sin retirar todavía las heredadas. Esto permite
-- inspeccionar y reconciliar antes de volver obligatorias las columnas.
ALTER TABLE "BranchInventoryBalance"
  ADD CONSTRAINT "BranchInventoryBalance_item_branch_fkey"
  FOREIGN KEY ("itemId", "branchCode") REFERENCES "BranchInventoryItem"("itemId", "branchCode")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Purchase"
  ADD CONSTRAINT "Purchase_supplier_branch_fkey"
  FOREIGN KEY ("supplierId", "branchCode") REFERENCES "SupplierBranchProfile"("supplierId", "branchCode")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseLine"
  ADD CONSTRAINT "PurchaseLine_purchase_branch_fkey"
  FOREIGN KEY ("purchaseId", "branchCode") REFERENCES "Purchase"("id", "branchCode")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "PurchaseLine_item_branch_fkey"
  FOREIGN KEY ("itemId", "branchCode") REFERENCES "BranchInventoryItem"("itemId", "branchCode")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "PurchaseLine_branchCode_fkey"
  FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchasePayment"
  ADD CONSTRAINT "PurchasePayment_purchase_branch_fkey"
  FOREIGN KEY ("purchaseId", "branchCode") REFERENCES "Purchase"("id", "branchCode")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "PurchasePayment_cash_session_branch_fkey"
  FOREIGN KEY ("cashSessionId", "branchCode") REFERENCES "CashSession"("id", "branchCode")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseReceipt"
  ADD CONSTRAINT "PurchaseReceipt_purchase_branch_fkey"
  FOREIGN KEY ("purchaseId", "branchCode") REFERENCES "Purchase"("id", "branchCode")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseReceiptLine"
  ADD CONSTRAINT "PurchaseReceiptLine_receipt_branch_fkey"
  FOREIGN KEY ("receiptId", "branchCode") REFERENCES "PurchaseReceipt"("id", "branchCode")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "PurchaseReceiptLine_purchase_line_branch_fkey"
  FOREIGN KEY ("purchaseLineId", "branchCode") REFERENCES "PurchaseLine"("id", "branchCode")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "PurchaseReceiptLine_item_branch_fkey"
  FOREIGN KEY ("itemId", "branchCode") REFERENCES "BranchInventoryItem"("itemId", "branchCode")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "PurchaseReceiptLine_branchCode_fkey"
  FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryLot"
  ADD CONSTRAINT "InventoryLot_item_branch_fkey"
  FOREIGN KEY ("itemId", "branchCode") REFERENCES "BranchInventoryItem"("itemId", "branchCode")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "InventoryLot_purchase_branch_fkey"
  FOREIGN KEY ("purchaseId", "branchCode") REFERENCES "Purchase"("id", "branchCode")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "InventoryLot_purchase_line_branch_fkey"
  FOREIGN KEY ("purchaseLineId", "branchCode") REFERENCES "PurchaseLine"("id", "branchCode")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "InventoryLot_receipt_branch_fkey"
  FOREIGN KEY ("receiptId", "branchCode") REFERENCES "PurchaseReceipt"("id", "branchCode")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseReceiptLine"
  ADD CONSTRAINT "PurchaseReceiptLine_lot_branch_fkey"
  FOREIGN KEY ("lotId", "branchCode") REFERENCES "InventoryLot"("id", "branchCode")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryLotAdjustment"
  ADD CONSTRAINT "InventoryLotAdjustment_item_branch_fkey"
  FOREIGN KEY ("itemId", "branchCode") REFERENCES "BranchInventoryItem"("itemId", "branchCode")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "InventoryLotAdjustment_lot_branch_fkey"
  FOREIGN KEY ("lotId", "branchCode") REFERENCES "InventoryLot"("id", "branchCode")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "InventoryLotAdjustment_branchCode_fkey"
  FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseDocument"
  ADD CONSTRAINT "PurchaseDocument_purchase_branch_fkey"
  FOREIGN KEY ("purchaseId", "branchCode") REFERENCES "Purchase"("id", "branchCode")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "PurchaseDocument_receipt_branch_fkey"
  FOREIGN KEY ("receiptId", "branchCode") REFERENCES "PurchaseReceipt"("id", "branchCode")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "PurchaseDocument_branchCode_fkey"
  FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryMovement"
  ADD CONSTRAINT "InventoryMovement_item_branch_fkey"
  FOREIGN KEY ("itemId", "branchCode") REFERENCES "BranchInventoryItem"("itemId", "branchCode")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "InventoryMovement_purchase_branch_fkey"
  FOREIGN KEY ("purchaseId", "branchCode") REFERENCES "Purchase"("id", "branchCode")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "InventoryMovement_purchase_line_branch_fkey"
  FOREIGN KEY ("purchaseLineId", "branchCode") REFERENCES "PurchaseLine"("id", "branchCode")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "InventoryMovement_receipt_branch_fkey"
  FOREIGN KEY ("receiptId", "branchCode") REFERENCES "PurchaseReceipt"("id", "branchCode")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "InventoryMovement_receipt_line_branch_fkey"
  FOREIGN KEY ("receiptLineId", "branchCode") REFERENCES "PurchaseReceiptLine"("id", "branchCode")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "InventoryMovement_lot_branch_fkey"
  FOREIGN KEY ("lotId", "branchCode") REFERENCES "InventoryLot"("id", "branchCode")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "InventoryMovement_lot_adjustment_branch_fkey"
  FOREIGN KEY ("lotAdjustmentId", "branchCode") REFERENCES "InventoryLotAdjustment"("id", "branchCode")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryAdjustment"
  ADD CONSTRAINT "InventoryAdjustment_item_branch_fkey"
  FOREIGN KEY ("itemId", "branchCode") REFERENCES "BranchInventoryItem"("itemId", "branchCode")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryTransfer"
  ADD CONSTRAINT "InventoryTransfer_source_item_branch_fkey"
  FOREIGN KEY ("itemId", "sourceBranchCode") REFERENCES "BranchInventoryItem"("itemId", "branchCode")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "InventoryTransfer_destination_item_branch_fkey"
  FOREIGN KEY ("itemId", "destinationBranchCode") REFERENCES "BranchInventoryItem"("itemId", "branchCode")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "InventoryTransfer_source_movement_branch_fkey"
  FOREIGN KEY ("sourceMovementId", "sourceBranchCode") REFERENCES "InventoryMovement"("id", "branchCode")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "InventoryTransfer_destination_movement_branch_fkey"
  FOREIGN KEY ("destinationMovementId", "destinationBranchCode") REFERENCES "InventoryMovement"("id", "branchCode")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryTransferLotAllocation"
  ADD CONSTRAINT "InventoryTransferLotAllocation_transfer_branch_fkey"
  FOREIGN KEY ("transferId", "sourceBranchCode", "destinationBranchCode")
  REFERENCES "InventoryTransfer"("id", "sourceBranchCode", "destinationBranchCode")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "InventoryTransferLotAllocation_source_lot_branch_fkey"
  FOREIGN KEY ("sourceLotId", "sourceBranchCode") REFERENCES "InventoryLot"("id", "branchCode")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "InventoryTransferLotAllocation_destination_lot_branch_fkey"
  FOREIGN KEY ("destinationLotId", "destinationBranchCode") REFERENCES "InventoryLot"("id", "branchCode")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "InventoryTransferLotAllocation_sourceBranchCode_fkey"
  FOREIGN KEY ("sourceBranchCode") REFERENCES "ClinicBranch"("code")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "InventoryTransferLotAllocation_destinationBranchCode_fkey"
  FOREIGN KEY ("destinationBranchCode") REFERENCES "ClinicBranch"("code")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryAlert"
  ADD CONSTRAINT "InventoryAlert_item_branch_fkey"
  FOREIGN KEY ("itemId", "branchCode") REFERENCES "BranchInventoryItem"("itemId", "branchCode")
  ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "InventoryAlert_branchCode_fkey"
  FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TRIGGER "PurchaseReceiptLine_append_only"
BEFORE UPDATE OR DELETE ON "PurchaseReceiptLine"
FOR EACH ROW EXECUTE FUNCTION "prevent_purchase_evidence_mutation"();
CREATE TRIGGER "InventoryLotAdjustment_append_only"
BEFORE UPDATE OR DELETE ON "InventoryLotAdjustment"
FOR EACH ROW EXECUTE FUNCTION "prevent_purchase_evidence_mutation"();
CREATE TRIGGER "PurchaseDocument_append_only"
BEFORE UPDATE OR DELETE ON "PurchaseDocument"
FOR EACH ROW EXECUTE FUNCTION "prevent_purchase_evidence_mutation"();
CREATE TRIGGER "InventoryTransferLotAllocation_append_only"
BEFORE UPDATE OR DELETE ON "InventoryTransferLotAllocation"
FOR EACH ROW EXECUTE FUNCTION "prevent_purchase_evidence_mutation"();

COMMIT;
