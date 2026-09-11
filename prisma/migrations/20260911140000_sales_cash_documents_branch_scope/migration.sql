-- Tarea 12: expansión segura de la sede en ventas, Caja y documentos.
-- Las columnas nuevas se derivan únicamente de un padre operativo inequívoco.
BEGIN;

ALTER TABLE "GeneratedDocument" ADD COLUMN "branchCode" TEXT;
ALTER TABLE "SaleItem" ADD COLUMN "branchCode" TEXT;
ALTER TABLE "DeliveredProduct" ADD COLUMN "branchCode" TEXT;
ALTER TABLE "CashSessionReconciliation" ADD COLUMN "branchCode" TEXT;
ALTER TABLE "CashExpense" ADD COLUMN "branchCode" TEXT;
ALTER TABLE "CashExpenseBeneficiary" ADD COLUMN "branchCode" TEXT;

DROP TRIGGER IF EXISTS "GeneratedDocument_append_only_update" ON "GeneratedDocument";
DROP TRIGGER IF EXISTS "GeneratedDocument_append_only_delete" ON "GeneratedDocument";

UPDATE "SaleItem" child
SET "branchCode" = parent."branchCode"
FROM "Sale" parent
WHERE parent."id" = child."saleId";

UPDATE "DeliveredProduct" child
SET "branchCode" = parent."branchCode"
FROM "Sale" parent
WHERE parent."id" = child."saleId";

UPDATE "CashSessionReconciliation" child
SET "branchCode" = parent."branchCode"
FROM "CashSession" parent
WHERE parent."id" = child."cashSessionId";

UPDATE "CashExpense" child
SET "branchCode" = parent."branchCode"
FROM "CashSession" parent
WHERE parent."id" = child."cashSessionId";

UPDATE "CashExpenseBeneficiary" child
SET "branchCode" = parent."branchCode"
FROM "CashExpense" parent
WHERE parent."id" = child."cashExpenseId";

UPDATE "GeneratedDocument" document
SET "branchCode" = source."branchCode"
FROM (
  SELECT document_source."id",
         CASE document_source."kind"
           WHEN 'prescription' THEN prescription."branchCode"
           WHEN 'internal_sale_receipt' THEN sale."branchCode"
         END AS "branchCode"
  FROM "GeneratedDocument" document_source
  LEFT JOIN "Prescription" prescription
    ON prescription."id" = document_source."prescriptionId"
  LEFT JOIN "Sale" sale
    ON sale."id" = document_source."saleId"
) source
WHERE source."id" = document."id";

CREATE UNIQUE INDEX "Sale_id_branchCode_key" ON "Sale"("id", "branchCode");
CREATE UNIQUE INDEX "Sale_doctorOrderId_branchCode_key" ON "Sale"("doctorOrderId", "branchCode");
CREATE UNIQUE INDEX "GeneratedDocument_id_branchCode_key" ON "GeneratedDocument"("id", "branchCode");
CREATE UNIQUE INDEX "GeneratedDocument_branchCode_documentNumber_key" ON "GeneratedDocument"("branchCode", "documentNumber");
CREATE UNIQUE INDEX "GeneratedDocument_branchCode_seriesKey_version_key" ON "GeneratedDocument"("branchCode", "seriesKey", "version");
CREATE UNIQUE INDEX "GeneratedDocument_branchCode_seriesKey_sourceFingerprint_key" ON "GeneratedDocument"("branchCode", "seriesKey", "sourceFingerprint");
CREATE UNIQUE INDEX "GeneratedDocument_supersedesId_branchCode_key" ON "GeneratedDocument"("supersedesId", "branchCode");
CREATE UNIQUE INDEX "SaleItem_id_branchCode_key" ON "SaleItem"("id", "branchCode");
CREATE UNIQUE INDEX "Payment_id_branchCode_key" ON "Payment"("id", "branchCode");
CREATE UNIQUE INDEX "CashMovement_id_branchCode_key" ON "CashMovement"("id", "branchCode");
CREATE UNIQUE INDEX "CashExpense_id_branchCode_key" ON "CashExpense"("id", "branchCode");
CREATE UNIQUE INDEX "CashExpense_movementId_branchCode_key" ON "CashExpense"("movementId", "branchCode");
CREATE UNIQUE INDEX "Purchase_sourceCashExpenseId_branchCode_key" ON "Purchase"("sourceCashExpenseId", "branchCode");
CREATE UNIQUE INDEX "CashSessionReconciliation_cashSessionId_branchCode_channel_key"
  ON "CashSessionReconciliation"("cashSessionId", "branchCode", "channel");

