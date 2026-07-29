import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("user management server boundaries", () => {
  it("protects the administration pages on the server", () => {
    const listPage = readFileSync(
      resolve(process.cwd(), "src/app/(internal)/sigeco/(app)/usuarios/page.tsx"),
      "utf8"
    );
    const detailPage = readFileSync(
      resolve(process.cwd(), "src/app/(internal)/sigeco/(app)/usuarios/[userId]/page.tsx"),
      "utf8"
    );

    expect(listPage).toContain('requirePermission("users_manage")');
    expect(detailPage).toContain('requirePermission("users_manage")');
  });

  it("separates administrative actions from self-service session actions", () => {
    const actions = readFileSync(
      resolve(process.cwd(), "src/features/internal-auth/user-management-actions.ts"),
      "utf8"
    );

    expect(actions.match(/permission: "users_manage"/g)).toHaveLength(5);
    expect(actions.match(/permission: "internal_access"/g)).toHaveLength(2);
    expect(actions).not.toContain("captacion");
  });
});
