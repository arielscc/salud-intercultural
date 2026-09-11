import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { Pool, type PoolClient } from "pg";
import { reportScriptError } from "./safe-error";

const confirmationToken = "APPLY_INVENTORY_LEDGER_RECONCILIATION";

type AlertDecision = { alertId: string; branchCode: string };
type PendingRow = { entityType: string; entityId: string };
type BalanceMismatch = {
  itemId: string;
  branchCode: string;
  balanceStock: number;
  ledgerStock: number;
};

function argumentValue(args: string[], name: string) {
  const inline = args.find((argument) => argument.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1);
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function parseDecisions(path?: string): AlertDecision[] {
  if (!path) return [];
  const value: unknown = JSON.parse(readFileSync(path, "utf8"));
  if (!Array.isArray(value)) throw new Error("Las decisiones deben ser un arreglo JSON.");
  return value.map((entry) => {
    if (!entry || typeof entry !== "object") throw new Error("Decisión inválida.");
    const candidate = entry as Record<string, unknown>;
    if (
      typeof candidate.alertId !== "string" ||
      candidate.alertId.length === 0 ||
      typeof candidate.branchCode !== "string" ||
      candidate.branchCode.length === 0
    ) {
      throw new Error("Cada decisión necesita alertId y branchCode.");
    }
    return { alertId: candidate.alertId, branchCode: candidate.branchCode };
  });
}

async function loadPending(client: PoolClient) {
  const missing = await client.query<PendingRow>(`
    SELECT 'purchase_line'::text AS "entityType", "id" AS "entityId"
      FROM "PurchaseLine" WHERE "branchCode" IS NULL
    UNION ALL SELECT 'purchase_receipt_line', "id"
      FROM "PurchaseReceiptLine" WHERE "branchCode" IS NULL
    UNION ALL SELECT 'inventory_lot_adjustment', "id"
      FROM "InventoryLotAdjustment" WHERE "branchCode" IS NULL
    UNION ALL SELECT 'purchase_document', "id"
      FROM "PurchaseDocument" WHERE "branchCode" IS NULL
    UNION ALL SELECT 'inventory_transfer_lot_allocation', "id"
      FROM "InventoryTransferLotAllocation"
      WHERE "sourceBranchCode" IS NULL OR "destinationBranchCode" IS NULL
    ORDER BY 1, 2
  `);
  const alerts = await client.query<{ alertId: string }>(`
    SELECT "id" AS "alertId" FROM "InventoryAlert"
    WHERE "branchCode" IS NULL ORDER BY "id"
  `);
  const balances = await client.query<BalanceMismatch>(`
    WITH ledger AS (
      SELECT "itemId", "branchCode", SUM("quantityDelta")::integer AS stock
      FROM "InventoryMovement"
      GROUP BY "itemId", "branchCode"
    )
    SELECT configured."itemId", configured."branchCode",
           COALESCE(balance."currentStock", 0)::integer AS "balanceStock",
           COALESCE(ledger.stock, 0)::integer AS "ledgerStock"
    FROM "BranchInventoryItem" configured
    LEFT JOIN "BranchInventoryBalance" balance
      ON balance."itemId" = configured."itemId"
     AND balance."branchCode" = configured."branchCode"
    LEFT JOIN ledger
      ON ledger."itemId" = configured."itemId"
     AND ledger."branchCode" = configured."branchCode"
    WHERE COALESCE(balance."currentStock", 0) <> COALESCE(ledger.stock, 0)
    ORDER BY configured."branchCode", configured."itemId"
  `);
  const invalidTransfers = await client.query<{ transferId: string }>(`
    SELECT transfer."id" AS "transferId"
    FROM "InventoryTransfer" transfer
    LEFT JOIN "InventoryMovement" source ON source."id" = transfer."sourceMovementId"
    LEFT JOIN "InventoryMovement" destination ON destination."id" = transfer."destinationMovementId"
    WHERE source."id" IS NULL OR destination."id" IS NULL
       OR source."branchCode" <> transfer."sourceBranchCode"
       OR destination."branchCode" <> transfer."destinationBranchCode"
       OR source."itemId" <> transfer."itemId"
       OR destination."itemId" <> transfer."itemId"
       OR source."type"::text <> 'transfer_out'
       OR destination."type"::text <> 'transfer_in'
       OR source."quantityDelta" <> -transfer."quantity"
       OR destination."quantityDelta" <> transfer."quantity"
    ORDER BY transfer."id"
  `);
  const negativeLedgers = await client.query<{ itemId: string; branchCode: string }>(`
    SELECT "itemId", "branchCode"
    FROM "InventoryMovement"
    GROUP BY "itemId", "branchCode"
    HAVING SUM("quantityDelta") < 0
    ORDER BY "branchCode", "itemId"
  `);
  return {
    missing: missing.rows,
    alerts: alerts.rows,
    balances: balances.rows,
    invalidTransfers: invalidTransfers.rows,
    negativeLedgers: negativeLedgers.rows
  };
}

function checksum(state: Awaited<ReturnType<typeof loadPending>>) {
  return createHash("sha256").update(JSON.stringify(state)).digest("hex");
}

async function applyAlertDecision(client: PoolClient, decision: AlertDecision) {
  const result = await client.query(
    `UPDATE "InventoryAlert" alert
     SET "branchCode" = $2
     WHERE alert."id" = $1
       AND alert."branchCode" IS NULL
       AND EXISTS (
         SELECT 1 FROM "BranchInventoryItem" configured
         WHERE configured."itemId" = alert."itemId"
           AND configured."branchCode" = $2
       )`,
    [decision.alertId, decision.branchCode]
  );
  if (result.rowCount !== 1) {
    throw new Error(`No se pudo atribuir la alerta ${decision.alertId} a ${decision.branchCode}.`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help")) {
    console.log(`Uso:
  pnpm branch:reconcile:inventory
  pnpm branch:reconcile:inventory -- --template
  pnpm branch:reconcile:inventory -- --decisions ruta.json
  pnpm branch:reconcile:inventory -- --decisions ruta.json --apply --confirm=${confirmationToken}

Dry-run por defecto. El apply atribuye alertas aprobadas y reconstruye saldos
materializados desde el libro local append-only; nunca reescribe movimientos.`);
    return;
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    const state = await loadPending(client);
    if (args.includes("--template")) {
      console.log(
        JSON.stringify(
          state.alerts.map(({ alertId }) => ({ alertId, branchCode: "" })),
          null,
          2
        )
      );
      return;
    }

    console.log(`Filas deterministas sin sede: ${state.missing.length}`);
    console.log(`Alertas por decidir: ${state.alerts.length}`);
    console.log(`Saldos distintos del libro: ${state.balances.length}`);
    console.log(`Traslados inválidos: ${state.invalidTransfers.length}`);
    console.log(`Libros con saldo negativo: ${state.negativeLedgers.length}`);
    console.log(`Checksum: ${checksum(state)}`);
    for (const row of state.missing) console.log(`  ${row.entityType}:${row.entityId}`);
    for (const row of state.alerts) console.log(`  inventory_alert:${row.alertId}`);
    for (const row of state.balances) {
      console.log(`  inventory_balance:${row.itemId}:${row.branchCode}`);
    }
    for (const row of state.invalidTransfers) {
      console.log(`  inventory_transfer:${row.transferId}`);
    }

    if (!args.includes("--apply")) {
      console.log("Dry-run: no se modificó la base.");
      return;
    }
    if (argumentValue(args, "--confirm") !== confirmationToken) {
      throw new Error(`Para aplicar escribe --confirm=${confirmationToken}.`);
    }
    if (state.missing.length > 0) {
      throw new Error("Hay hijos con padre indeterminado; no se modifican automáticamente.");
    }
    if (state.invalidTransfers.length > 0) {
      throw new Error("Hay traslados inmutables inconsistentes; requieren investigación manual.");
    }
    if (state.negativeLedgers.length > 0) {
      throw new Error("El libro contiene saldos negativos; no se materializarán automáticamente.");
    }

    const decisions = parseDecisions(argumentValue(args, "--decisions"));
    const pendingAlertIds = new Set(state.alerts.map((row) => row.alertId));
    const decisionIds = new Set(decisions.map((decision) => decision.alertId));
    if ([...pendingAlertIds].some((id) => !decisionIds.has(id))) {
      throw new Error("Cada alerta pendiente necesita una decisión explícita.");
    }
    if (decisions.some((decision) => !pendingAlertIds.has(decision.alertId))) {
      throw new Error("El archivo contiene una alerta que no está pendiente.");
    }

    await client.query("BEGIN");
    for (const decision of decisions) await applyAlertDecision(client, decision);
    for (const mismatch of state.balances) {
      await client.query(
        `INSERT INTO "BranchInventoryBalance" ("itemId", "branchCode", "currentStock", "updatedAt")
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
         ON CONFLICT ("itemId", "branchCode") DO UPDATE
         SET "currentStock" = EXCLUDED."currentStock", "updatedAt" = CURRENT_TIMESTAMP`,
        [mismatch.itemId, mismatch.branchCode, mismatch.ledgerStock]
      );
    }
    const remaining = await loadPending(client);
    if (
      remaining.missing.length > 0 ||
      remaining.alerts.length > 0 ||
      remaining.balances.length > 0 ||
      remaining.invalidTransfers.length > 0
    ) {
      throw new Error("La reconciliación no dejó el dominio listo para endurecer.");
    }
    await client.query("COMMIT");
    console.log(`Alertas atribuidas: ${decisions.length}. Saldos reconstruidos: ${state.balances.length}.`);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  reportScriptError("inventory ledger branch reconciliation", error);
  process.exitCode = 1;
});
