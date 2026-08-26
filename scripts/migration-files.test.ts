import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { sigecoModuleCodes } from "@/features/modules/catalog";

const facebookMigrationPath = resolve(
  process.cwd(),
  "prisma/migrations/20260729000000_general_facebook_capture_source/migration.sql"
);
const auditMigrationPath = resolve(
  process.cwd(),
  "prisma/migrations/20260729130000_append_only_audit_events/migration.sql"
);
const userManagementMigrationPath = resolve(
  process.cwd(),
  "prisma/migrations/20260729160000_manage_internal_users_sessions/migration.sql"
);
const moduleActivationMigrationPath = resolve(
  process.cwd(),
  "prisma/migrations/20260824210000_module_activation/migration.sql"
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

  it("adds user access controls without exposing or replacing password hashes", () => {
    const migration = readFileSync(userManagementMigrationPath, "utf8");

    expect(migration).toContain('"mustChangePassword" BOOLEAN NOT NULL DEFAULT false');
    expect(migration).toContain('"passwordChangedAt" TIMESTAMP(3)');
    expect(migration).toContain('"deviceLabel" TEXT');
    expect(migration).not.toContain("passwordHash");
    expect(migration).not.toMatch(/\bDROP\b/i);
  });

  it("seeds exactly the module catalog, no more and no less", () => {
    const migration = readFileSync(moduleActivationMigrationPath, "utf8");
    const seeded = [...migration.matchAll(/^ {2}\('([a-z]+)',\s+'(active|inactive)'/gm)].map(
      (match) => ({ code: match[1], status: match[2] })
    );

    // Lo que verifica la integración es el comportamiento sobre un estado base;
    // que ese estado base salga de la migración se comprueba acá, sobre el
    // archivo, porque en la suite otras pruebas truncan esas filas.
    expect(seeded.map((row) => row.code).sort()).toEqual([...sigecoModuleCodes].sort());
    expect(seeded.filter((row) => row.status === "active").map((row) => row.code)).toEqual([
      "core"
    ]);
  });

  it("makes module activation history append-only and starts with the core module only", () => {
    const migration = readFileSync(moduleActivationMigrationPath, "utf8");

    expect(migration).toContain('BEFORE UPDATE OR DELETE ON "ModuleActivationEvent"');
    expect(migration).toContain("ModuleActivationEvent is append-only");
    expect(migration).toContain("ON DELETE RESTRICT ON UPDATE RESTRICT");
    expect(migration).toContain("('core',           'active'");
    // Aditiva: no altera ni elimina nada de lo que ya existe en la base.
    expect(migration).not.toMatch(/\bDROP\b/i);
    expect(migration).not.toMatch(/ALTER TABLE "(?!ModuleActivation)/);
  });
});
