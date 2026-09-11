-- Tarea 12: ninguna evidencia monetaria o documental puede cruzar de sede.
BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "GeneratedDocument" WHERE "branchCode" IS NULL) THEN
    RAISE EXCEPTION 'GENERATED_DOCUMENT_BRANCH_RECONCILIATION_REQUIRED';
  END IF;
  IF EXISTS (SELECT 1 FROM "SaleItem" WHERE "branchCode" IS NULL) THEN
    RAISE EXCEPTION 'SALE_ITEM_BRANCH_RECONCILIATION_REQUIRED';
  END IF;
  IF EXISTS (SELECT 1 FROM "DeliveredProduct" WHERE "branchCode" IS NULL) THEN
    RAISE EXCEPTION 'DELIVERED_PRODUCT_BRANCH_RECONCILIATION_REQUIRED';
  END IF;
  IF EXISTS (SELECT 1 FROM "CashSessionReconciliation" WHERE "branchCode" IS NULL) THEN
    RAISE EXCEPTION 'CASH_RECONCILIATION_BRANCH_RECONCILIATION_REQUIRED';
  END IF;
  IF EXISTS (SELECT 1 FROM "CashExpense" WHERE "branchCode" IS NULL) THEN
    RAISE EXCEPTION 'CASH_EXPENSE_BRANCH_RECONCILIATION_REQUIRED';
  END IF;
  IF EXISTS (SELECT 1 FROM "CashExpenseBeneficiary" WHERE "branchCode" IS NULL) THEN
    RAISE EXCEPTION 'CASH_BENEFICIARY_BRANCH_RECONCILIATION_REQUIRED';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "Sale" sale
    LEFT JOIN "PatientBranchRecord" patient
      ON patient."patientId" = sale."patientId" AND patient."branchCode" = sale."branchCode"
    LEFT JOIN "Visit" visit ON visit."id" = sale."visitId"
    LEFT JOIN "VisitWorkItem" work_item ON work_item."id" = sale."workItemId"
    LEFT JOIN "DoctorOrder" doctor_order ON doctor_order."id" = sale."doctorOrderId"
    WHERE patient."patientId" IS NULL
       OR (sale."visitId" IS NOT NULL AND visit."branchCode" IS DISTINCT FROM sale."branchCode")
       OR (sale."workItemId" IS NOT NULL AND work_item."branchCode" IS DISTINCT FROM sale."branchCode")
       OR (sale."doctorOrderId" IS NOT NULL AND doctor_order."branchCode" IS DISTINCT FROM sale."branchCode")
  ) THEN RAISE EXCEPTION 'SALE_BRANCH_SOURCE_MISMATCH'; END IF;

  IF EXISTS (
    SELECT 1 FROM "SaleItem" item
    JOIN "Sale" sale ON sale."id" = item."saleId"
    LEFT JOIN "BranchInventoryItem" inventory
      ON inventory."itemId" = item."inventoryItemId" AND inventory."branchCode" = item."branchCode"
    WHERE sale."branchCode" <> item."branchCode"
       OR (item."inventoryItemId" IS NOT NULL AND inventory."itemId" IS NULL)
  ) THEN RAISE EXCEPTION 'SALE_ITEM_BRANCH_SOURCE_MISMATCH'; END IF;

  IF EXISTS (
    SELECT 1 FROM "Payment" payment
    JOIN "Sale" sale ON sale."id" = payment."saleId"
    LEFT JOIN "PatientBranchRecord" patient
      ON patient."patientId" = payment."patientId" AND patient."branchCode" = payment."branchCode"
    LEFT JOIN "Visit" visit ON visit."id" = payment."visitId"
    LEFT JOIN "PaymentMethodBranch" method
      ON method."methodId" = payment."methodId" AND method."branchCode" = payment."branchCode"
    WHERE sale."branchCode" <> payment."branchCode"
       OR patient."patientId" IS NULL
       OR method."methodId" IS NULL
       OR (payment."visitId" IS NOT NULL AND visit."branchCode" IS DISTINCT FROM payment."branchCode")
  ) THEN RAISE EXCEPTION 'PAYMENT_BRANCH_SOURCE_MISMATCH'; END IF;

  IF EXISTS (
    SELECT 1 FROM "DeliveredProduct" delivered
    JOIN "Sale" sale ON sale."id" = delivered."saleId"
    LEFT JOIN "SaleItem" item ON item."id" = delivered."saleItemId"
    LEFT JOIN "PatientBranchRecord" patient
      ON patient."patientId" = delivered."patientId" AND patient."branchCode" = delivered."branchCode"
    LEFT JOIN "Visit" visit ON visit."id" = delivered."visitId"
    WHERE sale."branchCode" <> delivered."branchCode"
       OR patient."patientId" IS NULL
       OR (delivered."saleItemId" IS NOT NULL AND item."branchCode" IS DISTINCT FROM delivered."branchCode")
       OR (delivered."visitId" IS NOT NULL AND visit."branchCode" IS DISTINCT FROM delivered."branchCode")
  ) THEN RAISE EXCEPTION 'DELIVERED_PRODUCT_BRANCH_SOURCE_MISMATCH'; END IF;

  IF EXISTS (
    SELECT 1 FROM "CashMovement" movement
    LEFT JOIN "CashSession" session ON session."id" = movement."cashSessionId"
    LEFT JOIN "Sale" sale ON sale."id" = movement."saleId"
    LEFT JOIN "Payment" payment ON payment."id" = movement."paymentId"
    LEFT JOIN "PatientBranchRecord" patient
      ON patient."patientId" = movement."patientId" AND patient."branchCode" = movement."branchCode"
    LEFT JOIN "Visit" visit ON visit."id" = movement."visitId"
    LEFT JOIN "CashMovement" original ON original."id" = movement."originalMovementId"
    WHERE (movement."cashSessionId" IS NOT NULL AND session."branchCode" IS DISTINCT FROM movement."branchCode")
       OR (movement."saleId" IS NOT NULL AND sale."branchCode" IS DISTINCT FROM movement."branchCode")
       OR (movement."paymentId" IS NOT NULL AND payment."branchCode" IS DISTINCT FROM movement."branchCode")
       OR (movement."patientId" IS NOT NULL AND patient."patientId" IS NULL)
       OR (movement."visitId" IS NOT NULL AND visit."branchCode" IS DISTINCT FROM movement."branchCode")
       OR (movement."originalMovementId" IS NOT NULL AND original."branchCode" IS DISTINCT FROM movement."branchCode")
  ) THEN RAISE EXCEPTION 'CASH_MOVEMENT_BRANCH_SOURCE_MISMATCH'; END IF;

  IF EXISTS (
    SELECT 1 FROM "CashExpense" expense
    JOIN "CashSession" session ON session."id" = expense."cashSessionId"
    JOIN "CashMovement" movement ON movement."id" = expense."movementId"
    WHERE session."branchCode" <> expense."branchCode"
       OR movement."branchCode" <> expense."branchCode"
       OR movement."cashSessionId" <> expense."cashSessionId"
  ) THEN RAISE EXCEPTION 'CASH_EXPENSE_BRANCH_SOURCE_MISMATCH'; END IF;

  IF EXISTS (
    SELECT 1 FROM "GeneratedDocument" document
    LEFT JOIN "Visit" visit ON visit."id" = document."visitId"
    LEFT JOIN "Prescription" prescription ON prescription."id" = document."prescriptionId"
    LEFT JOIN "Sale" sale ON sale."id" = document."saleId"
    LEFT JOIN "GeneratedDocument" supersedes ON supersedes."id" = document."supersedesId"
    LEFT JOIN "PatientBranchRecord" patient
      ON patient."patientId" = document."patientId" AND patient."branchCode" = document."branchCode"
    WHERE patient."patientId" IS NULL
       OR (document."visitId" IS NOT NULL AND visit."branchCode" IS DISTINCT FROM document."branchCode")
       OR (document."prescriptionId" IS NOT NULL AND prescription."branchCode" IS DISTINCT FROM document."branchCode")
       OR (document."saleId" IS NOT NULL AND sale."branchCode" IS DISTINCT FROM document."branchCode")
       OR (document."supersedesId" IS NOT NULL AND supersedes."branchCode" IS DISTINCT FROM document."branchCode")
  ) THEN RAISE EXCEPTION 'GENERATED_DOCUMENT_BRANCH_SOURCE_MISMATCH'; END IF;

  IF EXISTS (
    WITH expected AS (
      SELECT session."id", session."branchCode",
             session."openingCashCents" + COALESCE(SUM(
               CASE WHEN movement."channel" = 'cash' THEN
                 CASE WHEN movement."type" IN ('expense', 'refund')
                   THEN -movement."amountCents" ELSE movement."amountCents" END
               ELSE 0 END
             ), 0)::integer AS cash,
             COALESCE(SUM(
               CASE WHEN movement."channel" = 'qr' THEN
                 CASE WHEN movement."type" IN ('expense', 'refund')
                   THEN -movement."amountCents" ELSE movement."amountCents" END
               ELSE 0 END
             ), 0)::integer AS qr
      FROM "CashSession" session
      LEFT JOIN "CashMovement" movement
        ON movement."cashSessionId" = session."id"
       AND movement."branchCode" = session."branchCode"
      WHERE session."status" IN ('pending_approval', 'closed')
      GROUP BY session."id", session."branchCode", session."openingCashCents"
    )
    SELECT 1 FROM expected
    LEFT JOIN "CashSessionReconciliation" cash
      ON cash."cashSessionId" = expected."id"
     AND cash."branchCode" = expected."branchCode" AND cash."channel" = 'cash'
    LEFT JOIN "CashSessionReconciliation" qr
      ON qr."cashSessionId" = expected."id"
     AND qr."branchCode" = expected."branchCode" AND qr."channel" = 'qr'
    WHERE cash."expectedCents" IS DISTINCT FROM expected.cash
       OR qr."expectedCents" IS DISTINCT FROM expected.qr
  ) THEN RAISE EXCEPTION 'CASH_SESSION_RECONCILIATION_MISMATCH'; END IF;
