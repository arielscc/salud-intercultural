import "dotenv/config";
import { spawn } from "node:child_process";
import { readFile, readdir, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { reportScriptError } from "../safe-error";
import { assertSafeDatabaseCommand } from "../database-safety";

type IncidentEvidence = {
  formatVersion: number;
  runId?: string;
  performedAt: string;
  environment: string;
  containment?: {
    revokedSessions?: number;
    remainingSessions?: number;
    passwordChangeRequired?: boolean;
    appendOnlyProtected?: boolean;
  };
  recovery?: {
    migrationCount?: number;
    clinicalFilesVerified?: number;
  };
  result?: string;
};

type SecurityGateApproval = {
  formatVersion: number;
  approvedAt: string;
  approvedByRole: string;
  scope: string;
  decision: string;
  productionAuthorized: boolean;
  openCriticalOrHighFindings: number;
  approvalReference: string;
  incidentEvidenceRunId: string;
  securityReviewReport: string;
  productionBlockers: string[];
};

export const securityGateApprovalPath =
  "docs/project/security-gate/task-8-approval.json";
export const task8SecurityReviewReportPath =
  "docs/project/task-reports/2026-07-29-tarea-8-respuesta-incidentes-gate-seguridad.md";

export const requiredSecurityArtifacts = [
  ".github/workflows/ci.yml",
  ".github/workflows/backup-restore-drill.yml",
  "docs/operations/staging.md",
  "docs/operations/audit-events.md",
  "docs/operations/internal-users-sessions.md",
  "docs/operations/permissions-privacy-secrets.md",
  "docs/operations/clinical-attachments.md",
  "docs/operations/backup-restore.md",
  "docs/operations/incident-response.md",
  task8SecurityReviewReportPath,
  securityGateApprovalPath
] as const;

export const productionSecurityBlockers = [
  "required_checks_remote",
  "staging_role_qa",
  "private_clinical_blob_remote",
  "production_backup_restore",
  "direction_production_approval"
] as const;

export function validateSecurityGateApproval(
  approval: SecurityGateApproval,
  incidentEvidence: IncidentEvidence,
  now = new Date()
) {
  const approvedAt = new Date(approval.approvedAt);
  const incidentPerformedAt = new Date(incidentEvidence.performedAt);
  const blockersMatch =
    approval.productionBlockers.length ===
      productionSecurityBlockers.length &&
    approval.productionBlockers.every(
      (blocker, index) => blocker === productionSecurityBlockers[index]
    );
  if (
    approval.formatVersion !== 1 ||
    approval.approvedByRole !== "direccion" ||
    approval.scope !== "task_8_incident_response_and_security_gate" ||
    approval.decision !== "approved" ||
    approval.productionAuthorized !== false ||
    approval.openCriticalOrHighFindings !== 0 ||
    approval.approvalReference.trim().length < 20 ||
    approval.incidentEvidenceRunId !== incidentEvidence.runId ||
    approval.securityReviewReport !== task8SecurityReviewReportPath ||
    Number.isNaN(approvedAt.getTime()) ||
    Number.isNaN(incidentPerformedAt.getTime()) ||
    approvedAt.getTime() > now.getTime() ||
    approvedAt.getTime() < incidentPerformedAt.getTime() ||
    !blockersMatch
  ) {
    throw new Error("The Task 8 security gate approval is invalid.");
  }
  return approval;
}

export function validateIncidentEvidence(
  evidence: IncidentEvidence,
  now = new Date()
) {
  const performedAt = new Date(evidence.performedAt);
  const ageMs = now.getTime() - performedAt.getTime();
  const maximumAgeMs = 90 * 24 * 60 * 60 * 1000;
  if (
    evidence.formatVersion !== 1 ||
    evidence.environment !== "local-isolated" ||
    evidence.result !== "passed" ||
    !evidence.runId ||
    Number.isNaN(performedAt.getTime()) ||
    ageMs < 0 ||
    ageMs > maximumAgeMs ||
    (evidence.containment?.revokedSessions ?? 0) < 1 ||
    evidence.containment?.remainingSessions !== 0 ||
    evidence.containment?.passwordChangeRequired !== true ||
    evidence.containment?.appendOnlyProtected !== true ||
    (evidence.recovery?.migrationCount ?? 0) < 1 ||
    (evidence.recovery?.clinicalFilesVerified ?? 0) < 1
  ) {
    throw new Error("The incident drill evidence is invalid or expired.");
  }
  return evidence;
}

export async function findLatestIncidentEvidence(
  directory = ".data/incident-evidence"
) {
  const files = (await readdir(directory))
    .filter((file) => file.endsWith(".json"))
    .sort();
  const latest = files.at(-1);
  if (!latest) throw new Error("No incident drill evidence was found.");
  const evidence = JSON.parse(
    await readFile(resolve(directory, latest), "utf8")
  ) as IncidentEvidence;
  return {
    file: resolve(directory, latest),
    evidence: validateIncidentEvidence(evidence)
  };
}

async function runProcess(command: string, args: string[]) {
  const child = spawn(command, args, {
    env: process.env,
    stdio: ["ignore", "ignore", "ignore"]
  });
  const exitCode = await new Promise<number>((resolveExit, reject) => {
    child.once("error", reject);
    child.once("close", (code) => resolveExit(code ?? 1));
  });
  if (exitCode !== 0) {
    throw new Error(`${command} did not pass the local security gate.`);
  }
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required.");
  assertSafeDatabaseCommand({
    commandName: "security:gate:local",
    databaseUrl,
    nextPublicSiteUrl: "http://localhost",
    allowedDatabaseNames: ["salud_intercultural_dev"],
    requireLocalHost: true
  });

  for (const artifact of requiredSecurityArtifacts) {
    const artifactStat = await stat(resolve(process.cwd(), artifact));
    if (!artifactStat.isFile()) {
      throw new Error("A required security artifact is missing.");
    }
  }
  const latest = await findLatestIncidentEvidence();
  const approval = validateSecurityGateApproval(
    JSON.parse(
      await readFile(resolve(process.cwd(), securityGateApprovalPath), "utf8")
    ) as SecurityGateApproval,
    latest.evidence
  );
  await runProcess("pnpm", ["deps:check"]);
  await runProcess("pnpm", [
    "exec",
    "vitest",
    "run",
    "scripts/security-boundaries.test.ts",
    "scripts/privacy-controls.test.ts",
    "scripts/secret-policy.test.ts",
    "scripts/security/security-gate.test.ts"
  ]);

  console.log(
    [
      "Local security gate passed.",
      `criticalOrHighFindings=${approval.openCriticalOrHighFindings}`,
      `incidentEvidence=${latest.file}`,
      "taskImplementationApproval=true",
      `productionApproval=${approval.productionAuthorized}`,
      `remoteBlockers=${productionSecurityBlockers.length}`
    ].join(" | ")
  );
}

const isMain =
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isMain) {
  main().catch((error) => {
    reportScriptError("Local security gate", error);
    process.exitCode = 1;
  });
}
