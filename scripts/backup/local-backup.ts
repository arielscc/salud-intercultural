import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import {
  chmod,
  copyFile,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  writeFile
} from "node:fs/promises";
import { createReadStream, createWriteStream } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { pipeline } from "node:stream/promises";
import { Client } from "pg";
import { assertSafeDatabaseCommand } from "../database-safety";
import {
  decryptBackupFile,
  encryptBackupFile,
  sha256File
} from "./crypto";

const backupFormatVersion = 1;
const safeClinicalStorageKey =
  /^clinical\/(?:local|test)\/[a-zA-Z0-9-]{20,80}\.(?:pdf|jpg|png|webp)$/;
const safeSourceDatabaseName =
  /^salud_intercultural_(?:dev|test|backup_source_[a-z0-9_]+)$/;
const safeRestoreDatabaseName =
  /^salud_intercultural_restore_[a-z0-9_]+$/;

export type DomainSummary = {
  patients: number;
  visits: number;
  cashMovements: number;
  cashAmountCents: string;
  inventoryItems: number;
  inventoryStock: string;
  internalUsers: number;
  usersByRole: Record<string, number>;
  clinicalAttachments: number;
  availableClinicalAttachments: number;
  auditEvents: number;
};

export type ClinicalFileManifestEntry = {
  storageKey: string;
  sizeBytes: number;
  checksumSha256: string;
};

export type SigecoBackupManifest = {
  formatVersion: 1;
  backupId: string;
  createdAt: string;
  responsible: string;
  source: {
    environment: "local";
    databaseName: string;
    clinicalStorageDriver: "local";
  };
  recoveryObjectives: {
    rpoHours: 6;
    rtoHours: 4;
  };
  database: {
    archivePath: "database.dump";
    sizeBytes: number;
    checksumSha256: string;
    migrationCount: number;
    summary: DomainSummary;
  };
  clinicalFiles: {
    archiveRoot: "clinical-files";
    totalFiles: number;
    totalBytes: number;
    files: ClinicalFileManifestEntry[];
  };
};

type LocalDatabase = {
  databaseName: string;
  username: string;
  url: string;
};

type ProcessResult = {
  stderr: string;
  stdout: string;
};

function safeProcessError(command: string, stderr: string) {
  const compact = stderr.trim().split("\n").slice(-4).join(" | ");
  return new Error(
    compact
      ? `${command} failed: ${compact.slice(0, 800)}`
      : `${command} failed.`
  );
}

async function runProcess(
  command: string,
  args: string[],
  options: {
    cwd?: string;
    env?: NodeJS.ProcessEnv;
    stdinPath?: string;
    stdoutPath?: string;
  } = {}
): Promise<ProcessResult> {
  const child = spawn(command, args, {
    cwd: options.cwd,
    env: options.env ?? process.env,
    stdio: [
      options.stdinPath ? "pipe" : "ignore",
      options.stdoutPath ? "pipe" : "pipe",
      "pipe"
    ]
  });
  const childStdout = child.stdout;
  const childStderr = child.stderr;

  if (!childStdout || !childStderr) {
    throw new Error(`${command} did not expose the expected process streams.`);
  }

  let stderr = "";
  let stdout = "";
  childStderr.setEncoding("utf8");
  childStderr.on("data", (chunk: string) => {
    stderr += chunk;
  });
  if (!options.stdoutPath) {
    childStdout.setEncoding("utf8");
    childStdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
  }

  const streamTasks: Promise<unknown>[] = [];
  if (options.stdinPath && child.stdin) {
    streamTasks.push(pipeline(createReadStream(options.stdinPath), child.stdin));
  }
  if (options.stdoutPath) {
    streamTasks.push(
      pipeline(
        childStdout,
        createWriteStream(options.stdoutPath, { flags: "wx", mode: 0o600 })
      )
    );
  }

  const exit = new Promise<number>((resolveExit, reject) => {
    child.once("error", reject);
    child.once("close", (code) => resolveExit(code ?? 1));
  });

  const [code] = await Promise.all([exit, ...streamTasks]);
  if (code !== 0) {
    if (options.stdoutPath) {
      await rm(options.stdoutPath, { force: true });
    }
    throw safeProcessError(command, stderr);
  }

  return { stderr, stdout };
}