END $$;

ALTER TABLE "GeneratedDocument" ALTER COLUMN "branchCode" SET NOT NULL;
ALTER TABLE "SaleItem" ALTER COLUMN "branchCode" SET NOT NULL;
ALTER TABLE "DeliveredProduct" ALTER COLUMN "branchCode" SET NOT NULL;
ALTER TABLE "CashSessionReconciliation" ALTER COLUMN "branchCode" SET NOT NULL;
ALTER TABLE "CashExpense" ALTER COLUMN "branchCode" SET NOT NULL;
ALTER TABLE "CashExpenseBeneficiary" ALTER COLUMN "branchCode" SET NOT NULL;

ALTER TABLE "GeneratedDocument"
  VALIDATE CONSTRAINT "GeneratedDocument_branchCode_fkey",
  VALIDATE CONSTRAINT "GeneratedDocument_patient_branch_fkey",
  VALIDATE CONSTRAINT "GeneratedDocument_visit_branch_fkey",
  VALIDATE CONSTRAINT "GeneratedDocument_prescription_branch_fkey",
  VALIDATE CONSTRAINT "GeneratedDocument_sale_branch_fkey",
  VALIDATE CONSTRAINT "GeneratedDocument_supersedes_branch_fkey";
ALTER TABLE "Sale"
  VALIDATE CONSTRAINT "Sale_patient_branch_fkey",
  VALIDATE CONSTRAINT "Sale_visit_branch_fkey",
  VALIDATE CONSTRAINT "Sale_work_item_branch_fkey",
  VALIDATE CONSTRAINT "Sale_doctor_order_branch_fkey";
