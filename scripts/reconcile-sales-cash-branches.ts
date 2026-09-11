import { createHash } from "node:crypto";
import { Pool, type PoolClient } from "pg";
import { reportScriptError } from "./safe-error";

type Finding = { entityType: string; entityId: string; issue: string };

async function loadFindings(client: PoolClient): Promise<Finding[]> {
  const result = await client.query<Finding>(`
    SELECT 'generated_document'::text AS "entityType", "id" AS "entityId",
           'missing_branch'::text AS issue
      FROM "GeneratedDocument" WHERE "branchCode" IS NULL
    UNION ALL SELECT 'sale_item', "id", 'missing_branch'
      FROM "SaleItem" WHERE "branchCode" IS NULL
    UNION ALL SELECT 'delivered_product', "id", 'missing_branch'
      FROM "DeliveredProduct" WHERE "branchCode" IS NULL
    UNION ALL SELECT 'cash_reconciliation', "id", 'missing_branch'
      FROM "CashSessionReconciliation" WHERE "branchCode" IS NULL
    UNION ALL SELECT 'cash_expense', "id", 'missing_branch'
      FROM "CashExpense" WHERE "branchCode" IS NULL
    UNION ALL SELECT 'cash_beneficiary', "id", 'missing_branch'
      FROM "CashExpenseBeneficiary" WHERE "branchCode" IS NULL
    UNION ALL
    SELECT 'sale', sale."id", 'branch_source_mismatch'
      FROM "Sale" sale
      LEFT JOIN "PatientBranchRecord" patient
        ON patient."patientId" = sale."patientId" AND patient."branchCode" = sale."branchCode"
      LEFT JOIN "Visit" visit ON visit."id" = sale."visitId"
     WHERE patient."patientId" IS NULL
        OR (sale."visitId" IS NOT NULL AND visit."branchCode" IS DISTINCT FROM sale."branchCode")
    UNION ALL
    SELECT 'payment', payment."id", 'branch_source_mismatch'
      FROM "Payment" payment
      JOIN "Sale" sale ON sale."id" = payment."saleId"
      LEFT JOIN "PaymentMethodBranch" method
        ON method."methodId" = payment."methodId" AND method."branchCode" = payment."branchCode"
     WHERE sale."branchCode" <> payment."branchCode" OR method."methodId" IS NULL
    UNION ALL
    SELECT 'generated_document', document."id", 'branch_source_mismatch'
      FROM "GeneratedDocument" document
      LEFT JOIN "Prescription" prescription ON prescription."id" = document."prescriptionId"
      LEFT JOIN "Sale" sale ON sale."id" = document."saleId"
     WHERE (document."prescriptionId" IS NOT NULL AND prescription."branchCode" IS DISTINCT FROM document."branchCode")
        OR (document."saleId" IS NOT NULL AND sale."branchCode" IS DISTINCT FROM document."branchCode")
    UNION ALL
    SELECT 'sale', sale."id", 'financial_totals_mismatch'
      FROM "Sale" sale
      LEFT JOIN (
        SELECT "saleId", COALESCE(SUM("totalCents"), 0)::integer AS subtotal
        FROM "SaleItem" GROUP BY "saleId"
      ) items ON items."saleId" = sale."id"
      LEFT JOIN (
        SELECT payment."saleId",
               COALESCE(SUM(payment."amountCents"), 0)::integer
               - COALESCE(SUM(refunds.amount), 0)::integer AS paid
        FROM "Payment" payment
        LEFT JOIN (
          SELECT original."paymentId", SUM(correction."amountCents")::integer AS amount
          FROM "CashMovement" original
          JOIN "CashMovement" correction ON correction."originalMovementId" = original."id"
          WHERE correction."type" = 'refund'
          GROUP BY original."paymentId"
        ) refunds ON refunds."paymentId" = payment."id"
        GROUP BY payment."saleId"
      ) payments ON payments."saleId" = sale."id"
     WHERE COALESCE(items.subtotal, 0) <> sale."subtotalCents"
        OR sale."totalCents" <> sale."subtotalCents" - sale."discountCents"
        OR COALESCE(payments.paid, 0) <> sale."paidCents"
        OR GREATEST(sale."totalCents" - COALESCE(payments.paid, 0), 0) <> sale."balanceCents"
    UNION ALL
    SELECT 'cash_movement', movement."id", 'session_branch_mismatch'
      FROM "CashMovement" movement
      JOIN "CashSession" session ON session."id" = movement."cashSessionId"
     WHERE movement."branchCode" <> session."branchCode"
    UNION ALL
    SELECT 'cash_expense', expense."id", 'session_or_movement_branch_mismatch'
      FROM "CashExpense" expense
      JOIN "CashSession" session ON session."id" = expense."cashSessionId"
      JOIN "CashMovement" movement ON movement."id" = expense."movementId"
     WHERE expense."branchCode" IS DISTINCT FROM session."branchCode"
        OR expense."branchCode" IS DISTINCT FROM movement."branchCode"
        OR expense."cashSessionId" <> movement."cashSessionId"
    UNION ALL
    SELECT 'cash_session', expected."id", 'reconciliation_mismatch'
      FROM (
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
      ) expected
      LEFT JOIN "CashSessionReconciliation" cash
        ON cash."cashSessionId" = expected."id"
       AND cash."branchCode" = expected."branchCode" AND cash."channel" = 'cash'
      LEFT JOIN "CashSessionReconciliation" qr
        ON qr."cashSessionId" = expected."id"
       AND qr."branchCode" = expected."branchCode" AND qr."channel" = 'qr'
     WHERE cash."expectedCents" IS DISTINCT FROM expected.cash
        OR qr."expectedCents" IS DISTINCT FROM expected.qr
    ORDER BY 1, 2, 3
  `);
  return result.rows;
}

async function main() {
  if (process.argv.includes("--help")) {
    console.log(`Uso: pnpm branch:reconcile:cash

Diagnóstico de solo lectura. Informa únicamente IDs técnicos; nunca corrige ni
reescribe evidencia monetaria. Ejecútalo después de la migración expansiva y
antes del endurecimiento de la Tarea 12.`);
    return;
  }
  if (process.argv.includes("--apply")) {
    throw new Error("Este reconciliador es deliberadamente de solo lectura.");
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    const findings = await loadFindings(client);
    const checksum = createHash("sha256")
      .update(JSON.stringify(findings))
      .digest("hex");
    console.log(`Hallazgos: ${findings.length}`);
    console.log(`Checksum: ${checksum}`);
    for (const finding of findings) {
      console.log(`  ${finding.entityType}:${finding.entityId}:${finding.issue}`);
    }
    console.log("Solo lectura: no se modificó la base.");
    if (findings.length > 0) process.exitCode = 2;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  reportScriptError("sales cash branch reconciliation", error);
  process.exitCode = 1;
});
