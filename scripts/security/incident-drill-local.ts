import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { PrismaClient } from "../../src/generated/prisma/client";
import { reportScriptError } from "../safe-error";
import {
  createDrillDatabaseName,
  createIsolatedLocalDatabase,
  dropIsolatedLocalDatabase,
  runPrismaMigrations
} from "../backup/local-backup";

type BackupDrillEvidence = {
  runId: string;
  backupDurationMs: number;
  restoreAndVerifyDurationMs: number;
  totalDrillDurationMs: number;
  migrationCount: number;
  clinicalFilesVerified: number;
  checksumVerified: boolean;
  encryptedAndAuthenticated: boolean;
  plaintextCleaned: boolean;
  result: "passed";
};

async function runProcess(command: string, args: string[]) {
  const child = spawn(command, args, {
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"]
  });
  const stdoutChunks: Buffer[] = [];
  child.stdout?.on("data", (chunk: Buffer) => stdoutChunks.push(chunk));
  child.stderr?.resume();

  const exitCode = await new Promise<number>((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (code) => resolve(code ?? 1));
  });
  if (exitCode !== 0) {
    throw new Error("The encrypted recovery drill did not pass.");
  }
  return Buffer.concat(stdoutChunks).toString("utf8");
}

async function readBackupEvidence(
  runId: string
): Promise<BackupDrillEvidence> {
  const directory = ".data/backup-evidence";
  const parsed = JSON.parse(
    await readFile(join(directory, `${runId}.json`), "utf8")
  ) as BackupDrillEvidence;
  if (
    parsed.runId !== runId ||
    parsed.result !== "passed" ||
    !parsed.checksumVerified ||
    !parsed.encryptedAndAuthenticated ||
    !parsed.plaintextCleaned
  ) {
    throw new Error("The backup drill evidence is incomplete.");
  }
  return parsed;
}

