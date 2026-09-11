-- Barrido acumulado de tenencia. Devuelve todos los conteos y aborta si uno
-- es distinto de cero. No modifica datos persistentes.
CREATE TEMP TABLE branch_isolation_findings (
  check_name TEXT PRIMARY KEY,
  violations BIGINT NOT NULL
);

DO $$
DECLARE
  scoped_table RECORD;
  missing_count BIGINT;
BEGIN
  FOR scoped_table IN
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND (
        (column_name = 'branchCode' AND table_name <> 'AuditEvent')
        OR column_name IN ('sourceBranchCode', 'destinationBranchCode')
      )
    ORDER BY table_name, column_name
  LOOP
    EXECUTE format(
      'SELECT COUNT(*) FROM %I WHERE %I IS NULL',
      scoped_table.table_name,
      scoped_table.column_name
    ) INTO missing_count;
    INSERT INTO branch_isolation_findings(check_name, violations)
    VALUES (
      format('required-branch:%s.%s', scoped_table.table_name, scoped_table.column_name),
      missing_count
    );
  END LOOP;
END $$;

INSERT INTO branch_isolation_findings(check_name, violations)
SELECT 'audit-scope-contract', COUNT(*)
FROM "AuditEvent"
WHERE ("scope" = 'branch' AND "branchCode" IS NULL)
   OR ("scope" = 'platform' AND "branchCode" IS NOT NULL);

-- Toda tabla operacional que repite patientId y visitId debe concordar con la
-- identidad y la sede de la visita referenciada.
DO $$
DECLARE
  scoped_table RECORD;
  crossing_count BIGINT;
BEGIN
  FOR scoped_table IN
    SELECT table_name
    FROM information_schema.columns
    WHERE table_schema = current_schema()
    GROUP BY table_name
    HAVING COUNT(*) FILTER (WHERE column_name = 'patientId') > 0
       AND COUNT(*) FILTER (WHERE column_name = 'visitId') > 0
       AND COUNT(*) FILTER (WHERE column_name = 'branchCode') > 0
    ORDER BY table_name
  LOOP
    EXECUTE format(
      'SELECT COUNT(*) FROM %I operational_row '
      'JOIN "Visit" visit ON visit."id" = operational_row."visitId" '
      'WHERE operational_row."visitId" IS NOT NULL '
      'AND (operational_row."branchCode" <> visit."branchCode" '
      'OR operational_row."patientId" <> visit."patientId")',
      scoped_table.table_name
    ) INTO crossing_count;
    INSERT INTO branch_isolation_findings(check_name, violations)
    VALUES (format('patient-visit:%s', scoped_table.table_name), crossing_count);
  END LOOP;
END $$;

INSERT INTO branch_isolation_findings(check_name, violations)
SELECT 'sale-payment', COUNT(*)
FROM "Payment" payment
JOIN "Sale" sale ON sale."id" = payment."saleId"
WHERE payment."branchCode" <> sale."branchCode"
   OR payment."patientId" <> sale."patientId"
   OR payment."visitId" IS DISTINCT FROM sale."visitId";

INSERT INTO branch_isolation_findings(check_name, violations)
SELECT 'cash-movement-session', COUNT(*)
FROM "CashMovement" movement
JOIN "CashSession" session ON session."id" = movement."cashSessionId"
WHERE movement."branchCode" <> session."branchCode";

INSERT INTO branch_isolation_findings(check_name, violations)
SELECT 'cash-movement-sale', COUNT(*)
FROM "CashMovement" movement
JOIN "Sale" sale ON sale."id" = movement."saleId"
WHERE movement."branchCode" <> sale."branchCode"
   OR movement."patientId" IS DISTINCT FROM sale."patientId"
   OR movement."visitId" IS DISTINCT FROM sale."visitId";

