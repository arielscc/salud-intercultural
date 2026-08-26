import "dotenv/config";
import { restoreLocalSigecoBackup } from "./local-backup";
import { reportScriptError } from "../safe-error";

async function main() {
  const backupPath = process.env.BACKUP_FILE;
  const databaseUrl = process.env.RESTORE_DATABASE_URL;
  const clinicalFilesTargetRoot = process.env.RESTORE_CLINICAL_FILES_PATH;

  if (!backupPath) throw new Error("BACKUP_FILE is required.");
  if (!databaseUrl) throw new Error("RESTORE_DATABASE_URL is required.");
  if (!clinicalFilesTargetRoot) {
    throw new Error("RESTORE_CLINICAL_FILES_PATH is required.");
  }

  const result = await restoreLocalSigecoBackup({
    backupPath,
    databaseUrl,
    clinicalFilesTargetRoot,
    encryptionKey: process.env.BACKUP_ENCRYPTION_KEY ?? "",
    confirmation: process.env.RESTORE_CONFIRMATION ?? ""
  });

  console.log(
    [
      "Isolated local restore verified.",
      `backupId=${result.manifest.backupId}`,
      `durationMs=${result.durationMs}`,
      `migrations=${result.manifest.database.migrationCount}`,
      `clinicalFiles=${result.manifest.clinicalFiles.totalFiles}`
    ].join(" | ")
  );
}

main().catch((error) => {
  reportScriptError("Local restore failed", error);
  process.exitCode = 1;
});
