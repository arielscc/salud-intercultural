-- Tarea 11: vuelve obligatoria la sede, elimina el saldo global y protege la
-- conciliación entre saldos locales, movimientos y traslados.
BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "PurchaseLine" WHERE "branchCode" IS NULL) THEN
    RAISE EXCEPTION 'PURCHASE_LINE_BRANCH_RECONCILIATION_REQUIRED';
  END IF;
  IF EXISTS (SELECT 1 FROM "PurchaseReceiptLine" WHERE "branchCode" IS NULL) THEN
    RAISE EXCEPTION 'PURCHASE_RECEIPT_LINE_BRANCH_RECONCILIATION_REQUIRED';
  END IF;
  IF EXISTS (SELECT 1 FROM "InventoryLotAdjustment" WHERE "branchCode" IS NULL) THEN
    RAISE EXCEPTION 'INVENTORY_LOT_ADJUSTMENT_BRANCH_RECONCILIATION_REQUIRED';
  END IF;
  IF EXISTS (SELECT 1 FROM "PurchaseDocument" WHERE "branchCode" IS NULL) THEN
    RAISE EXCEPTION 'PURCHASE_DOCUMENT_BRANCH_RECONCILIATION_REQUIRED';
  END IF;
  IF EXISTS (
    SELECT 1 FROM "InventoryTransferLotAllocation"
    WHERE "sourceBranchCode" IS NULL OR "destinationBranchCode" IS NULL
  ) THEN
    RAISE EXCEPTION 'INVENTORY_TRANSFER_LOT_BRANCH_RECONCILIATION_REQUIRED';
  END IF;
  IF EXISTS (SELECT 1 FROM "InventoryAlert" WHERE "branchCode" IS NULL) THEN
    RAISE EXCEPTION 'INVENTORY_ALERT_BRANCH_RECONCILIATION_REQUIRED';
  END IF;

  IF EXISTS (
    WITH movement_totals AS (
      SELECT "itemId", "branchCode", SUM("quantityDelta")::integer AS stock
      FROM "InventoryMovement"
      GROUP BY "itemId", "branchCode"
    )
    SELECT 1
    FROM "BranchInventoryBalance" balance
    FULL JOIN movement_totals ledger
      ON ledger."itemId" = balance."itemId"
     AND ledger."branchCode" = balance."branchCode"
    WHERE COALESCE(balance."currentStock", 0) <> COALESCE(ledger.stock, 0)
  ) THEN
    RAISE EXCEPTION 'INVENTORY_LEDGER_RECONCILIATION_REQUIRED';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "BranchInventoryBalance" WHERE "currentStock" < 0
  ) OR EXISTS (
    SELECT 1 FROM "InventoryMovement"
    GROUP BY "itemId", "branchCode"
    HAVING SUM("quantityDelta") < 0
  ) THEN
    RAISE EXCEPTION 'INVENTORY_NEGATIVE_LOCAL_STOCK';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "InventoryTransfer" transfer
    JOIN "InventoryMovement" source ON source."id" = transfer."sourceMovementId"
    JOIN "InventoryMovement" destination ON destination."id" = transfer."destinationMovementId"
    WHERE source."branchCode" <> transfer."sourceBranchCode"
       OR destination."branchCode" <> transfer."destinationBranchCode"
       OR source."itemId" <> transfer."itemId"
       OR destination."itemId" <> transfer."itemId"
       OR source."type" <> 'transfer_out'
       OR destination."type" <> 'transfer_in'
       OR source."quantityDelta" <> -transfer."quantity"
       OR destination."quantityDelta" <> transfer."quantity"
       OR source."quantityDelta" + destination."quantityDelta" <> 0
  ) THEN
    RAISE EXCEPTION 'INVENTORY_TRANSFER_RECONCILIATION_REQUIRED';
  END IF;
END $$;

ALTER TABLE "PurchaseLine" ALTER COLUMN "branchCode" SET NOT NULL;
ALTER TABLE "PurchaseReceiptLine" ALTER COLUMN "branchCode" SET NOT NULL;
ALTER TABLE "InventoryLotAdjustment" ALTER COLUMN "branchCode" SET NOT NULL;
ALTER TABLE "PurchaseDocument" ALTER COLUMN "branchCode" SET NOT NULL;
ALTER TABLE "InventoryTransferLotAllocation"
  ALTER COLUMN "sourceBranchCode" SET NOT NULL,
  ALTER COLUMN "destinationBranchCode" SET NOT NULL;
ALTER TABLE "InventoryAlert" ALTER COLUMN "branchCode" SET NOT NULL;
ALTER TABLE "BranchInventoryBalance"
  ADD CONSTRAINT "BranchInventoryBalance_nonnegative_stock_check"
  CHECK ("currentStock" >= 0);

-- Se retiran las relaciones simples reemplazadas por las claves compuestas.
ALTER TABLE "PurchaseLine" DROP CONSTRAINT IF EXISTS "PurchaseLine_purchaseId_fkey";
ALTER TABLE "PurchasePayment"
  DROP CONSTRAINT IF EXISTS "PurchasePayment_purchaseId_fkey",
  DROP CONSTRAINT IF EXISTS "PurchasePayment_cashSessionId_fkey";
