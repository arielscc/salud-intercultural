-- Tarea 15: cierre de enlaces residuales e idempotencia por sucursal.
-- El bloque inicial impide instalar constraints sobre datos cruzados heredados.
DO $$
DECLARE
  violations BIGINT;
BEGIN
  SELECT COUNT(*) INTO violations
  FROM (
    SELECT pc."id"
    FROM "PatientConsent" pc
    JOIN "PatientConsent" previous ON previous."id" = pc."supersedesId"
    WHERE pc."branchCode" <> previous."branchCode"

    UNION ALL

    SELECT movement."id"
    FROM "InventoryMovement" movement
    JOIN "Sale" sale ON sale."id" = movement."saleId"
    WHERE movement."branchCode" <> sale."branchCode"

    UNION ALL

    SELECT movement."id"
    FROM "InventoryMovement" movement
    JOIN "SaleItem" item ON item."id" = movement."saleItemId"
    WHERE movement."branchCode" <> item."branchCode"

    UNION ALL

    SELECT package."id"
    FROM "ServiceSessionPackage" package
    JOIN "Sale" sale ON sale."id" = package."saleId"
    WHERE package."branchCode" <> sale."branchCode"
  ) crossings;

  IF violations <> 0 THEN
    RAISE EXCEPTION
      'Tarea 15 bloqueada: % enlace(s) operativo(s) cruza(n) sucursales. Ejecute la reconciliación antes de migrar.',
      violations;
  END IF;
END $$;

CREATE UNIQUE INDEX "PatientConsent_id_branchCode_key"
  ON "PatientConsent"("id", "branchCode");
CREATE UNIQUE INDEX "PatientConsent_supersedesId_branchCode_key"
  ON "PatientConsent"("supersedesId", "branchCode");

DROP INDEX "PatientConsent_supersedesId_key";
ALTER TABLE "PatientConsent"
  DROP CONSTRAINT "PatientConsent_supersedesId_fkey";
ALTER TABLE "PatientConsent"
  ADD CONSTRAINT "PatientConsent_supersedesId_branchCode_fkey"
  FOREIGN KEY ("supersedesId", "branchCode")
  REFERENCES "PatientConsent"("id", "branchCode")
  ON DELETE RESTRICT ON UPDATE CASCADE;

DROP INDEX "InventoryMovement_saleId_idx";
DROP INDEX "InventoryMovement_saleItemId_idx";
ALTER TABLE "InventoryMovement"
  DROP CONSTRAINT "InventoryMovement_saleId_fkey";
ALTER TABLE "InventoryMovement"
  DROP CONSTRAINT "InventoryMovement_saleItemId_fkey";
ALTER TABLE "InventoryMovement"
  ADD CONSTRAINT "InventoryMovement_saleId_branchCode_fkey"
  FOREIGN KEY ("saleId", "branchCode")
  REFERENCES "Sale"("id", "branchCode")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryMovement"
  ADD CONSTRAINT "InventoryMovement_saleItemId_branchCode_fkey"
  FOREIGN KEY ("saleItemId", "branchCode")
  REFERENCES "SaleItem"("id", "branchCode")
  ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "InventoryMovement_saleId_branchCode_idx"
  ON "InventoryMovement"("saleId", "branchCode");
CREATE INDEX "InventoryMovement_saleItemId_branchCode_idx"
  ON "InventoryMovement"("saleItemId", "branchCode");

ALTER TABLE "ServiceSessionPackage"
  DROP CONSTRAINT "ServiceSessionPackage_saleId_fkey";
ALTER TABLE "ServiceSessionPackage"
  ADD CONSTRAINT "ServiceSessionPackage_saleId_branchCode_fkey"
  FOREIGN KEY ("saleId", "branchCode")
  REFERENCES "Sale"("id", "branchCode")
  ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "ServiceSessionPackage_saleId_branchCode_idx"
  ON "ServiceSessionPackage"("saleId", "branchCode");

DROP INDEX "Sale_idempotencyKey_key";
DROP INDEX "Payment_idempotencyKey_key";
DROP INDEX "CashMovement_idempotencyKey_key";
DROP INDEX "CashSession_idempotencyKey_key";
DROP INDEX "CashExpense_idempotencyKey_key";
DROP INDEX "Purchase_idempotencyKey_key";
DROP INDEX "PurchasePayment_idempotencyKey_key";
DROP INDEX "PurchaseReceipt_idempotencyKey_key";
DROP INDEX "InventoryLotAdjustment_idempotencyKey_key";
DROP INDEX "InventoryMovement_idempotencyKey_key";
DROP INDEX "InventoryTransfer_idempotencyKey_key";

CREATE UNIQUE INDEX "Sale_branchCode_idempotencyKey_key"
  ON "Sale"("branchCode", "idempotencyKey");
CREATE UNIQUE INDEX "Payment_branchCode_idempotencyKey_key"
  ON "Payment"("branchCode", "idempotencyKey");
CREATE UNIQUE INDEX "CashMovement_branchCode_idempotencyKey_key"
  ON "CashMovement"("branchCode", "idempotencyKey");
CREATE UNIQUE INDEX "CashSession_branchCode_idempotencyKey_key"
  ON "CashSession"("branchCode", "idempotencyKey");
CREATE UNIQUE INDEX "CashExpense_branchCode_idempotencyKey_key"
  ON "CashExpense"("branchCode", "idempotencyKey");
CREATE UNIQUE INDEX "Purchase_branchCode_idempotencyKey_key"
  ON "Purchase"("branchCode", "idempotencyKey");
CREATE UNIQUE INDEX "PurchasePayment_id_branchCode_key"
  ON "PurchasePayment"("id", "branchCode");
CREATE UNIQUE INDEX "PurchasePayment_branchCode_idempotencyKey_key"
  ON "PurchasePayment"("branchCode", "idempotencyKey");
CREATE UNIQUE INDEX "PurchaseReceipt_branchCode_idempotencyKey_key"
  ON "PurchaseReceipt"("branchCode", "idempotencyKey");
CREATE UNIQUE INDEX "InventoryLotAdjustment_branchCode_idempotencyKey_key"
  ON "InventoryLotAdjustment"("branchCode", "idempotencyKey");
CREATE UNIQUE INDEX "InventoryMovement_branchCode_idempotencyKey_key"
  ON "InventoryMovement"("branchCode", "idempotencyKey");
CREATE UNIQUE INDEX "InventoryTransfer_sourceBranchCode_idempotencyKey_key"
  ON "InventoryTransfer"("sourceBranchCode", "idempotencyKey");