ALTER TABLE "SaleItem"
  VALIDATE CONSTRAINT "SaleItem_branchCode_fkey",
  VALIDATE CONSTRAINT "SaleItem_sale_branch_fkey",
  VALIDATE CONSTRAINT "SaleItem_inventory_branch_fkey";
ALTER TABLE "Payment"
  VALIDATE CONSTRAINT "Payment_sale_branch_fkey",
  VALIDATE CONSTRAINT "Payment_patient_branch_fkey",
  VALIDATE CONSTRAINT "Payment_visit_branch_fkey",
  VALIDATE CONSTRAINT "Payment_method_branch_fkey";
ALTER TABLE "DeliveredProduct"
  VALIDATE CONSTRAINT "DeliveredProduct_branchCode_fkey",
  VALIDATE CONSTRAINT "DeliveredProduct_sale_branch_fkey",
  VALIDATE CONSTRAINT "DeliveredProduct_sale_item_branch_fkey",
  VALIDATE CONSTRAINT "DeliveredProduct_patient_branch_fkey",
  VALIDATE CONSTRAINT "DeliveredProduct_visit_branch_fkey";
ALTER TABLE "CashMovement"
  VALIDATE CONSTRAINT "CashMovement_session_branch_fkey",
  VALIDATE CONSTRAINT "CashMovement_sale_branch_fkey",
  VALIDATE CONSTRAINT "CashMovement_payment_branch_fkey",
  VALIDATE CONSTRAINT "CashMovement_patient_branch_fkey",
  VALIDATE CONSTRAINT "CashMovement_visit_branch_fkey",
  VALIDATE CONSTRAINT "CashMovement_original_branch_fkey";