INSERT INTO branch_isolation_findings(check_name, violations)
SELECT 'cash-movement-payment', COUNT(*)
FROM "CashMovement" movement
JOIN "Payment" payment ON payment."id" = movement."paymentId"
WHERE movement."branchCode" <> payment."branchCode"
   OR movement."saleId" IS DISTINCT FROM payment."saleId"
   OR movement."patientId" IS DISTINCT FROM payment."patientId"
   OR movement."visitId" IS DISTINCT FROM payment."visitId";

INSERT INTO branch_isolation_findings(check_name, violations)
SELECT 'cash-expense-movement-session', COUNT(*)
FROM "CashExpense" expense
JOIN "CashMovement" movement ON movement."id" = expense."movementId"
JOIN "CashSession" session ON session."id" = expense."cashSessionId"
WHERE expense."branchCode" <> movement."branchCode"
   OR expense."branchCode" <> session."branchCode"
   OR movement."cashSessionId" IS DISTINCT FROM expense."cashSessionId";

INSERT INTO branch_isolation_findings(check_name, violations)
SELECT 'purchase-receipt', COUNT(*)
FROM "PurchaseReceipt" receipt
JOIN "Purchase" purchase ON purchase."id" = receipt."purchaseId"
WHERE receipt."branchCode" <> purchase."branchCode";

INSERT INTO branch_isolation_findings(check_name, violations)
SELECT 'purchase-receipt-line', COUNT(*)
FROM "PurchaseReceiptLine" receipt_line
JOIN "PurchaseReceipt" receipt ON receipt."id" = receipt_line."receiptId"
JOIN "PurchaseLine" purchase_line ON purchase_line."id" = receipt_line."purchaseLineId"
WHERE receipt_line."branchCode" <> receipt."branchCode"
   OR receipt_line."branchCode" <> purchase_line."branchCode"
   OR receipt."purchaseId" <> purchase_line."purchaseId"
   OR receipt_line."itemId" <> purchase_line."itemId";

INSERT INTO branch_isolation_findings(check_name, violations)
SELECT 'purchase-lot', COUNT(*)
FROM "InventoryLot" lot
LEFT JOIN "Purchase" purchase ON purchase."id" = lot."purchaseId"
LEFT JOIN "PurchaseLine" purchase_line ON purchase_line."id" = lot."purchaseLineId"
LEFT JOIN "PurchaseReceipt" receipt ON receipt."id" = lot."receiptId"
WHERE (purchase."id" IS NOT NULL AND lot."branchCode" <> purchase."branchCode")
   OR (purchase_line."id" IS NOT NULL AND (
        lot."branchCode" <> purchase_line."branchCode"
        OR lot."purchaseId" IS DISTINCT FROM purchase_line."purchaseId"
        OR lot."itemId" <> purchase_line."itemId"
      ))
   OR (receipt."id" IS NOT NULL AND (
        lot."branchCode" <> receipt."branchCode"
        OR lot."purchaseId" IS DISTINCT FROM receipt."purchaseId"
      ));

INSERT INTO branch_isolation_findings(check_name, violations)
SELECT 'receipt-line-lot', COUNT(*)
FROM "PurchaseReceiptLine" receipt_line
JOIN "InventoryLot" lot ON lot."id" = receipt_line."lotId"
WHERE receipt_line."branchCode" <> lot."branchCode"
   OR receipt_line."itemId" <> lot."itemId"
   OR receipt_line."receiptId" IS DISTINCT FROM lot."receiptId"
   OR receipt_line."purchaseLineId" IS DISTINCT FROM lot."purchaseLineId";

