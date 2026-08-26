import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const featuresRoot = resolve(process.cwd(), "src/features");
/*
 * Consultas de lectura que igual validan permiso pero no generan evento: no
 * cambian nada y auditar cada tecleo del buscador enterraría los eventos que sí
 * importan. Agregar una entrada acá es una decisión, no un descuido.
 */
const nonCriticalReadActions = new Set([
  "searchReceptionPatientsAction",
  // Solo responde si un código de campaña existe; no revela datos ni escribe.
  "validateAttributionEvidenceCodeAction"
]);

function exportedActionSegments(source: string) {
  const starts = [...source.matchAll(/export async function \w+\b/g)].map(
    (match) => match.index
  );
  return starts.map((start, index) =>
    source.slice(start, starts[index + 1] ?? source.length)
  );
}

function applicationSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      return entry.name === "generated" ? [] : applicationSourceFiles(path);
    }
    return /\.(ts|tsx)$/.test(entry.name) && !entry.name.includes(".test.") ? [path] : [];
  });
}

const actionFiles = applicationSourceFiles(featuresRoot).filter((file) =>
  file.endsWith("actions.ts")
);

describe("SIGECO audit coverage", () => {
  it("routes every current server action through the audit service", () => {
    for (const file of actionFiles) {
      const source = readFileSync(file, "utf8");
      const actions = exportedActionSegments(source);

      expect(actions.length, `${file} has no exported actions`).toBeGreaterThan(0);
      for (const action of actions) {
        const actionName = action.match(/function (\w+)/)?.[1];
        if (actionName && nonCriticalReadActions.has(actionName)) {
          expect(action, `${file}: ${actionName} must still validate permission`).toContain(
            "requirePermission"
          );
          continue;
        }
        expect(
          /runAuditedAction|appendAuditEvent/.test(action),
          `${file}: ${actionName} is not audited`
        ).toBe(true);
      }
    }
  });

  it("does not add application update or delete calls for AuditEvent", () => {
    const source = applicationSourceFiles(resolve(process.cwd(), "src"))
      .map((file) => readFileSync(file, "utf8"))
      .join("\n");

    expect(source).not.toMatch(/auditEvent\.(update|updateMany|delete|deleteMany)\b/);
  });
});
