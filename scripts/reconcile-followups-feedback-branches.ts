import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { Pool, type PoolClient } from "pg";
import { reportScriptError } from "./safe-error";

const confirmationToken = "APPLY_FOLLOWUPS_FEEDBACK_RECONCILIATION";
type Finding = { entityType: string; entityId: string; issue: string };
type TemplateDecision = { templateId: string; branchCode: string };

function argumentValue(args: string[], name: string) {
  const inline = args.find((argument) => argument.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1);
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function parseDecisions(path?: string): TemplateDecision[] {
  if (!path) return [];
  const value: unknown = JSON.parse(readFileSync(path, "utf8"));
  if (!Array.isArray(value)) throw new Error("Las decisiones deben ser un arreglo JSON.");
  return value.map((entry) => {
    if (!entry || typeof entry !== "object") throw new Error("Decisión inválida.");
    const candidate = entry as Record<string, unknown>;
    if (
      typeof candidate.templateId !== "string" ||
      candidate.templateId.length === 0 ||
      typeof candidate.branchCode !== "string" ||
      !/^[a-z0-9-]{2,80}$/.test(candidate.branchCode)
    ) {
      throw new Error("Cada decisión necesita templateId y branchCode válidos.");
    }
    return {
      templateId: candidate.templateId,
      branchCode: candidate.branchCode
    };
  });
}

async function loadFindings(client: PoolClient): Promise<Finding[]> {
  const result = await client.query<Finding>(`
    SELECT 'follow_up_attempt'::text AS "entityType", "id" AS "entityId", 'missing_branch'::text AS issue
      FROM "FollowUpAttempt" WHERE "branchCode" IS NULL
    UNION ALL SELECT 'follow_up_history', "id", 'missing_branch'
      FROM "FollowUpStatusHistory" WHERE "branchCode" IS NULL
    UNION ALL SELECT 'follow_up_template', "id", 'missing_branch'
      FROM "FollowUpTemplate" WHERE "branchCode" IS NULL
    UNION ALL SELECT 'reminder_rule_version', "id", 'missing_branch'
      FROM "SupervisedReminderRuleVersion" WHERE "branchCode" IS NULL
    UNION ALL SELECT 'reminder_candidate', "id", 'missing_branch'
      FROM "SupervisedReminderCandidate" WHERE "branchCode" IS NULL
    UNION ALL SELECT 'reminder_review_event', "id", 'missing_branch'
      FROM "SupervisedReminderReviewEvent" WHERE "branchCode" IS NULL
    UNION ALL SELECT 'feedback_request', "id", 'missing_branch'
      FROM "PatientFeedbackRequest" WHERE "branchCode" IS NULL
    UNION ALL SELECT 'feedback', "id", 'missing_branch'
      FROM "PatientFeedback" WHERE "branchCode" IS NULL
    UNION ALL SELECT 'feedback_case', "id", 'missing_branch'
      FROM "PatientFeedbackCase" WHERE "branchCode" IS NULL
    UNION ALL SELECT 'feedback_case_event', "id", 'missing_branch'
      FROM "PatientFeedbackCaseEvent" WHERE "branchCode" IS NULL
    UNION ALL
    SELECT 'follow_up_task', task."id", 'branch_source_mismatch'
      FROM "FollowUpTask" task
      LEFT JOIN "PatientBranchRecord" patient
        ON patient."patientId" = task."patientId" AND patient."branchCode" = task."branchCode"
      LEFT JOIN "Visit" visit ON visit."id" = task."visitId"
      LEFT JOIN "Sale" sale ON sale."id" = task."saleId"
      LEFT JOIN "InternalUserBranch" assignee
        ON assignee."userId" = task."assignedToId" AND assignee."branchCode" = task."branchCode"
     WHERE (task."patientId" IS NOT NULL AND patient."patientId" IS NULL)
        OR (task."visitId" IS NOT NULL AND visit."branchCode" IS DISTINCT FROM task."branchCode")
        OR (task."saleId" IS NOT NULL AND sale."branchCode" IS DISTINCT FROM task."branchCode")
        OR (task."assignedToId" IS NOT NULL AND assignee."userId" IS NULL)
    UNION ALL
    SELECT 'reminder_candidate', candidate."id", 'branch_source_mismatch'
      FROM "SupervisedReminderCandidate" candidate
      JOIN "SupervisedReminderRuleVersion" version ON version."id" = candidate."ruleVersionId"
      LEFT JOIN "Visit" visit ON visit."id" = candidate."visitId"
      LEFT JOIN "PatientBranchRecord" patient
        ON patient."patientId" = candidate."patientId" AND patient."branchCode" = candidate."branchCode"
     WHERE version."branchCode" IS DISTINCT FROM candidate."branchCode"
        OR patient."patientId" IS NULL
        OR (candidate."visitId" IS NOT NULL AND visit."branchCode" IS DISTINCT FROM candidate."branchCode")
    UNION ALL
    SELECT 'feedback_request', request."id", 'branch_source_mismatch'
      FROM "PatientFeedbackRequest" request
      JOIN "Visit" visit ON visit."id" = request."visitId"
      LEFT JOIN "PatientBranchRecord" patient
        ON patient."patientId" = request."patientId" AND patient."branchCode" = request."branchCode"
      LEFT JOIN "InternalUserBranch" owner
        ON owner."userId" = request."ownerId" AND owner."branchCode" = request."branchCode"
     WHERE visit."branchCode" IS DISTINCT FROM request."branchCode"
        OR visit."patientId" <> request."patientId"
        OR patient."patientId" IS NULL OR owner."userId" IS NULL
    UNION ALL
    SELECT 'feedback', feedback."id", 'branch_source_mismatch'
      FROM "PatientFeedback" feedback
      JOIN "PatientFeedbackRequest" request ON request."id" = feedback."requestId"
     WHERE request."branchCode" IS DISTINCT FROM feedback."branchCode"
        OR request."visitId" <> feedback."visitId"
        OR request."patientId" <> feedback."patientId"
    ORDER BY 1, 2, 3
  `);
  return result.rows;
}

function findingsChecksum(findings: readonly Finding[]) {
  return createHash("sha256").update(JSON.stringify(findings)).digest("hex");
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help")) {
    console.log(`Uso:
  pnpm branch:reconcile:continuity
  pnpm branch:reconcile:continuity -- --template
  pnpm branch:reconcile:continuity -- --decisions ruta.json --apply \\
    --checksum=<checksum-dry-run> --confirm=${confirmationToken}

Se ejecuta después de la migración expansiva. Dry-run por defecto. Solo permite
atribuir plantillas sin padre mediante decisiones explícitas; jamás reescribe
intentos, historiales, opiniones ni eventos.`);
    return;
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    const findings = await loadFindings(client);
    const checksum = findingsChecksum(findings);
    const pendingTemplates = findings.filter(
      (finding) => finding.entityType === "follow_up_template" && finding.issue === "missing_branch"
    );
    if (args.includes("--template")) {
      console.log(
        JSON.stringify(
          pendingTemplates.map((finding) => ({ templateId: finding.entityId, branchCode: "" })),
          null,
          2
        )
      );
      return;
    }

    console.log(`Hallazgos: ${findings.length}`);
    console.log(`Plantillas por decidir: ${pendingTemplates.length}`);
    console.log(`Checksum: ${checksum}`);
    for (const finding of findings) {
      console.log(`  ${finding.entityType}:${finding.entityId}:${finding.issue}`);
    }
    if (!args.includes("--apply")) {
      console.log("Dry-run: no se modificó la base.");
      return;
    }
    if (argumentValue(args, "--confirm") !== confirmationToken) {
      throw new Error(`Para aplicar escribe --confirm=${confirmationToken}.`);
    }
    if (argumentValue(args, "--checksum") !== checksum) {
      throw new Error("El checksum no coincide; repite el dry-run antes de aplicar.");
    }
    const decisions = parseDecisions(argumentValue(args, "--decisions"));
    const pendingIds = new Set(pendingTemplates.map((finding) => finding.entityId));
    const decisionIds = new Set(decisions.map((decision) => decision.templateId));
    if ([...pendingIds].some((id) => !decisionIds.has(id)) || decisions.some((item) => !pendingIds.has(item.templateId))) {
      throw new Error("Las decisiones deben corresponder exactamente a las plantillas pendientes.");
    }
    const nonTemplateFindings = findings.filter(
      (finding) => !pendingIds.has(finding.entityId) || finding.entityType !== "follow_up_template"
    );
    if (nonTemplateFindings.length > 0) {
      throw new Error("Hay evidencia inconsistente que este reconciliador no modifica automáticamente.");
    }

    await client.query("BEGIN");
    for (const decision of decisions) {
      const result = await client.query(
        `UPDATE "FollowUpTemplate" template
            SET "branchCode" = $2
          WHERE template."id" = $1 AND template."branchCode" IS NULL
            AND EXISTS (
              SELECT 1 FROM "ClinicBranch" branch
               WHERE branch."code" = $2 AND branch."status"::text <> 'inactive'
            )`,
        [decision.templateId, decision.branchCode]
      );
      if (result.rowCount !== 1) {
        throw new Error(`No se pudo atribuir la plantilla ${decision.templateId}.`);
      }
    }
    const remaining = await loadFindings(client);
    if (remaining.length > 0) throw new Error("La reconciliación no dejó el dominio listo para endurecer.");
    await client.query("COMMIT");
    console.log(`Plantillas atribuidas: ${decisions.length}. Hallazgos restantes: 0.`);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  reportScriptError("followups feedback branch reconciliation", error);
  process.exitCode = 1;
});