function parseLocalDatabase(
  databaseUrl: string,
  purpose: "backup" | "restore"
): LocalDatabase {
  assertSafeDatabaseCommand({
    commandName:
      purpose === "backup" ? "backup:create:local" : "backup:restore:local",
    databaseUrl,
    nextPublicSiteUrl: "http://localhost",
    requireLocalHost: true
  });

  const parsed = new URL(databaseUrl);
  const databaseName = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  const acceptedPattern =
    purpose === "backup" ? safeSourceDatabaseName : safeRestoreDatabaseName;

  if (!acceptedPattern.test(databaseName)) {
    throw new Error(
      purpose === "backup"
        ? "The local backup source database name is not allowed."
        : "The restore database must use the salud_intercultural_restore_* pattern."
    );
  }

  if (!parsed.username) {
    throw new Error("The local database URL must include a PostgreSQL username.");
  }

  return {
    databaseName,
    username: decodeURIComponent(parsed.username),
    url: databaseUrl
  };
}

export function validateLocalBackupDatabaseUrl(
  databaseUrl: string,
  purpose: "backup" | "restore"
) {
  return parseLocalDatabase(databaseUrl, purpose).databaseName;
}

function assertPathInside(
  inputPath: string,
  allowedRoots: string[],
  label: string
) {
  const absolutePath = resolve(process.cwd(), inputPath);
  const allowed = allowedRoots.some((allowedRoot) => {
    const absoluteRoot = resolve(process.cwd(), allowedRoot);
    const relativePath = relative(absoluteRoot, absolutePath);
    return (
      relativePath === "" ||
      (!relativePath.startsWith("..") && !isAbsolute(relativePath))
    );
  });

  if (!allowed) {
    throw new Error(
      `${label} must stay inside ${allowedRoots.join(" or ")}.`
    );
  }

  return absolutePath;
}

export function assertSafeBackupOutputPath(inputPath: string) {
  const absolutePath = assertPathInside(
    inputPath,
    [".data/backups", ".data/backup-drills"],
    "Backup output"
  );

  if (!absolutePath.endsWith(".sigeco-backup")) {
    throw new Error("Backup output must end with .sigeco-backup.");
  }

  return absolutePath;
}

export function assertSafeClinicalFilesPath(inputPath: string) {
  return assertPathInside(
    inputPath,
    [".data/clinical-files", ".data/backup-drills"],
    "Clinical files path"
  );
}

export function assertSafeRestoreFilesPath(inputPath: string) {
  return assertPathInside(
    inputPath,
    [".data/restore-drills", ".data/backup-drills"],
    "Restored clinical files path"
  );
}

async function connect(databaseUrl: string) {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  return client;
}

async function countTable(client: Client, table: string) {
  const result = await client.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM "${table}"`
  );
  return Number(result.rows[0]?.count ?? 0);
}

async function collectDomainSummaryFromClient(
  client: Client
): Promise<DomainSummary> {
  const patients = await countTable(client, "Patient");
  const visits = await countTable(client, "Visit");
  const cashMovements = await countTable(client, "CashMovement");
  const inventoryItems = await countTable(client, "InventoryItem");
  const internalUsers = await countTable(client, "InternalUser");
  const clinicalAttachments = await countTable(client, "ClinicalAttachment");
  const auditEvents = await countTable(client, "AuditEvent");
  const cash = await client.query<{ amount: string }>(
    'SELECT COALESCE(SUM("amountCents"), 0)::text AS amount FROM "CashMovement"'
  );
  const inventory = await client.query<{ stock: string }>(
    'SELECT COALESCE(SUM("currentStock"), 0)::text AS stock FROM "InventoryItem"'
  );
  const available = await client.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
     FROM "ClinicalAttachment"
     WHERE "status" = 'available'`
  );
  const roles = await client.query<{ role: string; count: string }>(
    `SELECT "role"::text AS role, COUNT(*)::text AS count
     FROM "InternalUser"
     GROUP BY "role"
     ORDER BY "role"`
  );

  return {
    patients,
    visits,
    cashMovements,
    cashAmountCents: cash.rows[0]?.amount ?? "0",
    inventoryItems,
    inventoryStock: inventory.rows[0]?.stock ?? "0",
    internalUsers,
    usersByRole: Object.fromEntries(
      roles.rows.map((row) => [row.role, Number(row.count)])
    ),
    clinicalAttachments,
    availableClinicalAttachments: Number(available.rows[0]?.count ?? 0),
    auditEvents
  };
}

export async function collectDomainSummary(databaseUrl: string) {
  const client = await connect(databaseUrl);
  try {
    return await collectDomainSummaryFromClient(client);
  } finally {
    await client.end();
  }
}

