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

const domain = "patient-branch-record";
const confirmationToken = "APPLY_BRANCH_RECONCILIATION";

type CliOptions = {
  apply: boolean;
  assertReady: boolean;
  template: boolean;
  confirmation?: string;
  decisionsPath?: string;
};

type PatientOwnershipRow = {
  recordId: string;
  kind: "profile" | "consent" | "contact" | "note";
  entityId: string;
  patientId: string;
  currentBranchCode: string | null;
  candidateBranchCode: string | null;
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
  pnpm branch:reconcile:patients
  pnpm branch:reconcile:patients -- --template
  pnpm branch:reconcile:patients -- --decisions ruta/decisiones.json
  pnpm branch:reconcile:patients -- --decisions ruta/decisiones.json --apply --confirm=${confirmationToken}
  pnpm branch:reconcile:patients -- --assert-ready

Debe ejecutarse después de la migración estructural 20260909130000 y antes de
20260909140000. El reporte contiene únicamente IDs técnicos y sucursales.`);
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

async function loadKnownBranches(client: PoolClient) {
  const result = await client.query<{ code: string }>(`
    SELECT "code" FROM "ClinicBranch"
    WHERE "status"::text <> 'inactive'
    ORDER BY "code"
  `);
  return result.rows.map((row) => row.code);
}

async function assertStructuralMigrationApplied(client: PoolClient) {
  const result = await client.query<{ ready: boolean }>(`
    SELECT
      to_regclass('"PatientBranchRecord"') IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'PatientConsent'
          AND column_name = 'branchCode'
      ) AS "ready"
  `);
  if (!result.rows[0]?.ready) {
    throw new Error("PATIENT_RECONCILIATION_STRUCTURAL_MIGRATION_REQUIRED");
  }
}

async function loadRows(client: PoolClient) {
  const result = await client.query<PatientOwnershipRow>(`
    WITH profile AS (
      SELECT
        'profile:' || patient."id" AS "recordId",
        'profile'::text AS "kind",
        patient."id" AS "entityId",
        patient."id" AS "patientId",
        local."branchCode" AS "currentBranchCode",
        CASE WHEN local."branchCode" IS NOT NULL
          THEN local."branchCode"
          ELSE candidate."branchCode"
        END AS "candidateBranchCode"
      FROM "Patient" AS patient
      LEFT JOIN LATERAL (
        SELECT record."branchCode"
        FROM "PatientBranchRecord" AS record
        WHERE record."patientId" = patient."id"
          AND (
            record."generalObservations" IS NOT NULL OR
            record."allergies" IS NOT NULL OR
            record."relevantHistory" IS NOT NULL OR
            record."currentMedication" IS NOT NULL
          )
        ORDER BY record."branchCode"
        LIMIT 1
      ) AS local ON true
      LEFT JOIN "PatientBranchRecord" AS candidate
        ON candidate."patientId" = patient."id"
      WHERE patient."generalObservations" IS NOT NULL
         OR patient."allergies" IS NOT NULL
         OR patient."relevantHistory" IS NOT NULL
         OR patient."currentMedication" IS NOT NULL
         OR local."branchCode" IS NOT NULL
    ), children AS (
      SELECT 'consent:' || child."id", 'consent', child."id", child."patientId",
             child."branchCode",
             COALESCE(child."branchCode", candidate."branchCode")
      FROM "PatientConsent" AS child
      LEFT JOIN "PatientBranchRecord" AS candidate
        ON candidate."patientId" = child."patientId"
      UNION ALL
      SELECT 'contact:' || child."id", 'contact', child."id", child."patientId",
             child."branchCode",
             COALESCE(child."branchCode", candidate."branchCode")
      FROM "PatientContact" AS child
      LEFT JOIN "PatientBranchRecord" AS candidate
        ON candidate."patientId" = child."patientId"
      UNION ALL
      SELECT 'note:' || child."id", 'note', child."id", child."patientId",
             child."branchCode",
             COALESCE(child."branchCode", candidate."branchCode")
      FROM "PatientNote" AS child
      LEFT JOIN "PatientBranchRecord" AS candidate
        ON candidate."patientId" = child."patientId"
    )
    SELECT * FROM profile
    UNION ALL
    SELECT * FROM children
    ORDER BY "recordId", "candidateBranchCode"
  `);
  return result.rows;
}

function buildOwnershipRecords(rows: readonly PatientOwnershipRow[]) {
  const grouped = new Map<string, PatientOwnershipRow[]>();
  for (const row of rows) {
    const group = grouped.get(row.recordId) ?? [];
    group.push(row);
    grouped.set(row.recordId, group);
  }
  return [...grouped.values()].map<BranchOwnershipRecord>((group) => {
    const first = group[0];
    if (!first) throw new Error("PATIENT_RECONCILIATION_EMPTY_GROUP");
    return {
      recordId: first.recordId,
      currentBranchCode: first.currentBranchCode,
      evidence: group.map((row) => ({
        source: "visita" as const,
        branchCode: row.candidateBranchCode
      })),
      needsReconciliation: first.currentBranchCode === null
    };
  });
}

async function applyChange(
  client: PoolClient,
  row: PatientOwnershipRow,
  change: BranchReconciliationChange
) {
  await client.query(`
    INSERT INTO "PatientBranchRecord" (
      "patientId", "branchCode", "recordNumber", "createdAt", "updatedAt"
    )
    SELECT patient."id", $2, $2 || '-' || patient."internalCode",
           CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    FROM "Patient" AS patient
    WHERE patient."id" = $1
    ON CONFLICT ("patientId", "branchCode") DO NOTHING
  `, [row.patientId, change.toBranchCode]);

  if (row.kind === "profile") {
    const updated = await client.query(`
      UPDATE "PatientBranchRecord" AS local
      SET
        "generalObservations" = COALESCE(local."generalObservations", patient."generalObservations"),
        "allergies" = COALESCE(local."allergies", patient."allergies"),
        "relevantHistory" = COALESCE(local."relevantHistory", patient."relevantHistory"),
        "currentMedication" = COALESCE(local."currentMedication", patient."currentMedication"),
        "updatedAt" = CURRENT_TIMESTAMP
      FROM "Patient" AS patient
      WHERE local."patientId" = patient."id"
        AND patient."id" = $1
        AND local."branchCode" = $2
    `, [row.patientId, change.toBranchCode]);
    if (updated.rowCount !== 1) {
      throw new Error("PATIENT_RECONCILIATION_BRANCH_RECORD_REQUIRED");
    }
    await client.query(`
      UPDATE "Patient"
      SET "generalObservations" = NULL, "allergies" = NULL,
          "relevantHistory" = NULL, "currentMedication" = NULL
      WHERE "id" = $1
    `, [row.patientId]);
    return;
  }

  const tables = {
    consent: "PatientConsent",
    contact: "PatientContact",
    note: "PatientNote"
  } as const;
  const table = tables[row.kind];
  const updated = await client.query(
    `UPDATE "${table}" SET "branchCode" = $2 WHERE "id" = $1`,
    [row.entityId, change.toBranchCode]
  );
  if (updated.rowCount !== 1) {
    throw new Error("PATIENT_RECONCILIATION_RECORD_NOT_FOUND");
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
      const rowById = new Map(rows.map((row) => [row.recordId, row]));
      for (const change of plan.changes) {
        const row = rowById.get(change.recordId);
        if (!row) throw new Error("PATIENT_RECONCILIATION_UNKNOWN_RECORD");
        await applyChange(client, row, change);
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
  reportScriptError("Patient branch ownership reconciliation", error);
  process.exitCode = 1;
});