INSERT INTO branch_isolation_findings(check_name, violations)
SELECT 'inventory-movement-sources', COUNT(*)
FROM "InventoryMovement" movement
LEFT JOIN "Sale" sale ON sale."id" = movement."saleId"
LEFT JOIN "SaleItem" sale_item ON sale_item."id" = movement."saleItemId"
LEFT JOIN "Purchase" purchase ON purchase."id" = movement."purchaseId"
LEFT JOIN "PurchaseLine" purchase_line ON purchase_line."id" = movement."purchaseLineId"
LEFT JOIN "PurchaseReceipt" receipt ON receipt."id" = movement."receiptId"
LEFT JOIN "PurchaseReceiptLine" receipt_line ON receipt_line."id" = movement."receiptLineId"
LEFT JOIN "InventoryLot" lot ON lot."id" = movement."lotId"
WHERE (sale."id" IS NOT NULL AND movement."branchCode" <> sale."branchCode")
   OR (sale_item."id" IS NOT NULL AND (
        movement."branchCode" <> sale_item."branchCode"
        OR movement."saleId" IS DISTINCT FROM sale_item."saleId"
      ))
   OR (purchase."id" IS NOT NULL AND movement."branchCode" <> purchase."branchCode")
   OR (purchase_line."id" IS NOT NULL AND (
        movement."branchCode" <> purchase_line."branchCode"
        OR movement."purchaseId" IS DISTINCT FROM purchase_line."purchaseId"
        OR movement."itemId" <> purchase_line."itemId"
      ))
   OR (receipt."id" IS NOT NULL AND (
        movement."branchCode" <> receipt."branchCode"
        OR movement."purchaseId" IS DISTINCT FROM receipt."purchaseId"
      ))
   OR (receipt_line."id" IS NOT NULL AND (
        movement."branchCode" <> receipt_line."branchCode"
        OR movement."receiptId" IS DISTINCT FROM receipt_line."receiptId"
        OR movement."purchaseLineId" IS DISTINCT FROM receipt_line."purchaseLineId"
        OR movement."itemId" <> receipt_line."itemId"
      ))
   OR (lot."id" IS NOT NULL AND (
        movement."branchCode" <> lot."branchCode"
        OR movement."itemId" <> lot."itemId"
      ));

INSERT INTO branch_isolation_findings(check_name, violations)
SELECT 'generated-document-sources', COUNT(*)
FROM "GeneratedDocument" document
LEFT JOIN "Visit" visit ON visit."id" = document."visitId"
LEFT JOIN "Prescription" prescription ON prescription."id" = document."prescriptionId"
LEFT JOIN "Sale" sale ON sale."id" = document."saleId"
LEFT JOIN "GeneratedDocument" previous ON previous."id" = document."supersedesId"
WHERE (visit."id" IS NOT NULL AND (
        document."branchCode" <> visit."branchCode"
        OR document."patientId" <> visit."patientId"
      ))
   OR (prescription."id" IS NOT NULL AND (
        document."branchCode" <> prescription."branchCode"
        OR document."patientId" <> prescription."patientId"
      ))
   OR (sale."id" IS NOT NULL AND (
        document."branchCode" <> sale."branchCode"
        OR document."patientId" <> sale."patientId"
      ))
   OR (previous."id" IS NOT NULL AND document."branchCode" <> previous."branchCode");

INSERT INTO branch_isolation_findings(check_name, violations)
SELECT 'purchase-document-sources', COUNT(*)
FROM "PurchaseDocument" document
JOIN "Purchase" purchase ON purchase."id" = document."purchaseId"
LEFT JOIN "PurchaseReceipt" receipt ON receipt."id" = document."receiptId"
WHERE document."branchCode" <> purchase."branchCode"
   OR (receipt."id" IS NOT NULL AND (
        document."branchCode" <> receipt."branchCode"
        OR document."purchaseId" <> receipt."purchaseId"
      ));

SELECT check_name, violations
FROM branch_isolation_findings
ORDER BY check_name;

-- ASSERT_BRANCH_ISOLATION
DO $$
DECLARE
  total_violations BIGINT;
BEGIN
  SELECT COALESCE(SUM(violations), 0)
  INTO total_violations
  FROM branch_isolation_findings;

  IF total_violations <> 0 THEN
    RAISE EXCEPTION
      'Aislamiento por sucursal rechazado: % cruce(s) o tenencia(s) nula(s). Consulte branch_isolation_findings.',
      total_violations;
  END IF;
END $$;
