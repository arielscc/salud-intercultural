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

const domain = "internal-user-access";
const confirmationToken = "APPLY_BRANCH_RECONCILIATION";
const clinicalRotationRoles = new Set(["medico", "enfermeria"]);

type CliOptions = {
  apply: boolean;
  assertReady: boolean;
  template: boolean;
  confirmation?: string;
  decisionsPath?: string;
};

type MembershipRow = {
  userId: string;
  identityRole: string | null;
  platformRole: string | null;
  branchCode: string | null;
  membershipRole: string | null;
  active: boolean | null;
  isDefault: boolean | null;
};

type Membership = {
  branchCode: string;
  role: string | null;
  active: boolean;
  isDefault: boolean;
};

type UserAccessSnapshot = {
  userId: string;
  role: string | null;
  memberships: Membership[];
  isClinicalRotation: boolean;
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
  pnpm branch:reconcile
  pnpm branch:reconcile -- --template
  pnpm branch:reconcile -- --decisions ruta/decisiones.json
  pnpm branch:reconcile -- --decisions ruta/decisiones.json --apply --confirm=${confirmationToken}
  pnpm branch:reconcile -- --assert-ready

Sin --apply el comando siempre es dry-run. El reporte contiene solo IDs técnicos,
códigos de sucursal, conteos y checksums; nunca consulta nombres ni correos.`);
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

async function hasScopedMembershipRoles(client: PoolClient) {
  const result = await client.query<{ exists: boolean }>(`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = 'InternalUserBranch'
        AND column_name = 'role'
    ) AS "exists"
  `);
  return result.rows[0]?.exists === true;
}

async function loadMembershipRows(client: PoolClient, scopedRoles: boolean) {
  if (scopedRoles) {
    const result = await client.query<MembershipRow>(`
      SELECT
        identity."id" AS "userId",
        NULL::text AS "identityRole",
        identity."platformRole"::text AS "platformRole",
        membership."branchCode" AS "branchCode",
        membership."role"::text AS "membershipRole",
        membership."active" AS "active",
        membership."isDefault" AS "isDefault"
      FROM "InternalUser" AS identity
      LEFT JOIN "InternalUserBranch" AS membership
        ON membership."userId" = identity."id"
      ORDER BY identity."id", membership."branchCode"
    `);
    return result.rows;
  }

  const result = await client.query<MembershipRow>(`
    SELECT
      identity."id" AS "userId",
      identity."role"::text AS "identityRole",
      NULL::text AS "platformRole",
      membership."branchCode" AS "branchCode",
      NULL::text AS "membershipRole",
      true AS "active",
      membership."isDefault" AS "isDefault"
    FROM "InternalUser" AS identity
    LEFT JOIN "InternalUserBranch" AS membership
      ON membership."userId" = identity."id"
    ORDER BY identity."id", membership."branchCode"
  `);
  return result.rows;
}

function buildSnapshots(rows: readonly MembershipRow[]) {
  const grouped = new Map<string, MembershipRow[]>();
  for (const row of rows) {
    const group = grouped.get(row.userId) ?? [];
    group.push(row);
    grouped.set(row.userId, group);
  }

  return [...grouped.entries()].flatMap<UserAccessSnapshot>(([userId, group]) => {
    const identityRole = group[0]?.identityRole ?? null;
    const platformRole = group[0]?.platformRole ?? null;
    if (identityRole === "super_admin" || platformRole === "super_admin") return [];
    const memberships = group.flatMap<Membership>((row) =>
      row.branchCode
        ? [
            {
              branchCode: row.branchCode,
              role: row.membershipRole ?? identityRole,
              active: row.active === true,
              isDefault: row.isDefault === true
            }
          ]
        : []
    );
    const activeMemberships = memberships.filter((membership) => membership.active);
    const roleSource = activeMemberships.length > 0 ? activeMemberships : memberships;
    const roles = new Set(
      roleSource.flatMap((membership) => (membership.role ? [membership.role] : []))
    );
    const role = roles.size === 1 ? [...roles][0] : identityRole;
    return [
      {
        userId,
        role,
        memberships,
        isClinicalRotation: roles.size <= 1 && role !== null && clinicalRotationRoles.has(role)
      }
    ];
  });
}

function toOwnershipRecord(snapshot: UserAccessSnapshot): BranchOwnershipRecord {
  const active = snapshot.memberships.filter((membership) => membership.active);
  const activeDefaults = active.filter((membership) => membership.isDefault);
  const inactiveDefault = snapshot.memberships.some(
    (membership) => membership.isDefault && !membership.active
  );
  const membershipRoles = new Set(
    (active.length > 0 ? active : snapshot.memberships).flatMap((membership) =>
      membership.role ? [membership.role] : []
    )
  );
  const structurallyInconsistent =
    activeDefaults.length > 1 || inactiveDefault || membershipRoles.size > 1;
  const ordinaryMultipleBranches =
    active.length > 1 && !snapshot.isClinicalRotation;
  const noActiveMembership = active.length === 0 && snapshot.memberships.length > 0;
  const currentBranchCode =
    activeDefaults.length === 1 ? activeDefaults[0]?.branchCode ?? null : null;
  const evidenceMemberships =
    currentBranchCode && snapshot.isClinicalRotation
      ? activeDefaults
      : active.length > 0
        ? active
        : snapshot.memberships;

  return {
    recordId: snapshot.userId,
    currentBranchCode,
    evidence: evidenceMemberships.map((membership) => ({
      source: "membresía" as const,
      branchCode: membership.branchCode
    })),
    conflict: structurallyInconsistent
      ? "inconsistente"
      : ordinaryMultipleBranches || noActiveMembership
        ? "ambiguo"
        : undefined,
    needsReconciliation:
      structurallyInconsistent ||
      ordinaryMultipleBranches ||
      noActiveMembership ||
      currentBranchCode === null
  };
}

async function loadKnownBranches(client: PoolClient) {
  const result = await client.query<{ code: string }>(`
    SELECT "code"
    FROM "ClinicBranch"
    WHERE "status"::text <> 'inactive'
    ORDER BY "code"
  `);
  return result.rows.map((row) => row.code);
}

async function applyLegacyChange(
  client: PoolClient,
  snapshot: UserAccessSnapshot,
  change: BranchReconciliationChange
) {
  if (!snapshot.isClinicalRotation) {
    await client.query(
      `DELETE FROM "InternalUserBranch"
       WHERE "userId" = $1 AND "branchCode" <> $2`,
      [snapshot.userId, change.toBranchCode]
    );
  }
  await client.query(
    `UPDATE "InternalUserBranch" SET "isDefault" = false WHERE "userId" = $1`,
    [snapshot.userId]
  );
  await client.query(
    `INSERT INTO "InternalUserBranch" ("userId", "branchCode", "isDefault")
     VALUES ($1, $2, true)
     ON CONFLICT ("userId", "branchCode")
     DO UPDATE SET "isDefault" = true`,
    [snapshot.userId, change.toBranchCode]
  );
}

async function applyScopedChange(
  client: PoolClient,
  snapshot: UserAccessSnapshot,
  change: BranchReconciliationChange
) {
  const selectedMembership = snapshot.memberships.find(
    (membership) => membership.branchCode === change.toBranchCode
  );
  const unambiguousRole =
    selectedMembership?.role ??
    (new Set(snapshot.memberships.map((membership) => membership.role)).size === 1
      ? snapshot.memberships[0]?.role
      : null);
  if (!unambiguousRole) {
    throw new Error("BRANCH_RECONCILIATION_ROLE_REQUIRED");
  }

  await client.query(
    `UPDATE "InternalUserBranch" SET "isDefault" = false WHERE "userId" = $1`,
    [snapshot.userId]
  );
  if (!snapshot.isClinicalRotation) {
    await client.query(
      `UPDATE "InternalUserBranch"
       SET "active" = false, "isDefault" = false, "updatedAt" = CURRENT_TIMESTAMP
       WHERE "userId" = $1 AND "branchCode" <> $2`,
      [snapshot.userId, change.toBranchCode]
    );
  }
  await client.query(
    `INSERT INTO "InternalUserBranch" (
       "userId", "branchCode", "role", "active", "isDefault", "updatedAt"
     ) VALUES ($1, $2, $3::"InternalRole", true, true, CURRENT_TIMESTAMP)
     ON CONFLICT ("userId", "branchCode") DO UPDATE
     SET "role" = EXCLUDED."role",
         "active" = true,
         "isDefault" = true,
         "updatedAt" = CURRENT_TIMESTAMP`,
    [snapshot.userId, change.toBranchCode, unambiguousRole]
  );
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  if (options.template) {
    console.log(
      JSON.stringify({ version: 1, domain, decisions: [] }, null, 2)
    );
    return;
  }
  requireBranchReconciliationWriteConfirmation({
    apply: options.apply,
    confirmation: options.confirmation
  });
  const decisions = loadDecisions(options.decisionsPath);
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL_REQUIRED");

  const pool = new Pool({ connectionString: databaseUrl, max: 1 });
  const client = await pool.connect();
  try {
    await client.query(
      options.apply
        ? "BEGIN ISOLATION LEVEL SERIALIZABLE"
        : "BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY"
    );
    const scopedRoles = await hasScopedMembershipRoles(client);
    const knownBranchCodes = await loadKnownBranches(client);
    const rows = await loadMembershipRows(client, scopedRoles);
    const snapshots = buildSnapshots(rows);
    const records = snapshots.map(toOwnershipRecord);
    const plan = createBranchReconciliationPlan({
      domain,
      records,
      knownBranchCodes,
      decisions,
      mode: options.apply ? "apply" : "dry-run"
    });

    if (options.apply) {
      const snapshotById = new Map(
        snapshots.map((snapshot) => [snapshot.userId, snapshot])
      );
      for (const change of plan.changes) {
        const snapshot = snapshotById.get(change.recordId);
        if (!snapshot) throw new Error("BRANCH_RECONCILIATION_UNKNOWN_RECORD");
        if (scopedRoles) {
          await applyScopedChange(client, snapshot, change);
        } else {
          await applyLegacyChange(client, snapshot, change);
        }
      }

      const rowsAfter = await loadMembershipRows(client, scopedRoles);
      const afterPlan = createBranchReconciliationPlan({
        domain,
        records: buildSnapshots(rowsAfter).map(toOwnershipRecord),
        knownBranchCodes,
        mode: "apply"
      });
      if (afterPlan.report.checksums.before !== plan.report.checksums.after) {
        throw new Error("BRANCH_RECONCILIATION_CHECKSUM_MISMATCH");
      }
      plan.report.writes.applied = plan.changes.length;
      await client.query("COMMIT");
    } else {
      await client.query("ROLLBACK");
    }

    console.log(
      JSON.stringify(
        {
          ...plan.report,
          sourceSchema: scopedRoles ? "scoped-role" : "legacy-role"
        },
        null,
        2
      )
    );
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
  reportScriptError("Branch ownership reconciliation", error);
  process.exitCode = 1;
});
