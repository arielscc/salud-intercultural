import "dotenv/config";
import { backupFileName, createLocalSigecoBackup } from "./local-backup";
import { reportScriptError } from "../safe-error";

async function main() {
  const databaseUrl =
    process.env.BACKUP_DATABASE_URL ?? process.env.DATABASE_URL;
  const clinicalFilesRoot =
    process.env.BACKUP_CLINICAL_FILES_PATH ??
    process.env.CLINICAL_FILES_LOCAL_PATH ??
    ".data/clinical-files";
  const outputPath =
    process.env.BACKUP_OUTPUT_PATH ??
    `.data/backups/${backupFileName()}`;

  if (!databaseUrl) {
    throw new Error("BACKUP_DATABASE_URL or DATABASE_URL is required.");
  }

  const result = await createLocalSigecoBackup({
    databaseUrl,
    clinicalFilesRoot,
    outputPath,
    encryptionKey: process.env.BACKUP_ENCRYPTION_KEY ?? "",
    responsible: process.env.BACKUP_RESPONSIBLE ?? ""
  });

  console.log(
    [
      "Encrypted local backup completed.",
      `file=${result.backupPath}`,
      `durationMs=${result.durationMs}`,
      `patients=${result.manifest.database.summary.patients}`,
      `visits=${result.manifest.database.summary.visits}`,
      `clinicalFiles=${result.manifest.clinicalFiles.totalFiles}`
    ].join(" | ")
  );
}

main().catch((error) => {
  reportScriptError("Local backup failed", error);
  process.exitCode = 1;
});
