import { readFileSync } from "node:fs";
import { Pool, type PoolClient } from "pg";
import {
  assertBranchReconciliationReady,
  createBranchReconciliationPlan,
  parseManualBranchDecisions,
  requireBranchReconciliationWriteConfirmation,
  type BranchOwnershipRecord,
  type BranchReconciliationChange,
  type ManualBranchDecision
} from "../src/features/branches/reconciliation";
import { reportScriptError } from "./safe-error";

const domain = "lead-branch-ownership";
const confirmationToken = "APPLY_BRANCH_RECONCILIATION";

type CliOptions = {
  apply: boolean;
  assertReady: boolean;
  template: boolean;
  confirmation?: string;
  decisionsPath?: string;
};

type LeadOwnershipRow = {
  leadId: string;
  currentBranchCode: string | null;
  candidateBranchCode: string | null;
  evidenceSource: "seguimiento" | "expediente" | null;
};

function argumentValue(args: string[], name: string) {
  const inline = args.find((argument) => argument.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1);
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function parseOptions(args: string[]): CliOptions {
  if (args.includes("--help")) {
    console.log(`Uso:
  pnpm branch:reconcile:leads
  pnpm branch:reconcile:leads -- --template
  pnpm branch:reconcile:leads -- --decisions ruta/decisiones.json
  pnpm branch:reconcile:leads -- --decisions ruta/decisiones.json --apply --confirm=${confirmationToken}
  pnpm branch:reconcile:leads -- --assert-ready

Debe ejecutarse después de 20260909150000 y antes de 20260909160000.
El reporte contiene únicamente IDs técnicos y códigos de sucursal.`);
    process.exit(0);
  }
  return {
    apply: args.includes("--apply"),
    assertReady: args.includes("--assert-ready"),
    template: args.includes("--template"),
    confirmation: argumentValue(args, "--confirm"),
    decisionsPath: argumentValue(args, "--decisions")
  };
}

function loadDecisions(path: string | undefined): ManualBranchDecision[] {
  if (!path) return [];
  const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
  return parseManualBranchDecisions(parsed, domain).decisions;
}

async function assertStructuralMigrationApplied(client: PoolClient) {
  const result = await client.query<{ ready: boolean }>(`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = 'Lead'
        AND column_name = 'branchCode'
    ) AS "ready"
  `);
  if (!result.rows[0]?.ready) {
    throw new Error("LEAD_RECONCILIATION_STRUCTURAL_MIGRATION_REQUIRED");
  }
}

async function loadKnownBranches(client: PoolClient) {
  const result = await client.query<{ code: string }>(`
    SELECT "code" FROM "ClinicBranch"
    WHERE "status"::text <> 'inactive'
    ORDER BY "code"
  `);
  return result.rows.map((row) => row.code);
}

async function loadRows(client: PoolClient) {
  const result = await client.query<LeadOwnershipRow>(`
    WITH evidence AS (
      SELECT task."leadId", task."branchCode", 'seguimiento'::text AS "evidenceSource"
      FROM "FollowUpTask" AS task
      WHERE task."leadId" IS NOT NULL
      UNION
      SELECT lead."id" AS "leadId", record."branchCode", 'expediente'::text AS "evidenceSource"
      FROM "Lead" AS lead
      JOIN "PatientBranchRecord" AS record
        ON record."patientId" = lead."convertedPatientId"
      WHERE lead."convertedPatientId" IS NOT NULL
    )
    SELECT
      lead."id" AS "leadId",
      lead."branchCode" AS "currentBranchCode",
      evidence."branchCode" AS "candidateBranchCode",
      evidence."evidenceSource" AS "evidenceSource"
    FROM "Lead" AS lead
    LEFT JOIN evidence ON evidence."leadId" = lead."id"
    ORDER BY lead."id", evidence."branchCode"
  `);
  return result.rows;
}

function buildOwnershipRecords(rows: readonly LeadOwnershipRow[]) {
  const grouped = new Map<string, LeadOwnershipRow[]>();
  for (const row of rows) {
    const group = grouped.get(row.leadId) ?? [];
    group.push(row);
    grouped.set(row.leadId, group);
  }
  return [...grouped.values()].map<BranchOwnershipRecord>((group) => {
    const first = group[0];
    if (!first) throw new Error("LEAD_RECONCILIATION_EMPTY_GROUP");
    return {
      recordId: `lead:${first.leadId}`,
      currentBranchCode: first.currentBranchCode,
      evidence: group.map((row) => ({
        source: row.evidenceSource ?? "seguimiento",
        branchCode: row.candidateBranchCode
      })),
      needsReconciliation: first.currentBranchCode === null
    };
  });
}

async function applyChange(
  client: PoolClient,
  leadId: string,
  change: BranchReconciliationChange
) {
  const updated = await client.query(
    `UPDATE "Lead" SET "branchCode" = $2 WHERE "id" = $1`,
    [leadId, change.toBranchCode]
  );
  if (updated.rowCount !== 1) throw new Error("LEAD_RECONCILIATION_RECORD_NOT_FOUND");
  for (const table of ["LeadContactAttempt", "LeadReminder", "LeadStatusHistory"]) {
    await client.query(
      `UPDATE "${table}" SET "branchCode" = $2 WHERE "leadId" = $1`,
      [leadId, change.toBranchCode]
    );
  }
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  if (options.template) {
    console.log(JSON.stringify({ version: 1, domain, decisions: [] }, null, 2));
    return;
  }
  requireBranchReconciliationWriteConfirmation({
    apply: options.apply,
    confirmation: options.confirmation
  });
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL_REQUIRED");
  const decisions = loadDecisions(options.decisionsPath);
  const pool = new Pool({ connectionString: databaseUrl, max: 1 });
  const client = await pool.connect();
  try {
    await client.query(
      options.apply
        ? "BEGIN ISOLATION LEVEL SERIALIZABLE"
        : "BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY"
    );
    await assertStructuralMigrationApplied(client);
    const knownBranchCodes = await loadKnownBranches(client);
    const rows = await loadRows(client);
    const plan = createBranchReconciliationPlan({
      domain,
      records: buildOwnershipRecords(rows),
      knownBranchCodes,
      decisions,
      mode: options.apply ? "apply" : "dry-run"
    });

    if (options.apply) {
      for (const change of plan.changes) {
        await applyChange(client, change.recordId.slice("lead:".length), change);
      }
      const afterPlan = createBranchReconciliationPlan({
        domain,
        records: buildOwnershipRecords(await loadRows(client)),
        knownBranchCodes,
        mode: "apply"
      });
      if (afterPlan.report.checksums.before !== plan.report.checksums.after) {
        throw new Error("BRANCH_RECONCILIATION_CHECKSUM_MISMATCH");
      }
      assertBranchReconciliationReady(afterPlan.report);
      plan.report.writes.applied = plan.changes.length;
      await client.query("COMMIT");
    } else {
      await client.query("ROLLBACK");
    }

    console.log(JSON.stringify(plan.report, null, 2));
    if (options.assertReady) assertBranchReconciliationReady(plan.report);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  reportScriptError("Lead branch ownership reconciliation", error);
  process.exitCode = 1;
});