ALTER TABLE "CashSessionReconciliation"
  VALIDATE CONSTRAINT "CashSessionReconciliation_branchCode_fkey",
  VALIDATE CONSTRAINT "CashSessionReconciliation_session_branch_fkey";
ALTER TABLE "CashExpense"
  VALIDATE CONSTRAINT "CashExpense_branchCode_fkey",
  VALIDATE CONSTRAINT "CashExpense_session_branch_fkey",
  VALIDATE CONSTRAINT "CashExpense_movement_branch_fkey";
ALTER TABLE "CashExpenseBeneficiary"
  VALIDATE CONSTRAINT "CashExpenseBeneficiary_branchCode_fkey",
  VALIDATE CONSTRAINT "CashExpenseBeneficiary_expense_branch_fkey";
ALTER TABLE "Purchase" VALIDATE CONSTRAINT "Purchase_source_expense_branch_fkey";
ALTER TABLE "PurchasePayment" VALIDATE CONSTRAINT "PurchasePayment_cash_movement_branch_fkey";

-- Relaciones simples e índices globales sustituidos por sus equivalentes locales.
ALTER TABLE "Sale"
  DROP CONSTRAINT IF EXISTS "Sale_visitId_fkey",
  DROP CONSTRAINT IF EXISTS "Sale_workItemId_fkey",
  DROP CONSTRAINT IF EXISTS "Sale_doctorOrderId_fkey";
ALTER TABLE "GeneratedDocument"
  DROP CONSTRAINT IF EXISTS "GeneratedDocument_visitId_fkey",
  DROP CONSTRAINT IF EXISTS "GeneratedDocument_prescriptionId_fkey",
  DROP CONSTRAINT IF EXISTS "GeneratedDocument_saleId_fkey",
  DROP CONSTRAINT IF EXISTS "GeneratedDocument_supersedesId_fkey";
ALTER TABLE "SaleItem" DROP CONSTRAINT IF EXISTS "SaleItem_saleId_fkey";
ALTER TABLE "Payment"
  DROP CONSTRAINT IF EXISTS "Payment_saleId_fkey",
  DROP CONSTRAINT IF EXISTS "Payment_visitId_fkey";
ALTER TABLE "DeliveredProduct"
  DROP CONSTRAINT IF EXISTS "DeliveredProduct_saleId_fkey",
  DROP CONSTRAINT IF EXISTS "DeliveredProduct_saleItemId_fkey",
  DROP CONSTRAINT IF EXISTS "DeliveredProduct_visitId_fkey";
ALTER TABLE "CashMovement"
  DROP CONSTRAINT IF EXISTS "CashMovement_cashSessionId_fkey",
  DROP CONSTRAINT IF EXISTS "CashMovement_saleId_fkey",
  DROP CONSTRAINT IF EXISTS "CashMovement_paymentId_fkey",
  DROP CONSTRAINT IF EXISTS "CashMovement_visitId_fkey",
  DROP CONSTRAINT IF EXISTS "CashMovement_originalMovementId_fkey";
ALTER TABLE "CashSessionReconciliation" DROP CONSTRAINT IF EXISTS "CashSessionReconciliation_cashSessionId_fkey";
ALTER TABLE "CashExpense"
  DROP CONSTRAINT IF EXISTS "CashExpense_cashSessionId_fkey",
  DROP CONSTRAINT IF EXISTS "CashExpense_movementId_fkey";
ALTER TABLE "CashExpenseBeneficiary" DROP CONSTRAINT IF EXISTS "CashExpenseBeneficiary_cashExpenseId_fkey";
ALTER TABLE "Purchase" DROP CONSTRAINT IF EXISTS "Purchase_sourceCashExpenseId_fkey";
ALTER TABLE "PurchasePayment" DROP CONSTRAINT IF EXISTS "PurchasePayment_cashMovementId_fkey";

DROP INDEX IF EXISTS "GeneratedDocument_documentNumber_key";
DROP INDEX IF EXISTS "GeneratedDocument_supersedesId_key";
DROP INDEX IF EXISTS "GeneratedDocument_seriesKey_version_key";
DROP INDEX IF EXISTS "GeneratedDocument_seriesKey_sourceFingerprint_key";
DROP INDEX IF EXISTS "Sale_patientId_idx";
DROP INDEX IF EXISTS "SaleItem_saleId_idx";
DROP INDEX IF EXISTS "Payment_saleId_idx";
DROP INDEX IF EXISTS "DeliveredProduct_saleId_idx";
DROP INDEX IF EXISTS "CashMovement_cashSessionId_occurredAt_idx";
DROP INDEX IF EXISTS "CashSessionReconciliation_cashSessionId_channel_key";
DROP INDEX IF EXISTS "CashExpense_cashSessionId_occurredAt_idx";
DROP INDEX IF EXISTS "CashExpenseBeneficiary_cashExpenseId_idx";