async function collectMigrationCountFromClient(client: Client) {
  const result = await client.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
     FROM "_prisma_migrations"
     WHERE finished_at IS NOT NULL
       AND rolled_back_at IS NULL`
  );
  return Number(result.rows[0]?.count ?? 0);
}

async function collectMigrationCount(databaseUrl: string) {
  const client = await connect(databaseUrl);
  try {
    return await collectMigrationCountFromClient(client);
  } finally {
    await client.end();
  }
}

async function copyClinicalFiles(input: {
  client: Client;
  sourceRoot: string;
  targetRoot: string;
}) {
  const result = await input.client.query<{
    storageKey: string;
    sizeBytes: number;
    checksumSha256: string;
    storageDriver: string;
  }>(
    `SELECT
       "storageKey",
       "sizeBytes",
       "checksumSha256",
       "storageDriver"::text AS "storageDriver"
     FROM "ClinicalAttachment"
     WHERE "status" = 'available'
     ORDER BY "storageKey"`
  );
  const attachments = result.rows;
  const files: ClinicalFileManifestEntry[] = [];

  for (const attachment of attachments) {
    if (
      attachment.storageDriver !== "local" ||
      !safeClinicalStorageKey.test(attachment.storageKey)
    ) {
      throw new Error(
        "The local backup found an unsupported clinical attachment reference."
      );
    }

    const sourcePath = join(input.sourceRoot, attachment.storageKey);
    const sourceStat = await stat(sourcePath);
    const checksumSha256 = await sha256File(sourcePath);

    if (
      sourceStat.size !== attachment.sizeBytes ||
      checksumSha256 !== attachment.checksumSha256
    ) {
      throw new Error(
        "A clinical attachment failed its size or checksum verification."
      );
    }

    const targetPath = join(input.targetRoot, attachment.storageKey);
    await mkdir(dirname(targetPath), { recursive: true, mode: 0o700 });
    await copyFile(sourcePath, targetPath);
    await chmod(targetPath, 0o600);
    files.push({
      storageKey: attachment.storageKey,
      sizeBytes: sourceStat.size,
      checksumSha256
    });
  }

  return files;
}

async function createDatabaseDump(
  database: LocalDatabase,
  destinationPath: string,
  snapshotId: string
) {
  await runProcess(
    "docker",
    [
      "compose",
      "exec",
      "-T",
      "postgres",
      "pg_dump",
      "--username",
      database.username,
      "--dbname",
      database.databaseName,
      "--format=custom",
      "--no-owner",
      "--no-acl",
      `--snapshot=${snapshotId}`
    ],
    { stdoutPath: destinationPath }
  );
  await chmod(destinationPath, 0o600);
}

async function restoreDatabaseDump(
  database: LocalDatabase,
  sourcePath: string
) {
  await runProcess(
    "docker",
    [
      "compose",
      "exec",
      "-T",
      "postgres",
      "pg_restore",
      "--username",
      database.username,
      "--dbname",
      database.databaseName,
      "--no-owner",
      "--no-acl",
      "--exit-on-error"
    ],
    { stdinPath: sourcePath }
  );
}

async function createTarArchive(workspace: string, archivePath: string) {
  await runProcess("tar", [
    "--create",
    "--file",
    archivePath,
    "--directory",
    workspace,
    "."
  ]);
  await chmod(archivePath, 0o600);
}

function assertSafeTarEntries(output: string) {
  for (const rawEntry of output.split("\n").filter(Boolean)) {
    const entry = rawEntry.replace(/^\.\//, "");
    if (
      entry === "" ||
      entry === "." ||
      entry === "manifest.json" ||
      entry === "database.dump" ||
      entry === "clinical-files" ||
      entry.startsWith("clinical-files/")
    ) {
      if (
        isAbsolute(entry) ||
        entry.split("/").some((segment) => segment === "..")
      ) {
        throw new Error("The backup archive contains an unsafe path.");
      }
      continue;
    }
    throw new Error("The backup archive contains an unexpected file.");
  }
}

async function assertNoSymbolicLinks(directory: string) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = join(directory, entry.name);
    const entryStat = await lstat(entryPath);
    if (entryStat.isSymbolicLink()) {
      throw new Error("The backup archive contains a symbolic link.");
    }
    if (entryStat.isDirectory()) await assertNoSymbolicLinks(entryPath);
    else if (!entryStat.isFile()) {
      throw new Error("The backup archive contains an unsupported entry.");
    }
  }
}

function parseManifest(contents: string): SigecoBackupManifest {
  const parsed = JSON.parse(contents) as Partial<SigecoBackupManifest>;
  if (
    parsed.formatVersion !== backupFormatVersion ||
    typeof parsed.backupId !== "string" ||
    parsed.database?.archivePath !== "database.dump" ||
    parsed.clinicalFiles?.archiveRoot !== "clinical-files" ||
    !Array.isArray(parsed.clinicalFiles.files)
  ) {
    throw new Error("The backup manifest is invalid or unsupported.");
  }
  return parsed as SigecoBackupManifest;
}

async function verifyExtractedBundle(
  extractedRoot: string,
  manifest: SigecoBackupManifest
) {
  const databaseDumpPath = join(extractedRoot, manifest.database.archivePath);
  const databaseStat = await stat(databaseDumpPath);
  if (
    databaseStat.size !== manifest.database.sizeBytes ||
    (await sha256File(databaseDumpPath)) !== manifest.database.checksumSha256
  ) {
    throw new Error("The PostgreSQL dump does not match the manifest.");
  }

  let totalBytes = 0;
  for (const file of manifest.clinicalFiles.files) {
    if (!safeClinicalStorageKey.test(file.storageKey)) {
      throw new Error("The manifest contains an unsafe clinical storage key.");
    }
    const filePath = join(
      extractedRoot,
      manifest.clinicalFiles.archiveRoot,
      file.storageKey
    );
    const fileStat = await stat(filePath);
    if (
      fileStat.size !== file.sizeBytes ||
      (await sha256File(filePath)) !== file.checksumSha256
    ) {
      throw new Error("A clinical file does not match the manifest.");
    }
    totalBytes += fileStat.size;
  }

  if (
    manifest.clinicalFiles.files.length !==
      manifest.clinicalFiles.totalFiles ||
    totalBytes !== manifest.clinicalFiles.totalBytes
  ) {
    throw new Error("The clinical file totals do not match the manifest.");
  }
}

async function assertEmptyRestoreDatabase(databaseUrl: string) {
  const client = await connect(databaseUrl);
  try {
    const result = await client.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM information_schema.tables
       WHERE table_schema NOT IN ('pg_catalog', 'information_schema')`
    );
    if (Number(result.rows[0]?.count ?? 0) !== 0) {
      throw new Error("The restore database must be empty.");
    }
  } finally {
    await client.end();
  }
}