async function runLostDeviceScenario(databaseUrl: string, runId: string) {
  const adapter = new PrismaPg({ connectionString: databaseUrl });
  const prisma = new PrismaClient({
    adapter,
    errorFormat: "minimal"
  });
  const detectedAt = new Date();

  try {
    const commander = await prisma.internalUser.create({
      data: {
        email: `commander-${runId}@example.invalid`,
        name: "Dirección Simulacro",
        passwordHash: "incident-drill-login-disabled",
        role: "super_admin"
      }
    });
    const affectedUser = await prisma.internalUser.create({
      data: {
        email: `affected-${runId}@example.invalid`,
        name: "Personal Sintético Afectado",
        passwordHash: "incident-drill-login-disabled",
        role: "recepcion"
      }
    });
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await prisma.internalSession.createMany({
      data: [1, 2].map((index) => ({
        tokenHash: createHash("sha256")
          .update(`${randomBytes(32).toString("base64url")}-${index}`)
          .digest("hex"),
        userId: affectedUser.id,
        deviceLabel: index === 1 ? "Teléfono perdido" : "Chrome en computadora",
        expiresAt
      }))
    });
    await prisma.auditEvent.create({
      data: {
        actorId: commander.id,
        actorRole: commander.role,
        action: "incident.drill.detected",
        entityType: "internal_user",
        entityId: affectedUser.id,
        result: "success",
        requestId: randomUUID(),
        context: { scenario: "lost_device", severity: "SEV2" }
      }
    });

    const containmentStartedAt = new Date();
    const revoked = await prisma.$transaction(async (tx) => {
      const sessions = await tx.internalSession.deleteMany({
        where: { userId: affectedUser.id }
      });
      await tx.internalUser.update({
        where: { id: affectedUser.id },
        data: { mustChangePassword: true }
      });
      await tx.auditEvent.create({
        data: {
          actorId: commander.id,
          actorRole: commander.role,
          action: "incident.drill.sessions_revoked",
          entityType: "internal_user",
          entityId: affectedUser.id,
          result: "success",
          requestId: randomUUID(),
          context: {
            scenario: "lost_device",
            severity: "SEV2",
            revokedCount: sessions.count
          }
        }
      });
      return sessions.count;
    });
    const containmentCompletedAt = new Date();
    const remainingSessions = await prisma.internalSession.count({
      where: { userId: affectedUser.id }
    });
    const containedUser = await prisma.internalUser.findUnique({
      where: { id: affectedUser.id },
      select: { mustChangePassword: true }
    });
    const auditEvents = await prisma.auditEvent.findMany({
      where: { entityId: affectedUser.id },
      orderBy: { occurredAt: "asc" }
    });
    let appendOnlyProtected = false;
    try {
      await prisma.auditEvent.update({
        where: { id: auditEvents[0]?.id ?? "missing" },
        data: { action: "incident.drill.tampered" }
      });
    } catch {
      appendOnlyProtected = true;
    }
    const unchangedFirstEvent = await prisma.auditEvent.findUnique({
      where: { id: auditEvents[0]?.id ?? "missing" }
    });

    if (
      revoked !== 2 ||
      remainingSessions !== 0 ||
      containedUser?.mustChangePassword !== true ||
      auditEvents.length !== 2 ||
      !appendOnlyProtected ||
      unchangedFirstEvent?.action !== "incident.drill.detected"
    ) {
      throw new Error("The session containment checks did not pass.");
    }

    return {
      detectedAt: detectedAt.toISOString(),
      containmentStartedAt: containmentStartedAt.toISOString(),
      containmentCompletedAt: containmentCompletedAt.toISOString(),
      containmentDurationMs:
        containmentCompletedAt.getTime() - containmentStartedAt.getTime(),
      affectedSessions: 2,
      revokedSessions: revoked,
      remainingSessions,
      passwordChangeRequired: containedUser.mustChangePassword,
      auditEvents: auditEvents.length,
      appendOnlyProtected
    };
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const baseDatabaseUrl = process.env.DATABASE_URL;
  if (!baseDatabaseUrl) throw new Error("DATABASE_URL is required.");

  const startedAt = Date.now();
  const runId = `${Date.now().toString(36)}_${randomUUID().slice(0, 8)}`;
  const databaseName = createDrillDatabaseName(
    "backup_source",
    `incident_${runId}`
  );
  let databaseUrl: string | undefined;
  let containment:
    | Awaited<ReturnType<typeof runLostDeviceScenario>>
    | undefined;

  try {
    databaseUrl = await createIsolatedLocalDatabase(
      baseDatabaseUrl,
      databaseName
    );
    await runPrismaMigrations(databaseUrl);
    containment = await runLostDeviceScenario(databaseUrl, runId);
  } finally {
    if (databaseUrl) {
      await dropIsolatedLocalDatabase(baseDatabaseUrl, databaseName);
    }
  }
  if (!containment) {
    throw new Error("The containment scenario did not complete.");
  }

  const backupOutput = await runProcess("pnpm", ["backup:drill:local"]);
  const backupRunId = backupOutput.match(/\brunId=([a-z0-9_]+)\b/)?.[1];
  if (!backupRunId) {
    throw new Error("The backup drill did not report its evidence ID.");
  }
  const recovery = await readBackupEvidence(backupRunId);
  const evidenceDirectory = ".data/incident-evidence";
  const evidencePath = join(evidenceDirectory, `${runId}.json`);
  const evidence = {
    formatVersion: 1,
    runId,
    performedAt: new Date().toISOString(),
    environment: "local-isolated",
    scenario: "lost_device_and_verified_recovery",
    severity: "SEV2",
    incidentCommander: "Dirección — simulacro",
    technicalLead: "Equipo técnico — simulacro",
    containment,
    recovery: {
      backupDrillRunId: recovery.runId,
      backupDurationMs: recovery.backupDurationMs,
      restoreAndVerifyDurationMs: recovery.restoreAndVerifyDurationMs,
      totalDrillDurationMs: recovery.totalDrillDurationMs,
      migrationCount: recovery.migrationCount,
      clinicalFilesVerified: recovery.clinicalFilesVerified
    },
    totalIncidentDrillDurationMs: Date.now() - startedAt,
    improvements: [
      "Completar el gate remoto de CI y staging.",
      "Activar y probar el backup coordinado real antes de producción."
    ],
    result: "passed"
  };
  await mkdir(evidenceDirectory, { recursive: true, mode: 0o700 });
  await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, {
    flag: "wx",
    mode: 0o600
  });
  await chmod(evidencePath, 0o600);

  console.log(
    [
      "Local incident response drill passed.",
      `runId=${runId}`,
      `containmentMs=${containment.containmentDurationMs}`,
      `recoveryMs=${recovery.restoreAndVerifyDurationMs}`,
      `evidence=${evidencePath}`
    ].join(" | ")
  );
}

main().catch((error) => {
  reportScriptError("Local incident response drill", error);
  process.exitCode = 1;
});
