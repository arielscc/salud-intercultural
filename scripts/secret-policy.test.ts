import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function trackedFiles() {
  try {
    return execFileSync("git", ["ls-files", "-z"], {
      cwd: process.cwd(),
      encoding: "utf8"
    })
      .split("\0")
      .filter(Boolean);
  } catch {
    return null;
  }
}

function repositoryFiles(directory = process.cwd()): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (
      [".git", ".next", ".gstack", "node_modules"].includes(entry.name) ||
      entry.name.startsWith(".env")
    ) {
      return [];
    }
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return repositoryFiles(path);
    return [path.replace(`${process.cwd()}/`, "")];
  });
}

function readableSecurityFiles() {
  return (trackedFiles() ?? repositoryFiles()).filter(
    (file) =>
      !file.includes(".test.") &&
      !file.startsWith("docs/masters/") &&
      !file.endsWith(".png") &&
      !file.endsWith(".jpg") &&
      !file.endsWith(".jpeg") &&
      !file.endsWith(".webp") &&
      !file.endsWith(".ico") &&
      !file.endsWith(".woff") &&
      !file.endsWith(".woff2")
  );
}

const credentialPatterns = [
  /AKIA[0-9A-Z]{16}/,
  /ghp_[A-Za-z0-9]{30,}/,
  /github_pat_[A-Za-z0-9_]{20,}/,
  /sk_live_[A-Za-z0-9]{16,}/,
  /xox[baprs]-[A-Za-z0-9-]{10,}/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/
];

describe("repository secret policy", () => {
  it("does not track real environment files", () => {
    const tracked = trackedFiles();
    if (tracked) {
      const trackedEnvironmentFiles = tracked.filter(
        (file) =>
          /^\.env(?:\.|$)/.test(file) &&
          !/\.(?:example|sample|template)$/.test(file)
      );
      expect(trackedEnvironmentFiles).toEqual([]);
      return;
    }

    const gitignore = readFileSync(
      resolve(process.cwd(), ".gitignore"),
      "utf8"
    );
    expect(gitignore).toMatch(/^\.env$/m);
    expect(gitignore).toMatch(/^\.env\.test$/m);
    expect(gitignore).toMatch(/^\.env\*\.local$/m);
    expect(gitignore).toMatch(/^\.env\.staging$/m);
  });

  it("does not contain high-confidence credential formats", () => {
    for (const file of readableSecurityFiles()) {
      const source = readFileSync(resolve(process.cwd(), file), "utf8");
      for (const pattern of credentialPatterns) {
        expect(pattern.test(source), `${file} contains a credential-like value`).toBe(false);
      }
    }
  });

  it("never declares a secret as a NEXT_PUBLIC variable", () => {
    const source = readableSecurityFiles()
      .map((file) => readFileSync(resolve(process.cwd(), file), "utf8"))
      .join("\n");

    expect(source).not.toMatch(
      /NEXT_PUBLIC_[A-Z0-9_]*(?:SECRET|TOKEN|PASSWORD|DATABASE|CREDENTIAL|PRIVATE_KEY)/
    );
  });

  it("pins every GitHub Action to an immutable commit", () => {
    const workflow = readFileSync(
      resolve(process.cwd(), ".github/workflows/ci.yml"),
      "utf8"
    );
    const actionReferences = [...workflow.matchAll(/uses:\s+([^\s#]+)/g)].map(
      (match) => match[1]
    );

    expect(actionReferences.length).toBeGreaterThan(0);
    for (const reference of actionReferences) {
      expect(reference, `${reference} must use a 40-character commit`).toMatch(
        /@[0-9a-f]{40}$/
      );
    }
  });
});
