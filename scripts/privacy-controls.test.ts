import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { reportScriptError } from "./safe-error";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("SIGECO privacy controls", () => {
  it("keeps personal and stock details out of redirect URLs", () => {
    const redirectSources = [
      "src/features/internal-auth/actions.ts",
      "src/features/patients/actions.ts",
      "src/features/reception/actions.ts",
      "src/features/sales/actions.ts",
      "src/app/(internal)/sigeco/login/page.tsx",
      "src/app/(internal)/sigeco/(app)/recepcion/page.tsx",
      "src/app/(internal)/sigeco/(app)/recepcion/nuevo/page.tsx",
      "src/app/(internal)/sigeco/(app)/administracion/[workItemId]/page.tsx"
    ]
      .map(source)
      .join("\n");

    expect(redirectSources).not.toMatch(
      /(?:duplicatePhone|params\.email|params\.search|name="search"|product\?: string|available\?: string|requested\?: string)/
    );
    expect(redirectSources).not.toMatch(
      /[?&](?:email|phone|fullName|search|product|available|requested)=/
    );
  });

  it("marks private routes as no-store, no-referrer and no-index", () => {
    const nextConfig = source("next.config.mjs");
    const internalLayout = source("src/app/(internal)/sigeco/layout.tsx");
    const appLayout = source(
      "src/app/(internal)/sigeco/(app)/layout.tsx"
    );

    expect(nextConfig).toContain("private, no-store");
    expect(nextConfig).toContain('value: "no-referrer"');
    expect(nextConfig).toContain("noindex, nofollow, noarchive, nosnippet");
    expect(internalLayout).toContain("index: false");
    expect(internalLayout).toContain("follow: false");
    expect(appLayout).toContain('dynamic = "force-dynamic"');
    expect(nextConfig).not.toMatch(/serviceWorker|service-worker|workbox/i);
  });

  it("does not enable Prisma query logging", () => {
    const databaseClient = source("src/modules/database/client.ts");

    expect(databaseClient).not.toMatch(/\[\s*"query"/);
    expect(databaseClient).toContain('errorFormat: "minimal"');
  });

  it("reports script errors without printing their message or secrets", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const sensitiveMessage =
      "postgresql://private:password@db/patient patient@example.com 72514890";

    reportScriptError("Seed", new Error(sensitiveMessage));

    const output = errorSpy.mock.calls.flat().join(" ");
    expect(output).toContain("Seed failed");
    expect(output).not.toContain("private");
    expect(output).not.toContain("patient@example.com");
    expect(output).not.toContain("72514890");
    errorSpy.mockRestore();
  });

  it("hides global patient search when the role lacks patient access", () => {
    const shell = source("src/components/internal/InternalShell.tsx");

    // `canUse` exige el permiso del rol y, ademas, que el modulo este lanzado:
    // la busqueda lleva a la ficha, que vive en Recepcion.
    expect(shell).toContain(
      'canUse(user.role, activeModules, "patients_read", "recepcion")'
    );
  });
});