async function assertEmptyRestoreDirectory(directory: string) {
  try {
    const entries = await readdir(directory);
    if (entries.length > 0) {
      throw new Error("The restored clinical files directory must be empty.");
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

async function copyRestoredClinicalFiles(
  extractedRoot: string,
  targetRoot: string,
  manifest: SigecoBackupManifest
) {
  await mkdir(targetRoot, { recursive: true, mode: 0o700 });
  for (const file of manifest.clinicalFiles.files) {
    const sourcePath = join(
      extractedRoot,
      manifest.clinicalFiles.archiveRoot,
      file.storageKey
    );
    const targetPath = join(targetRoot, file.storageKey);
    await mkdir(dirname(targetPath), { recursive: true, mode: 0o700 });
    await copyFile(sourcePath, targetPath);
    await chmod(targetPath, 0o600);
  }
}

export async function createLocalSigecoBackup(input: {
  databaseUrl: string;
  clinicalFilesRoot: string;
  outputPath: string;
  encryptionKey: string;
  responsible: string;
}) {
  const startedAt = Date.now();
  const database = parseLocalDatabase(input.databaseUrl, "backup");
  const clinicalFilesRoot = assertSafeClinicalFilesPath(
    input.clinicalFilesRoot
  );
  const outputPath = assertSafeBackupOutputPath(input.outputPath);
  const responsible = input.responsible.trim();

  if (responsible.length < 3 || responsible.length > 100) {
    throw new Error("BACKUP_RESPONSIBLE must identify the responsible person.");
  }

  await mkdir(dirname(outputPath), { recursive: true, mode: 0o700 });
  const workspace = await mkdtemp(join(tmpdir(), "sigeco-backup-create-"));
  await chmod(workspace, 0o700);
  const databaseDumpPath = join(workspace, "database.dump");
  const clinicalArchiveRoot = join(workspace, "clinical-files");
  const tarPath = join(tmpdir(), `sigeco-backup-${randomUUID()}.tar`);

  try {
    await mkdir(clinicalArchiveRoot, { recursive: true, mode: 0o700 });
    const snapshotClient = await connect(database.url);
    let summary: DomainSummary;
    let migrationCount: number;
    let clinicalFiles: ClinicalFileManifestEntry[];
    try {
      await snapshotClient.query(
        "BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY"
      );
      const snapshotResult = await snapshotClient.query<{ snapshot: string }>(
        "SELECT pg_export_snapshot() AS snapshot"
      );
      const snapshotId = snapshotResult.rows[0]?.snapshot;
      if (!snapshotId) {
        throw new Error("PostgreSQL did not provide a consistent snapshot.");
      }

      await createDatabaseDump(database, databaseDumpPath, snapshotId);
      summary = await collectDomainSummaryFromClient(snapshotClient);
      migrationCount = await collectMigrationCountFromClient(snapshotClient);
      clinicalFiles = await copyClinicalFiles({
        client: snapshotClient,
        sourceRoot: clinicalFilesRoot,
        targetRoot: clinicalArchiveRoot
      });
      if (
        summary.availableClinicalAttachments !== clinicalFiles.length
      ) {
        throw new Error(
          "The clinical files do not match the consistent database snapshot."
        );
      }
      await snapshotClient.query("COMMIT");
    } catch (error) {
      await snapshotClient.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      await snapshotClient.end();
    }
    const dumpStat = await stat(databaseDumpPath);
    const manifest: SigecoBackupManifest = {
      formatVersion: backupFormatVersion,
      backupId: randomUUID(),
      createdAt: new Date().toISOString(),
      responsible,
      source: {
        environment: "local",
        databaseName: database.databaseName,
        clinicalStorageDriver: "local"
      },
      recoveryObjectives: {
        rpoHours: 6,
        rtoHours: 4
      },
      database: {
        archivePath: "database.dump",
        sizeBytes: dumpStat.size,
        checksumSha256: await sha256File(databaseDumpPath),
        migrationCount,
        summary
      },
      clinicalFiles: {
        archiveRoot: "clinical-files",
        totalFiles: clinicalFiles.length,
        totalBytes: clinicalFiles.reduce(
          (total, file) => total + file.sizeBytes,
          0
        ),
        files: clinicalFiles
      }
    };
    await writeFile(
      join(workspace, "manifest.json"),
      `${JSON.stringify(manifest, null, 2)}\n`,
      { mode: 0o600 }
    );
    await createTarArchive(workspace, tarPath);
    await encryptBackupFile({
      sourcePath: tarPath,
      targetPath: outputPath,
      encryptionKey: input.encryptionKey
    });

    return {
      backupPath: outputPath,
      durationMs: Date.now() - startedAt,
      encryptedSizeBytes: (await stat(outputPath)).size,
      manifest
    };
  } finally {
    await rm(workspace, { recursive: true, force: true });
    await rm(tarPath, { force: true });
  }
}

export async function restoreLocalSigecoBackup(input: {
  backupPath: string;
  databaseUrl: string;
  clinicalFilesTargetRoot: string;
  encryptionKey: string;
  confirmation: string;
}) {
  const startedAt = Date.now();
  const database = parseLocalDatabase(input.databaseUrl, "restore");
  const expectedConfirmation = `RESTORE_${database.databaseName}`;
  if (input.confirmation !== expectedConfirmation) {
    throw new Error(
      `RESTORE_CONFIRMATION must be exactly ${expectedConfirmation}.`
    );
  }

  const backupPath = assertSafeBackupOutputPath(input.backupPath);
  const clinicalFilesTargetRoot = assertSafeRestoreFilesPath(
    input.clinicalFilesTargetRoot
  );
  await assertEmptyRestoreDatabase(database.url);
  await assertEmptyRestoreDirectory(clinicalFilesTargetRoot);

  const workspace = await mkdtemp(join(tmpdir(), "sigeco-backup-restore-"));
  await chmod(workspace, 0o700);
  const tarPath = join(workspace, "decrypted.tar");
  const extractedRoot = join(workspace, "extracted");

  try {
    await decryptBackupFile({
      sourcePath: backupPath,
      targetPath: tarPath,
      encryptionKey: input.encryptionKey
    });
    const listing = await runProcess("tar", ["--list", "--file", tarPath]);
    assertSafeTarEntries(listing.stdout);
    await mkdir(extractedRoot, { mode: 0o700 });
    await runProcess("tar", [
      "--extract",
      "--file",
      tarPath,
      "--directory",
      extractedRoot,
      "--no-same-owner",
      "--no-same-permissions"
    ]);
    await assertNoSymbolicLinks(extractedRoot);
    const manifest = parseManifest(
      await readFile(join(extractedRoot, "manifest.json"), "utf8")
    );
    await verifyExtractedBundle(extractedRoot, manifest);
    await restoreDatabaseDump(
      database,
      join(extractedRoot, manifest.database.archivePath)
    );
    await copyRestoredClinicalFiles(
      extractedRoot,
      clinicalFilesTargetRoot,
      manifest
    );
    await verifyRestoredLocalBackup({
      databaseUrl: database.url,
      clinicalFilesRoot: clinicalFilesTargetRoot,
      manifest
    });

    return {
      durationMs: Date.now() - startedAt,
      manifest
    };
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
}

export async function verifyRestoredLocalBackup(input: {
  databaseUrl: string;
  clinicalFilesRoot: string;
  manifest: SigecoBackupManifest;
}) {
  parseLocalDatabase(input.databaseUrl, "restore");
  const clinicalFilesRoot = assertSafeRestoreFilesPath(
    input.clinicalFilesRoot
  );
  const [summary, migrationCount] = await Promise.all([
    collectDomainSummary(input.databaseUrl),
    collectMigrationCount(input.databaseUrl)
  ]);

  if (
    JSON.stringify(summary) !==
      JSON.stringify(input.manifest.database.summary) ||
    migrationCount !== input.manifest.database.migrationCount
  ) {
    throw new Error(
      "The restored database summary does not match the backup manifest."
    );
  }

  for (const file of input.manifest.clinicalFiles.files) {
    const filePath = join(clinicalFilesRoot, file.storageKey);
    const fileStat = await stat(filePath);
    if (
      fileStat.size !== file.sizeBytes ||
      (await sha256File(filePath)) !== file.checksumSha256
    ) {
      throw new Error(
        "A restored clinical file failed size or checksum verification."
      );
    }
  }

  return {
    databaseSummary: summary,
    migrationCount,
    clinicalFilesVerified: input.manifest.clinicalFiles.files.length
  };
}

export async function createIsolatedLocalDatabase(
  baseDatabaseUrl: string,
  databaseName: string
) {
  const base = parseLocalDatabase(baseDatabaseUrl, "backup");
  if (
    !safeSourceDatabaseName.test(databaseName) &&
    !safeRestoreDatabaseName.test(databaseName)
  ) {
    throw new Error("The isolated database name is not allowed.");
  }
  await runProcess("docker", [
    "compose",
    "exec",
    "-T",
    "postgres",
    "createdb",
    "--username",
    base.username,
    databaseName
  ]);
  const targetUrl = new URL(base.url);
  targetUrl.pathname = `/${databaseName}`;
  return targetUrl.toString();
}

export async function dropIsolatedLocalDatabase(
  baseDatabaseUrl: string,
  databaseName: string
) {
  const base = parseLocalDatabase(baseDatabaseUrl, "backup");
  if (
    !/^salud_intercultural_(?:backup_source|restore)_[a-z0-9_]+$/.test(
      databaseName
    )
  ) {
    throw new Error("Refusing to drop a database outside the drill patterns.");
  }
  await runProcess("docker", [
    "compose",
    "exec",
    "-T",
    "postgres",
    "dropdb",
    "--if-exists",
    "--force",
    "--username",
    base.username,
    databaseName
  ]);
}

export async function runPrismaMigrations(databaseUrl: string) {
  await runProcess("pnpm", ["exec", "prisma", "migrate", "deploy"], {
    env: {
      ...process.env,
      APP_ENV: "local",
      NEXT_PUBLIC_APP_ENV: "local",
      DATABASE_ENVIRONMENT: "local",
      STORAGE_ENVIRONMENT: "local",
      EXTERNAL_COMMUNICATIONS_MODE: "blocked",
      DATABASE_URL: databaseUrl
    }
  });
}

export function createDrillDatabaseName(
  purpose: "backup_source" | "restore",
  runId: string
) {
  const normalized = runId.toLowerCase().replace(/[^a-z0-9_]/g, "_");
  return `salud_intercultural_${purpose}_${normalized}`;
}

export function backupFileName(date = new Date()) {
  return `sigeco-${date.toISOString().replace(/[:.]/g, "-")}.sigeco-backup`;
}

export async function sha256Bytes(bytes: Uint8Array) {
  return createHash("sha256").update(bytes).digest("hex");
}
