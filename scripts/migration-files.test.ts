import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const facebookMigrationPath = resolve(
  process.cwd(),
  "prisma/migrations/20260729000000_general_facebook_capture_source/migration.sql"
);
const auditMigrationPath = resolve(
  process.cwd(),
  "prisma/migrations/20260729130000_append_only_audit_events/migration.sql"
);

describe("Prisma migration files", () => {
  it("backfills Facebook sources in the Lead table created by the CRM migration", () => {
    const migration = readFileSync(facebookMigrationPath, "utf8");

    expect(migration).toContain('UPDATE "Lead"');
    expect(migration).not.toContain('UPDATE "InternalLead"');
  });

  it("makes audit events append-only at the database layer", () => {
    const migration = readFileSync(auditMigrationPath, "utf8");

    expect(migration).toContain('BEFORE UPDATE OR DELETE ON "AuditEvent"');
    expect(migration).toContain("AuditEvent is append-only");
    expect(migration).toContain("ON DELETE RESTRICT ON UPDATE RESTRICT");
  });
});