CREATE OR REPLACE FUNCTION "ensure_cash_session_open"()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."cashSessionId" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "CashSession"
    WHERE "id" = NEW."cashSessionId"
      AND "branchCode" = NEW."branchCode"
      AND "status" = 'open'
  ) THEN
    RAISE EXCEPTION 'cash session is not open in branch'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION "prevent_branch_ownership_change"()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."branchCode" IS DISTINCT FROM OLD."branchCode" THEN
    RAISE EXCEPTION 'branch ownership is immutable';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "Sale_branch_immutable" BEFORE UPDATE ON "Sale"
FOR EACH ROW EXECUTE FUNCTION "prevent_branch_ownership_change"();
CREATE TRIGGER "SaleItem_branch_immutable" BEFORE UPDATE ON "SaleItem"
FOR EACH ROW EXECUTE FUNCTION "prevent_branch_ownership_change"();
CREATE TRIGGER "Payment_branch_immutable" BEFORE UPDATE ON "Payment"
FOR EACH ROW EXECUTE FUNCTION "prevent_branch_ownership_change"();
CREATE TRIGGER "DeliveredProduct_branch_immutable" BEFORE UPDATE ON "DeliveredProduct"
FOR EACH ROW EXECUTE FUNCTION "prevent_branch_ownership_change"();
CREATE TRIGGER "CashMovement_branch_immutable" BEFORE UPDATE ON "CashMovement"
FOR EACH ROW EXECUTE FUNCTION "prevent_branch_ownership_change"();
CREATE TRIGGER "CashSession_branch_immutable" BEFORE UPDATE ON "CashSession"
FOR EACH ROW EXECUTE FUNCTION "prevent_branch_ownership_change"();
CREATE TRIGGER "CashSessionReconciliation_branch_immutable" BEFORE UPDATE ON "CashSessionReconciliation"
FOR EACH ROW EXECUTE FUNCTION "prevent_branch_ownership_change"();
CREATE TRIGGER "CashExpense_branch_immutable" BEFORE UPDATE ON "CashExpense"
FOR EACH ROW EXECUTE FUNCTION "prevent_branch_ownership_change"();
CREATE TRIGGER "CashExpenseBeneficiary_branch_immutable" BEFORE UPDATE ON "CashExpenseBeneficiary"
FOR EACH ROW EXECUTE FUNCTION "prevent_branch_ownership_change"();

CREATE OR REPLACE FUNCTION "assert_cash_session_reconciliation"()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  expected_cash INTEGER;
  expected_qr INTEGER;
BEGIN
  IF NEW."status" IN ('pending_approval', 'closed')
     AND OLD."status" IS DISTINCT FROM NEW."status" THEN
    SELECT NEW."openingCashCents" + COALESCE(SUM(
      CASE WHEN "channel" = 'cash' THEN
        CASE WHEN "type" IN ('expense', 'refund') THEN -"amountCents" ELSE "amountCents" END
      ELSE 0 END
    ), 0)::integer,
    COALESCE(SUM(
      CASE WHEN "channel" = 'qr' THEN
        CASE WHEN "type" IN ('expense', 'refund') THEN -"amountCents" ELSE "amountCents" END
      ELSE 0 END
    ), 0)::integer
    INTO expected_cash, expected_qr
    FROM "CashMovement"
    WHERE "cashSessionId" = NEW."id" AND "branchCode" = NEW."branchCode";

    IF NOT EXISTS (
      SELECT 1 FROM "CashSessionReconciliation"
      WHERE "cashSessionId" = NEW."id" AND "branchCode" = NEW."branchCode"
        AND "channel" = 'cash' AND "expectedCents" = expected_cash
    ) OR NOT EXISTS (
      SELECT 1 FROM "CashSessionReconciliation"
      WHERE "cashSessionId" = NEW."id" AND "branchCode" = NEW."branchCode"
        AND "channel" = 'qr' AND "expectedCents" = expected_qr
    ) THEN
      RAISE EXCEPTION 'cash session reconciliation does not match branch ledger';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "CashSession_reconciliation_matches_branch"
BEFORE UPDATE OF "status" ON "CashSession"
FOR EACH ROW EXECUTE FUNCTION "assert_cash_session_reconciliation"();

COMMIT;
