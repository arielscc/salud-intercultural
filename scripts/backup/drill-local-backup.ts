import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { randomBytes, randomUUID } from "node:crypto";
import { chmod, mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { PrismaClient } from "../../src/generated/prisma/client";
import { reportScriptError } from "../safe-error";
import {
  createDrillDatabaseName,
  createIsolatedLocalDatabase,
  createLocalSigecoBackup,
  dropIsolatedLocalDatabase,
  restoreLocalSigecoBackup,
  runPrismaMigrations,
  sha256Bytes
} from "./local-backup";

async function seedRecoveryFixture(input: {
  databaseUrl: string;
  clinicalFilesRoot: string;
  runId: string;
}) {
  const adapter = new PrismaPg({ connectionString: input.databaseUrl });
  const prisma = new PrismaClient({
    adapter,
    errorFormat: "minimal",
    log: ["error"]
  });

  try {
    const user = await prisma.internalUser.create({
      data: {
        email: `backup-${input.runId}@example.invalid`,
        name: "Responsable Simulacro",
        passwordHash: "backup-drill-login-disabled",
        role: "super_admin"
      }
    });
    const patient = await prisma.patient.create({
      data: {
        internalCode: `BKP-${input.runId.toUpperCase()}`,
        fullName: "Paciente Sintético De Recuperación",
        phone: "00000000",
        city: "El Alto",
        department: "La Paz",
        country: "Bolivia"
      }
    });
    const visit = await prisma.visit.create({
      data: {
        patientId: patient.id,
        createdById: user.id,
        reason: "Simulacro de backup y restauración",
        originCity: "El Alto",
        originDepartment: "La Paz",
        originCountry: "Bolivia",
        originMatchesPatient: true
      }
    });
    await prisma.cashMovement.create({
      data: {
        patientId: patient.id,
        visitId: visit.id,
        userId: user.id,
        type: "income",
        amountCents: 12_500,
        description: "Movimiento sintético para recuperación"
      }
    });
    await prisma.inventoryItem.create({
      data: {
        internalCode: `BKP-ITEM-${input.runId.toUpperCase()}`,
        sku: `BKP-${input.runId.toUpperCase()}`,
        name: "Producto sintético para recuperación",
        currentStock: 7,
        minimumStock: 2
      }
    });

    const bytes = new TextEncoder().encode(
      "%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF"
    );
    const checksumSha256 = await sha256Bytes(bytes);
    const storageKey = `clinical/local/${randomUUID()}.pdf`;
    const attachmentPath = join(input.clinicalFilesRoot, storageKey);
    await mkdir(dirname(attachmentPath), { recursive: true, mode: 0o700 });
    await writeFile(attachmentPath, bytes, { flag: "wx", mode: 0o600 });
    await chmod(attachmentPath, 0o600);
    await prisma.clinicalAttachment.create({
      data: {
        patientId: patient.id,
        visitId: visit.id,
        uploadedById: user.id,
        uploadRequestId: randomUUID(),
        label: "Adjunto sintético de recuperación",
        contentType: "application/pdf",
        fileExtension: "pdf",
        sizeBytes: bytes.byteLength,
        checksumSha256,
        storageDriver: "local",
        storageKey,
        status: "available",
        scanStatus: "basic_validation_only",
        scanProvider: "backup-drill-fixture",
        scannedAt: new Date()
      }
    });
    await prisma.auditEvent.create({
      data: {
        actorId: user.id,
        actorRole: user.role,
        action: "backup.drill.fixture",
        entityType: "backup_drill",
        entityId: input.runId,
        result: "success",
        requestId: randomUUID(),
        context: { synthetic: true }
      }
    });
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const baseDatabaseUrl = process.env.DATABASE_URL;
  if (!baseDatabaseUrl) throw new Error("DATABASE_URL is required.");

  const runId = `${Date.now().toString(36)}_${randomUUID().slice(0, 8)}`;
  const sourceDatabaseName = createDrillDatabaseName(
    "backup_source",
    runId
  );
  const restoreDatabaseName = createDrillDatabaseName("restore", runId);
  const drillRoot = `.data/backup-drills/${runId}`;
  const sourceClinicalRoot = `${drillRoot}/source-clinical-files`;
  const restoredClinicalRoot = `${drillRoot}/restored-clinical-files`;
  const backupPath = `${drillRoot}/drill.sigeco-backup`;
  const evidenceDirectory = ".data/backup-evidence";
  const evidencePath = `${evidenceDirectory}/${runId}.json`;
  const encryptionKey = randomBytes(48).toString("base64url");
  let sourceDatabaseUrl: string | undefined;
  let restoreDatabaseUrl: string | undefined;
  let succeeded = false;
  const drillStartedAt = Date.now();

  try {
    await mkdir(drillRoot, { recursive: true, mode: 0o700 });
    sourceDatabaseUrl = await createIsolatedLocalDatabase(
      baseDatabaseUrl,
      sourceDatabaseName
    );
    restoreDatabaseUrl = await createIsolatedLocalDatabase(
      baseDatabaseUrl,
      restoreDatabaseName
    );
    await runPrismaMigrations(sourceDatabaseUrl);
    await seedRecoveryFixture({
      databaseUrl: sourceDatabaseUrl,
      clinicalFilesRoot: sourceClinicalRoot,
      runId
    });

    const backup = await createLocalSigecoBackup({
      databaseUrl: sourceDatabaseUrl,
      clinicalFilesRoot: sourceClinicalRoot,
      outputPath: backupPath,
      encryptionKey,
      responsible: "Equipo técnico — simulacro automatizado"
    });
    const restore = await restoreLocalSigecoBackup({
      backupPath,
      databaseUrl: restoreDatabaseUrl,
      clinicalFilesTargetRoot: restoredClinicalRoot,
      encryptionKey,
      confirmation: `RESTORE_${restoreDatabaseName}`
    });

    const summary = restore.manifest.database.summary;
    if (
      summary.patients < 1 ||
      summary.visits < 1 ||
      summary.cashMovements < 1 ||
      summary.inventoryItems < 1 ||
      summary.internalUsers < 1 ||
      summary.usersByRole.super_admin < 1 ||
      summary.clinicalAttachments < 1 ||
      summary.auditEvents < 1 ||
      restore.manifest.clinicalFiles.totalFiles < 1
    ) {
      throw new Error(
        "The drill did not recover every required SIGECO domain."
      );
    }

    const evidence = {
      formatVersion: 1,
      runId,
      performedAt: new Date().toISOString(),
      environment: "local-isolated",
      responsible: "Equipo técnico",
      sourceDatabaseName,
      restoreDatabaseName,
      backupId: backup.manifest.backupId,
      backupDurationMs: backup.durationMs,
      restoreAndVerifyDurationMs: restore.durationMs,
      totalDrillDurationMs: Date.now() - drillStartedAt,
      encryptedSizeBytes: backup.encryptedSizeBytes,
      migrationCount: backup.manifest.database.migrationCount,
      summary,
      clinicalFilesVerified: backup.manifest.clinicalFiles.totalFiles,
      checksumVerified: true,
      encryptedAndAuthenticated: true,
      plaintextCleaned: true,
      result: "passed"
    };
    await mkdir(evidenceDirectory, { recursive: true, mode: 0o700 });
    await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, {
      flag: "wx",
      mode: 0o600
    });
    succeeded = true;
    console.log(
      [
        "Backup and restore drill passed.",
        `runId=${runId}`,
        `backupMs=${backup.durationMs}`,
        `restoreMs=${restore.durationMs}`,
        `clinicalFiles=${backup.manifest.clinicalFiles.totalFiles}`,
        `evidence=${evidencePath}`
      ].join(" | ")
    );
  } finally {
    const cleanupFailures: string[] = [];
    if (sourceDatabaseUrl) {
      await dropIsolatedLocalDatabase(
        baseDatabaseUrl,
        sourceDatabaseName
      ).catch(() => cleanupFailures.push(sourceDatabaseName));
    }
    if (restoreDatabaseUrl) {
      await dropIsolatedLocalDatabase(
        baseDatabaseUrl,
        restoreDatabaseName
      ).catch(() => cleanupFailures.push(restoreDatabaseName));
    }
    if (succeeded) {
      await rm(drillRoot, { recursive: true, force: true });
    }
    if (cleanupFailures.length > 0) {
      throw new Error(
        "The drill could not remove every isolated temporary database."
      );
    }
  }
}

main().catch((error) => {
  reportScriptError("Backup and restore drill failed", error);
  process.exitCode = 1;
});
