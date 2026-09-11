import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { Pool, type PoolClient } from "pg";
import { reportScriptError } from "./safe-error";

const domain = "module-audit-scope";
const confirmationToken = "APPLY_MODULE_AUDIT_RECONCILIATION";

type Finding = {
  kind: "module" | "audit";
  id: string;
  action: string;
  issue: string;
};

type ModuleDecision = {
  eventId: string;
  resolution: "branch" | "platform";
  branchCode?: string;
};

type AuditDecision = {
  eventId: string;
  scope: "branch" | "platform";
  branchCode?: string;
};

type DecisionFile = {
  version: 1;
  domain: typeof domain;
  moduleEvents: ModuleDecision[];
  auditEvents: AuditDecision[];
};

function argumentValue(args: string[], name: string) {
  const inline = args.find((argument) => argument.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1);
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function validId(value: unknown) {
  return typeof value === "string" && /^[A-Za-z0-9:_-]{1,200}$/.test(value);
}

function validBranch(value: unknown) {
  return typeof value === "string" && /^[a-z0-9-]{2,80}$/.test(value);
}

function parseDecisions(path?: string): DecisionFile {
  if (!path) {
    return { version: 1, domain, moduleEvents: [], auditEvents: [] };
  }
  const value: unknown = JSON.parse(readFileSync(path, "utf8"));
  if (!value || typeof value !== "object") throw new Error("Archivo de decisiones inválido.");
  const input = value as Record<string, unknown>;
  if (input.version !== 1 || input.domain !== domain) {
    throw new Error("Versión o dominio de decisiones inválido.");
  }
  if (!Array.isArray(input.moduleEvents) || !Array.isArray(input.auditEvents)) {
    throw new Error("Las decisiones deben contener moduleEvents y auditEvents.");
  }

  const moduleEvents = input.moduleEvents.map((entry): ModuleDecision => {
    if (!entry || typeof entry !== "object") throw new Error("Decisión de módulo inválida.");
    const item = entry as Record<string, unknown>;
    if (!validId(item.eventId) || (item.resolution !== "branch" && item.resolution !== "platform")) {
      throw new Error("Cada evento de módulo necesita eventId y resolution válidos.");
    }
    if (item.resolution === "branch" && !validBranch(item.branchCode)) {
      throw new Error(`El evento de módulo ${item.eventId} necesita branchCode.`);
    }
    if (item.resolution === "platform" && item.branchCode !== undefined) {
      throw new Error(`El evento de plataforma ${item.eventId} no admite branchCode.`);
    }
    return {
      eventId: item.eventId as string,
      resolution: item.resolution,
      ...(item.resolution === "branch" ? { branchCode: item.branchCode as string } : {})
    };
  });

  const auditEvents = input.auditEvents.map((entry): AuditDecision => {
    if (!entry || typeof entry !== "object") throw new Error("Decisión de auditoría inválida.");
    const item = entry as Record<string, unknown>;
    if (!validId(item.eventId) || (item.scope !== "branch" && item.scope !== "platform")) {
      throw new Error("Cada evento de auditoría necesita eventId y scope válidos.");
    }
    if (item.scope === "branch" && !validBranch(item.branchCode)) {
      throw new Error(`El evento de auditoría ${item.eventId} necesita branchCode.`);
    }
    if (item.scope === "platform" && item.branchCode !== undefined) {
      throw new Error(`La auditoría de plataforma ${item.eventId} no admite branchCode.`);
    }
    return {
      eventId: item.eventId as string,
      scope: item.scope,
      ...(item.scope === "branch" ? { branchCode: item.branchCode as string } : {})
    };
  });

  const keys = [
    ...moduleEvents.map((item) => `module:${item.eventId}`),
    ...auditEvents.map((item) => `audit:${item.eventId}`)
  ];
  if (new Set(keys).size !== keys.length) throw new Error("Hay decisiones repetidas.");
  return { version: 1, domain, moduleEvents, auditEvents };
}

async function loadFindings(client: PoolClient): Promise<Finding[]> {
  const result = await client.query<Finding>(`
    SELECT 'module'::text AS kind, "id", "moduleCode" AS action,
           'missing_branch'::text AS issue
      FROM "ModuleActivationEvent"
     WHERE "branchCode" IS NULL
    UNION ALL
    SELECT 'audit', "id", "action",
           CASE
             WHEN "scope" IS NULL THEN 'missing_scope'
             ELSE 'scope_branch_mismatch'
           END
      FROM "AuditEvent"
     WHERE "scope" IS NULL
        OR ("scope" = 'branch' AND "branchCode" IS NULL)
        OR ("scope" = 'platform' AND "branchCode" IS NOT NULL)
    ORDER BY 1, 2
  `);
  return result.rows;
}

function checksum(findings: readonly Finding[]) {
  return createHash("sha256").update(JSON.stringify(findings)).digest("hex");
}

function template(findings: readonly Finding[]): DecisionFile {
  return {
    version: 1,
    domain,
    moduleEvents: findings
      .filter((item) => item.kind === "module")
      .map((item) => ({ eventId: item.id, resolution: "branch", branchCode: "" })),
    auditEvents: findings
      .filter((item) => item.kind === "audit")
      .map((item) => ({ eventId: item.id, scope: "branch", branchCode: "" }))
  };
}

function decisionsMatchFindings(findings: readonly Finding[], decisions: DecisionFile) {
  const expected = new Set(findings.map((item) => `${item.kind}:${item.id}`));
  const received = new Set([
    ...decisions.moduleEvents.map((item) => `module:${item.eventId}`),
    ...decisions.auditEvents.map((item) => `audit:${item.eventId}`)
  ]);
  return expected.size === received.size && [...expected].every((key) => received.has(key));
}

async function assertBranchExists(client: PoolClient, branchCode: string) {
  const result = await client.query(
    `SELECT 1 FROM "ClinicBranch" WHERE "code" = $1 AND "status"::text <> 'inactive'`,
    [branchCode]
  );
  if (result.rowCount !== 1) throw new Error(`Sucursal no disponible: ${branchCode}.`);
}

async function applyDecisions(client: PoolClient, decisions: DecisionFile) {
  await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
  await client.query('DROP TRIGGER IF EXISTS "AuditEvent_prevent_update_delete" ON "AuditEvent"');
  await client.query('DROP TRIGGER IF EXISTS "ModuleActivationEvent_prevent_update_delete" ON "ModuleActivationEvent"');

  for (const decision of decisions.moduleEvents) {
    if (decision.resolution === "branch") {
      await assertBranchExists(client, decision.branchCode as string);
      const result = await client.query(
        `UPDATE "ModuleActivationEvent" event
            SET "branchCode" = $2
          WHERE event."id" = $1 AND event."branchCode" IS NULL
            AND EXISTS (
              SELECT 1 FROM "ModuleActivation" activation
               WHERE activation."code" = event."moduleCode"
                 AND activation."branchCode" = $2
            )`,
        [decision.eventId, decision.branchCode]
      );
      if (result.rowCount !== 1) throw new Error(`No se pudo atribuir ${decision.eventId}.`);
      continue;
    }

    const archived = await client.query(
      `INSERT INTO "AuditEvent" (
         "id", "scope", "branchCode", "actorId", "actorRole", "action",
         "entityType", "entityId", "result", "requestId", "context", "occurredAt"
       )
       SELECT
         'legacy-module:' || event."id", 'platform', NULL, event."actorId",
         event."actorRole", 'module.activation.legacy', 'module', event."moduleCode",
         'success', 'legacy-module:' || event."id",
         jsonb_strip_nulls(jsonb_build_object(
           'legacyModuleActivationEventId', event."id",
           'previousStatus', event."previousStatus",
           'status', event."status",
           'reason', event."reason"
         )), event."occurredAt"
       FROM "ModuleActivationEvent" event
       WHERE event."id" = $1 AND event."branchCode" IS NULL`,
      [decision.eventId]
    );
    if (archived.rowCount !== 1) throw new Error(`No se pudo clasificar ${decision.eventId}.`);
    await client.query(
      `DELETE FROM "ModuleActivationEvent" WHERE "id" = $1 AND "branchCode" IS NULL`,
      [decision.eventId]
    );
  }

  for (const decision of decisions.auditEvents) {
    if (decision.scope === "branch") {
      await assertBranchExists(client, decision.branchCode as string);
    }
    const result = await client.query(
      `UPDATE "AuditEvent"
          SET "scope" = $2::"AuditScope", "branchCode" = $3
        WHERE "id" = $1`,
      [decision.eventId, decision.scope, decision.branchCode ?? null]
    );
    if (result.rowCount !== 1) throw new Error(`No se pudo clasificar ${decision.eventId}.`);
  }

  await client.query(`
    CREATE TRIGGER "AuditEvent_prevent_update_delete"
    BEFORE UPDATE OR DELETE ON "AuditEvent"
    FOR EACH ROW EXECUTE FUNCTION "reject_audit_event_mutation"()
  `);
  await client.query(`
    CREATE TRIGGER "ModuleActivationEvent_prevent_update_delete"
    BEFORE UPDATE OR DELETE ON "ModuleActivationEvent"
    FOR EACH ROW EXECUTE FUNCTION "reject_module_activation_event_mutation"()
  `);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help")) {
    console.log(`Uso:
  pnpm branch:reconcile:audit
  pnpm branch:reconcile:audit -- --template
  pnpm branch:reconcile:audit -- --decisions decisiones.json --apply \\
    --checksum=<checksum-dry-run> --confirm=${confirmationToken}

Dry-run por defecto. Cada evento legacy debe atribuirse expresamente a una
sucursal o, si realmente era global, clasificarse como plataforma.`);
    return;
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    const findings = await loadFindings(client);
    const currentChecksum = checksum(findings);
    if (args.includes("--template")) {
      console.log(JSON.stringify(template(findings), null, 2));
      return;
    }
    console.log(`Hallazgos: ${findings.length}`);
    console.log(`Eventos de módulo: ${findings.filter((item) => item.kind === "module").length}`);
    console.log(`Eventos de auditoría: ${findings.filter((item) => item.kind === "audit").length}`);
    console.log(`Checksum: ${currentChecksum}`);
    for (const item of findings) console.log(`  ${item.kind}:${item.id}:${item.issue}:${item.action}`);
    if (!args.includes("--apply")) {
      console.log("Dry-run: no se modificó la base.");
      return;
    }
    if (argumentValue(args, "--confirm") !== confirmationToken) {
      throw new Error(`Para aplicar escribe --confirm=${confirmationToken}.`);
    }
    if (argumentValue(args, "--checksum") !== currentChecksum) {
      throw new Error("El checksum no coincide; repite el dry-run.");
    }
    const decisions = parseDecisions(argumentValue(args, "--decisions"));
    if (!decisionsMatchFindings(findings, decisions)) {
      throw new Error("Las decisiones deben corresponder exactamente a los hallazgos actuales.");
    }
    await applyDecisions(client, decisions);
    const remaining = await loadFindings(client);
    if (remaining.length > 0) throw new Error("La reconciliación no dejó el dominio listo.");
    await client.query("COMMIT");
    console.log(`Eventos clasificados: ${findings.length}. Hallazgos restantes: 0.`);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  reportScriptError("module audit scope reconciliation", error);
  process.exitCode = 1;
});