ALTER TABLE "PurchaseReceipt" DROP CONSTRAINT IF EXISTS "PurchaseReceipt_purchaseId_fkey";
ALTER TABLE "PurchaseReceiptLine"
  DROP CONSTRAINT IF EXISTS "PurchaseReceiptLine_receiptId_fkey",
  DROP CONSTRAINT IF EXISTS "PurchaseReceiptLine_purchaseLineId_fkey",
  DROP CONSTRAINT IF EXISTS "PurchaseReceiptLine_lotId_fkey";
ALTER TABLE "InventoryLot"
  DROP CONSTRAINT IF EXISTS "InventoryLot_purchaseId_fkey",
  DROP CONSTRAINT IF EXISTS "InventoryLot_purchaseLineId_fkey",
  DROP CONSTRAINT IF EXISTS "InventoryLot_receiptId_fkey";
ALTER TABLE "InventoryLotAdjustment"
  DROP CONSTRAINT IF EXISTS "InventoryLotAdjustment_lotId_fkey";
ALTER TABLE "PurchaseDocument"
  DROP CONSTRAINT IF EXISTS "PurchaseDocument_purchaseId_fkey",
  DROP CONSTRAINT IF EXISTS "PurchaseDocument_receiptId_fkey";
ALTER TABLE "InventoryMovement"
  DROP CONSTRAINT IF EXISTS "InventoryMovement_purchaseId_fkey",
  DROP CONSTRAINT IF EXISTS "InventoryMovement_purchaseLineId_fkey",
  DROP CONSTRAINT IF EXISTS "InventoryMovement_receiptId_fkey",
  DROP CONSTRAINT IF EXISTS "InventoryMovement_receiptLineId_fkey",
  DROP CONSTRAINT IF EXISTS "InventoryMovement_lotId_fkey",
  DROP CONSTRAINT IF EXISTS "InventoryMovement_lotAdjustmentId_fkey";
ALTER TABLE "InventoryTransfer"
  DROP CONSTRAINT IF EXISTS "InventoryTransfer_sourceMovementId_fkey",
  DROP CONSTRAINT IF EXISTS "InventoryTransfer_destinationMovementId_fkey";
ALTER TABLE "InventoryTransferLotAllocation"
  DROP CONSTRAINT IF EXISTS "InventoryTransferLotAllocation_transferId_fkey",
  DROP CONSTRAINT IF EXISTS "InventoryTransferLotAllocation_sourceLotId_fkey",
  DROP CONSTRAINT IF EXISTS "InventoryTransferLotAllocation_destinationLotId_fkey";

-- El total corporativo deja de existir: el único saldo materializado es local.
ALTER TABLE "InventoryItem" DROP COLUMN "currentStock";

CREATE OR REPLACE FUNCTION assert_branch_inventory_ledger_balance()
RETURNS trigger AS $$
DECLARE
  checked_item TEXT;
  checked_branch TEXT;
  materialized_stock INTEGER;
  ledger_stock INTEGER;
BEGIN
  IF TG_OP = 'DELETE' THEN
    checked_item := OLD."itemId";
    checked_branch := OLD."branchCode";
  ELSE
    checked_item := NEW."itemId";
    checked_branch := NEW."branchCode";
  END IF;

  SELECT "currentStock" INTO materialized_stock
  FROM "BranchInventoryBalance"
  WHERE "itemId" = checked_item AND "branchCode" = checked_branch;

  SELECT COALESCE(SUM("quantityDelta"), 0)::integer INTO ledger_stock
  FROM "InventoryMovement"
  WHERE "itemId" = checked_item AND "branchCode" = checked_branch;

  IF COALESCE(materialized_stock, 0) <> ledger_stock THEN
    RAISE EXCEPTION 'INVENTORY_LEDGER_BALANCE_MISMATCH:%:%', checked_item, checked_branch;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER "BranchInventoryBalance_ledger_reconcile"
AFTER INSERT OR UPDATE OR DELETE ON "BranchInventoryBalance"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION assert_branch_inventory_ledger_balance();

CREATE CONSTRAINT TRIGGER "InventoryMovement_ledger_reconcile"
AFTER INSERT OR UPDATE OR DELETE ON "InventoryMovement"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION assert_branch_inventory_ledger_balance();

CREATE OR REPLACE FUNCTION assert_inventory_transfer_vouchers()
RETURNS trigger AS $$
DECLARE
  source_record "InventoryMovement"%ROWTYPE;
  destination_record "InventoryMovement"%ROWTYPE;
BEGIN
  SELECT * INTO source_record FROM "InventoryMovement" WHERE "id" = NEW."sourceMovementId";
  SELECT * INTO destination_record FROM "InventoryMovement" WHERE "id" = NEW."destinationMovementId";
  IF source_record."branchCode" <> NEW."sourceBranchCode"
     OR destination_record."branchCode" <> NEW."destinationBranchCode"
     OR source_record."itemId" <> NEW."itemId"
     OR destination_record."itemId" <> NEW."itemId"
     OR source_record."type" <> 'transfer_out'
     OR destination_record."type" <> 'transfer_in'
     OR source_record."quantityDelta" <> -NEW."quantity"
     OR destination_record."quantityDelta" <> NEW."quantity"
     OR source_record."quantityDelta" + destination_record."quantityDelta" <> 0 THEN
    RAISE EXCEPTION 'INVENTORY_TRANSFER_VOUCHERS_MISMATCH';
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER "InventoryTransfer_vouchers_reconcile"
AFTER INSERT OR UPDATE ON "InventoryTransfer"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION assert_inventory_transfer_vouchers();

COMMIT;
