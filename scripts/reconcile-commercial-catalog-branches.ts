import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { Pool, type PoolClient } from "pg";
import { reportScriptError } from "./safe-error";

const confirmationToken = "APPLY_COMMERCIAL_CATALOG_RECONCILIATION";
const entityTypes = ["supplier", "inventory_item", "payment_method", "service_catalog_item"] as const;
type EntityType = (typeof entityTypes)[number];
type Decision = { entityType: EntityType; entityId: string; branchCodes: string[] };
type Pending = { entityType: EntityType; entityId: string };

function argumentValue(args: string[], name: string) {
  const inline = args.find((argument) => argument.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1);
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function parseDecisions(path?: string): Decision[] {
  if (!path) return [];
  const value: unknown = JSON.parse(readFileSync(path, "utf8"));
  if (!Array.isArray(value)) throw new Error("El archivo de decisiones debe ser un arreglo JSON.");
  return value.map((entry) => {
    if (!entry || typeof entry !== "object") throw new Error("Decisión comercial inválida.");
    const candidate = entry as Record<string, unknown>;
    if (!entityTypes.includes(candidate.entityType as EntityType)) {
      throw new Error("entityType comercial inválido.");
    }
    if (typeof candidate.entityId !== "string" || candidate.entityId.length === 0) {
      throw new Error("Cada decisión necesita entityId.");
    }
    if (
      !Array.isArray(candidate.branchCodes) ||
      candidate.branchCodes.length === 0 ||
      candidate.branchCodes.some((code) => typeof code !== "string" || code.length === 0)
    ) {
      throw new Error("Cada decisión necesita al menos un branchCode explícito.");
    }
    return {
      entityType: candidate.entityType as EntityType,
      entityId: candidate.entityId,
      branchCodes: [...new Set(candidate.branchCodes as string[])].sort()
    };
  });
}

async function loadPending(client: PoolClient): Promise<Pending[]> {
  const result = await client.query<Pending>(`
    SELECT 'supplier'::text AS "entityType", master."id" AS "entityId"
    FROM "Supplier" master
    WHERE NOT EXISTS (SELECT 1 FROM "SupplierBranchProfile" local WHERE local."supplierId" = master."id")
    UNION ALL
    SELECT 'inventory_item', master."id"
    FROM "InventoryItem" master
    WHERE NOT EXISTS (SELECT 1 FROM "BranchInventoryItem" local WHERE local."itemId" = master."id")
    UNION ALL
    SELECT 'payment_method', master."id"
    FROM "PaymentMethod" master
    WHERE NOT EXISTS (SELECT 1 FROM "PaymentMethodBranch" local WHERE local."methodId" = master."id")
    UNION ALL
    SELECT 'service_catalog_item', master."id"
    FROM "ServiceCatalogItem" master
    WHERE NOT EXISTS (SELECT 1 FROM "ServiceCatalogItemBranch" local WHERE local."catalogItemId" = master."id")
    ORDER BY 1, 2
  `);
  return result.rows;
}

function checksum(pending: readonly Pending[]) {
  return createHash("sha256")
    .update(pending.map((item) => `${item.entityType}:${item.entityId}`).join("\n"))
    .digest("hex");
}

async function applyDecision(client: PoolClient, decision: Decision) {
  for (const branchCode of decision.branchCodes) {
    if (decision.entityType === "supplier") {
      await client.query(
        `INSERT INTO "SupplierBranchProfile" ("supplierId", "branchCode", "active", "notes", "createdAt", "updatedAt")
         SELECT "id", $2, "active", "notes", "createdAt", "updatedAt" FROM "Supplier" WHERE "id" = $1
         ON CONFLICT ("supplierId", "branchCode") DO NOTHING`,
        [decision.entityId, branchCode]
      );
    } else if (decision.entityType === "inventory_item") {
      await client.query(
        `INSERT INTO "BranchInventoryItem" (
           "itemId", "branchCode", "sku", "available", "salePriceCents", "referenceCostCents",
           "maxDiscountCents", "minimumStock", "createdAt", "updatedAt"
         )
         SELECT "id", $2, "sku", "active", "salePriceCents", "referenceCostCents",
                "maxDiscountCents", "minimumStock", "createdAt", "updatedAt"
         FROM "InventoryItem" WHERE "id" = $1
         ON CONFLICT ("itemId", "branchCode") DO NOTHING`,
        [decision.entityId, branchCode]
      );
    } else if (decision.entityType === "payment_method") {
      await client.query(
        `INSERT INTO "PaymentMethodBranch" ("methodId", "branchCode", "active", "updatedAt")
         SELECT "id", $2, "active", CURRENT_TIMESTAMP FROM "PaymentMethod" WHERE "id" = $1
         ON CONFLICT ("methodId", "branchCode") DO NOTHING`,
        [decision.entityId, branchCode]
      );
    } else {
      await client.query(
        `INSERT INTO "ServiceCatalogItemBranch" (
           "catalogItemId", "branchCode", "active", "basePriceCents", "ownMaxDiscountCents",
           "sessionCount", "packagePriceCents", "sessionPriceCents", "createdAt", "updatedAt"
         )
         SELECT "id", $2, "active", "basePriceCents", "ownMaxDiscountCents",
                "sessionCount", "packagePriceCents", "sessionPriceCents", "createdAt", "updatedAt"
         FROM "ServiceCatalogItem" WHERE "id" = $1
         ON CONFLICT ("catalogItemId", "branchCode") DO NOTHING`,
        [decision.entityId, branchCode]
      );
      await client.query(
        `INSERT INTO "BranchInventoryItem" (
           "itemId", "branchCode", "sku", "available", "salePriceCents", "referenceCostCents",
           "maxDiscountCents", "minimumStock", "createdAt", "updatedAt"
         )
         SELECT item."id", $2, item."sku", item."active", item."salePriceCents",
                item."referenceCostCents", item."maxDiscountCents", item."minimumStock",
                item."createdAt", item."updatedAt"
         FROM "ServiceCatalogComponent" component
         JOIN "InventoryItem" item ON item."id" = component."inventoryItemId"
         WHERE component."catalogItemId" = $1
         ON CONFLICT ("itemId", "branchCode") DO NOTHING`,
        [decision.entityId, branchCode]
      );
    }
  }
}

async function entityExists(client: PoolClient, decision: Decision) {
  const tableByType: Record<EntityType, string> = {
    supplier: "Supplier",
    inventory_item: "InventoryItem",
    payment_method: "PaymentMethod",
    service_catalog_item: "ServiceCatalogItem"
  };
  const result = await client.query<{ exists: boolean }>(
    `SELECT EXISTS (SELECT 1 FROM "${tableByType[decision.entityType]}" WHERE "id" = $1) AS "exists"`,
    [decision.entityId]
  );
  return result.rows[0]?.exists === true;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help")) {
    console.log(`Uso:
  pnpm branch:reconcile:commercial
  pnpm branch:reconcile:commercial -- --template
  pnpm branch:reconcile:commercial -- --decisions ruta.json
  pnpm branch:reconcile:commercial -- --decisions ruta.json --apply --confirm=${confirmationToken}

Sin --apply siempre es dry-run. Solo se imprimen IDs técnicos, sucursales y conteos.`);
    return;
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    const pending = await loadPending(client);
    if (args.includes("--template")) {
      console.log(JSON.stringify(pending.map((item) => ({ ...item, branchCodes: [] })), null, 2));
      return;
    }

    const decisions = parseDecisions(argumentValue(args, "--decisions"));
    const pendingKeys = new Set(pending.map((item) => `${item.entityType}:${item.entityId}`));
    const knownBranches = await client.query<{ code: string }>(
      `SELECT "code" FROM "ClinicBranch" WHERE "status"::text <> 'inactive'`
    );
    const branchCodes = new Set(knownBranches.rows.map((branch) => branch.code));
    for (const decision of decisions) {
      if (!(await entityExists(client, decision))) {
        throw new Error(`No existe ${decision.entityType}:${decision.entityId}.`);
      }
      for (const branchCode of decision.branchCodes) {
        if (!branchCodes.has(branchCode)) throw new Error(`Sucursal no disponible: ${branchCode}.`);
      }
    }

    console.log(`Pendientes: ${pending.length}`);
    console.log(`Checksum: ${checksum(pending)}`);
    console.log(`Decisiones válidas: ${decisions.length}`);
    for (const item of pending) console.log(`  ${item.entityType}:${item.entityId}`);

    if (!args.includes("--apply")) {
      console.log("Dry-run: no se modificó la base.");
      return;
    }
    if (argumentValue(args, "--confirm") !== confirmationToken) {
      throw new Error(`Para aplicar escribe --confirm=${confirmationToken}.`);
    }
    const decisionKeys = new Set(
      decisions.map((decision) => `${decision.entityType}:${decision.entityId}`)
    );
    if ([...pendingKeys].some((key) => !decisionKeys.has(key))) {
      throw new Error("Cada maestro pendiente necesita una decisión explícita antes de aplicar.");
    }

    await client.query("BEGIN");
    for (const decision of decisions) await applyDecision(client, decision);
    const remaining = await loadPending(client);
    if (remaining.length > 0) throw new Error("La reconciliación dejó maestros sin sucursal.");
    await client.query("COMMIT");
    console.log(`Aplicadas: ${decisions.length}. Pendientes: 0.`);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  reportScriptError("commercial catalog branch reconciliation", error);
  process.exitCode = 1;
});
