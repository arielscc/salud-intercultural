import { describe, expect, it } from "vitest";
import {
  assertSafeBackupOutputPath,
  assertSafeClinicalFilesPath,
  assertSafeRestoreFilesPath,
  backupFileName,
  createDrillDatabaseName,
  validateLocalBackupDatabaseUrl
} from "./local-backup";

describe("local SIGECO backup safety", () => {
  it("accepts only ignored private backup and restore locations", () => {
    expect(
      assertSafeBackupOutputPath(
        ".data/backups/2026-07-29.sigeco-backup"
      )
    ).toMatch(/\.data\/backups/);
    expect(
      assertSafeClinicalFilesPath(".data/clinical-files")
    ).toMatch(/\.data\/clinical-files$/);
    expect(
      assertSafeRestoreFilesPath(
        ".data/restore-drills/qa/clinical-files"
      )
    ).toMatch(/\.data\/restore-drills/);
  });

  it.each([
    "public/backup.sigeco-backup",
    "../backup.sigeco-backup",
    ".data/backup.sql",
    ".data/backups/../secret.sigeco-backup"
  ])("rejects unsafe backup output %s", (filePath) => {
    expect(() => assertSafeBackupOutputPath(filePath)).toThrow();
  });

  it.each(["public/files", "../clinical-files", ".data/backups/files"])(
    "rejects unsafe restore output %s",
    (filePath) => {
      expect(() => assertSafeRestoreFilesPath(filePath)).toThrow();
    }
  );

  it("uses recognizable isolated database and backup names", () => {
    expect(createDrillDatabaseName("backup_source", "QA-123")).toBe(
      "salud_intercultural_backup_source_qa_123"
    );
    expect(createDrillDatabaseName("restore", "QA-123")).toBe(
      "salud_intercultural_restore_qa_123"
    );
    expect(backupFileName(new Date("2026-07-29T12:00:00.000Z"))).toBe(
      "sigeco-2026-07-29T12-00-00-000Z.sigeco-backup"
    );
  });

  it("accepts only controlled local source and restore databases", () => {
    expect(
      validateLocalBackupDatabaseUrl(
        "postgresql://user:password@localhost:5432/salud_intercultural_dev",
        "backup"
      )
    ).toBe("salud_intercultural_dev");
    expect(
      validateLocalBackupDatabaseUrl(
        "postgresql://user:password@localhost:5432/salud_intercultural_restore_qa_123",
        "restore"
      )
    ).toBe("salud_intercultural_restore_qa_123");
  });

  it.each([
    [
      "postgresql://user:password@localhost:5432/salud_intercultural_dev",
      "restore"
    ],
    [
      "postgresql://user:password@localhost:5432/salud_intercultural_staging",
      "backup"
    ],
    [
      "postgresql://user:password@db.example.com:5432/salud_intercultural_restore_qa",
      "restore"
    ],
    [
      "postgresql://user:password@ep-example.neon.tech/salud_intercultural_dev",
      "backup"
    ]
  ] as const)(
    "rejects database URL %s for %s",
    (databaseUrl, purpose) => {
      expect(() =>
        validateLocalBackupDatabaseUrl(databaseUrl, purpose)
      ).toThrow();
    }
  );
});