CREATE INDEX "Sale_patientId_branchCode_idx" ON "Sale"("patientId", "branchCode");
CREATE INDEX "SaleItem_saleId_branchCode_idx" ON "SaleItem"("saleId", "branchCode");
CREATE INDEX "Payment_saleId_branchCode_idx" ON "Payment"("saleId", "branchCode");
CREATE INDEX "DeliveredProduct_saleId_branchCode_idx" ON "DeliveredProduct"("saleId", "branchCode");
CREATE INDEX "CashMovement_cashSessionId_branchCode_occurredAt_idx" ON "CashMovement"("cashSessionId", "branchCode", "occurredAt");
CREATE INDEX "CashSessionReconciliation_branchCode_createdAt_idx" ON "CashSessionReconciliation"("branchCode", "createdAt");
CREATE INDEX "CashExpense_cashSessionId_branchCode_occurredAt_idx" ON "CashExpense"("cashSessionId", "branchCode", "occurredAt");
CREATE INDEX "CashExpenseBeneficiary_cashExpenseId_branchCode_idx" ON "CashExpenseBeneficiary"("cashExpenseId", "branchCode");

ALTER TABLE "GeneratedDocument"
  ADD CONSTRAINT "GeneratedDocument_branchCode_fkey" FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID,
  ADD CONSTRAINT "GeneratedDocument_patient_branch_fkey" FOREIGN KEY ("patientId", "branchCode") REFERENCES "PatientBranchRecord"("patientId", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID,
  ADD CONSTRAINT "GeneratedDocument_visit_branch_fkey" FOREIGN KEY ("visitId", "branchCode") REFERENCES "Visit"("id", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID,
  ADD CONSTRAINT "GeneratedDocument_prescription_branch_fkey" FOREIGN KEY ("prescriptionId", "branchCode") REFERENCES "Prescription"("id", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID,
  ADD CONSTRAINT "GeneratedDocument_sale_branch_fkey" FOREIGN KEY ("saleId", "branchCode") REFERENCES "Sale"("id", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID,
  ADD CONSTRAINT "GeneratedDocument_supersedes_branch_fkey" FOREIGN KEY ("supersedesId", "branchCode") REFERENCES "GeneratedDocument"("id", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;

ALTER TABLE "Sale"
  ADD CONSTRAINT "Sale_patient_branch_fkey" FOREIGN KEY ("patientId", "branchCode") REFERENCES "PatientBranchRecord"("patientId", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID,
  ADD CONSTRAINT "Sale_visit_branch_fkey" FOREIGN KEY ("visitId", "branchCode") REFERENCES "Visit"("id", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID,
  ADD CONSTRAINT "Sale_work_item_branch_fkey" FOREIGN KEY ("workItemId", "branchCode") REFERENCES "VisitWorkItem"("id", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID,
  ADD CONSTRAINT "Sale_doctor_order_branch_fkey" FOREIGN KEY ("doctorOrderId", "branchCode") REFERENCES "DoctorOrder"("id", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;

ALTER TABLE "SaleItem"
  ADD CONSTRAINT "SaleItem_branchCode_fkey" FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID,
  ADD CONSTRAINT "SaleItem_sale_branch_fkey" FOREIGN KEY ("saleId", "branchCode") REFERENCES "Sale"("id", "branchCode") ON DELETE CASCADE ON UPDATE CASCADE NOT VALID,
  ADD CONSTRAINT "SaleItem_inventory_branch_fkey" FOREIGN KEY ("inventoryItemId", "branchCode") REFERENCES "BranchInventoryItem"("itemId", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;

ALTER TABLE "Payment"
  ADD CONSTRAINT "Payment_sale_branch_fkey" FOREIGN KEY ("saleId", "branchCode") REFERENCES "Sale"("id", "branchCode") ON DELETE CASCADE ON UPDATE CASCADE NOT VALID,
  ADD CONSTRAINT "Payment_patient_branch_fkey" FOREIGN KEY ("patientId", "branchCode") REFERENCES "PatientBranchRecord"("patientId", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID,
  ADD CONSTRAINT "Payment_visit_branch_fkey" FOREIGN KEY ("visitId", "branchCode") REFERENCES "Visit"("id", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID,
  ADD CONSTRAINT "Payment_method_branch_fkey" FOREIGN KEY ("methodId", "branchCode") REFERENCES "PaymentMethodBranch"("methodId", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;

ALTER TABLE "DeliveredProduct"
  ADD CONSTRAINT "DeliveredProduct_branchCode_fkey" FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID,
  ADD CONSTRAINT "DeliveredProduct_sale_branch_fkey" FOREIGN KEY ("saleId", "branchCode") REFERENCES "Sale"("id", "branchCode") ON DELETE CASCADE ON UPDATE CASCADE NOT VALID,
  ADD CONSTRAINT "DeliveredProduct_sale_item_branch_fkey" FOREIGN KEY ("saleItemId", "branchCode") REFERENCES "SaleItem"("id", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID,
  ADD CONSTRAINT "DeliveredProduct_patient_branch_fkey" FOREIGN KEY ("patientId", "branchCode") REFERENCES "PatientBranchRecord"("patientId", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID,
  ADD CONSTRAINT "DeliveredProduct_visit_branch_fkey" FOREIGN KEY ("visitId", "branchCode") REFERENCES "Visit"("id", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;

ALTER TABLE "CashMovement"
  ADD CONSTRAINT "CashMovement_session_branch_fkey" FOREIGN KEY ("cashSessionId", "branchCode") REFERENCES "CashSession"("id", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID,
  ADD CONSTRAINT "CashMovement_sale_branch_fkey" FOREIGN KEY ("saleId", "branchCode") REFERENCES "Sale"("id", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID,
  ADD CONSTRAINT "CashMovement_payment_branch_fkey" FOREIGN KEY ("paymentId", "branchCode") REFERENCES "Payment"("id", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID,
  ADD CONSTRAINT "CashMovement_patient_branch_fkey" FOREIGN KEY ("patientId", "branchCode") REFERENCES "PatientBranchRecord"("patientId", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID,
  ADD CONSTRAINT "CashMovement_visit_branch_fkey" FOREIGN KEY ("visitId", "branchCode") REFERENCES "Visit"("id", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID,
  ADD CONSTRAINT "CashMovement_original_branch_fkey" FOREIGN KEY ("originalMovementId", "branchCode") REFERENCES "CashMovement"("id", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;

ALTER TABLE "CashSessionReconciliation"
  ADD CONSTRAINT "CashSessionReconciliation_branchCode_fkey" FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID,
  ADD CONSTRAINT "CashSessionReconciliation_session_branch_fkey" FOREIGN KEY ("cashSessionId", "branchCode") REFERENCES "CashSession"("id", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;

ALTER TABLE "CashExpense"
  ADD CONSTRAINT "CashExpense_branchCode_fkey" FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID,
  ADD CONSTRAINT "CashExpense_session_branch_fkey" FOREIGN KEY ("cashSessionId", "branchCode") REFERENCES "CashSession"("id", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID,
  ADD CONSTRAINT "CashExpense_movement_branch_fkey" FOREIGN KEY ("movementId", "branchCode") REFERENCES "CashMovement"("id", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;

ALTER TABLE "CashExpenseBeneficiary"
  ADD CONSTRAINT "CashExpenseBeneficiary_branchCode_fkey" FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID,
  ADD CONSTRAINT "CashExpenseBeneficiary_expense_branch_fkey" FOREIGN KEY ("cashExpenseId", "branchCode") REFERENCES "CashExpense"("id", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;

ALTER TABLE "Purchase"
  ADD CONSTRAINT "Purchase_source_expense_branch_fkey" FOREIGN KEY ("sourceCashExpenseId", "branchCode") REFERENCES "CashExpense"("id", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
ALTER TABLE "PurchasePayment"
  ADD CONSTRAINT "PurchasePayment_cash_movement_branch_fkey" FOREIGN KEY ("cashMovementId", "branchCode") REFERENCES "CashMovement"("id", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;

CREATE OR REPLACE FUNCTION "prevent_generated_document_mutation"()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Generated documents are append-only';
  END IF;
  IF NEW."id" = OLD."id"
     AND (
       NEW."branchCode" IS NOT DISTINCT FROM OLD."branchCode"
       OR (OLD."branchCode" IS NULL AND NEW."branchCode" IS NOT NULL)
     )
     AND NEW."kind" = OLD."kind"
     AND NEW."documentNumber" = OLD."documentNumber"
     AND NEW."seriesKey" = OLD."seriesKey"
     AND NEW."version" = OLD."version"
     AND NEW."schemaVersion" = OLD."schemaVersion"
     AND NEW."patientId" = OLD."patientId"
     AND NEW."visitId" IS NOT DISTINCT FROM OLD."visitId"
     AND NEW."prescriptionId" IS NOT DISTINCT FROM OLD."prescriptionId"
     AND NEW."saleId" IS NOT DISTINCT FROM OLD."saleId"
     AND NEW."generatedById" = OLD."generatedById"
     AND NEW."supersedesId" IS NOT DISTINCT FROM OLD."supersedesId"
     AND NEW."sourceFingerprint" = OLD."sourceFingerprint"
     AND NEW."snapshot"::text = OLD."snapshot"::text
     AND NEW."generatedAt" = OLD."generatedAt"
  THEN RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Generated documents are append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "GeneratedDocument_append_only_update"
BEFORE UPDATE ON "GeneratedDocument"
FOR EACH ROW EXECUTE FUNCTION "prevent_generated_document_mutation"();
CREATE TRIGGER "GeneratedDocument_append_only_delete"
BEFORE DELETE ON "GeneratedDocument"
FOR EACH ROW EXECUTE FUNCTION "prevent_generated_document_mutation"();

COMMIT;
