import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cookie: vi.fn(),
  getBranchesForUser: vi.fn(),
  getInternalSessionToken: vi.fn(),
  getInternalUserBySessionToken: vi.fn()
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: mocks.cookie }))
}));

vi.mock("@/features/internal-auth/session", () => ({
  getInternalSessionToken: mocks.getInternalSessionToken,
  getInternalUserBySessionToken: mocks.getInternalUserBySessionToken
}));

vi.mock("@/modules/database/queries/branches", () => ({
  getBranchesForUser: mocks.getBranchesForUser
}));

import {
  assertBranchMatchesContext,
  BranchContextMismatchError,
  resolveBranchAccessMode,
  resolveBranchContext,
  selectActiveBranch,
  type BranchRequestContext
} from "@/features/branches/context";

const user = {
  id: "user-1",
  platformRole: "super_admin" as const,
  mustChangePassword: false
};

function branch(
  code: string,
  overrides: Partial<{
    status: "active" | "preparation";
    role: "super_admin" | "administracion" | "enfermeria";
    membershipActive: boolean;
    assigned: boolean;
    isDefault: boolean;
  }> = {}
) {
  return {
    code,
    name: code,
    city: code,
    department: code,
    status: "active" as const,
    role: "super_admin" as const,
    membershipActive: true,
    assigned: true,
    isDefault: false,
    assignmentSource: "membership" as const,
    ...overrides
  };
}

describe("selectActiveBranch", () => {
  it("acepta solamente una cookie que nombra una sede asignada y activa", () => {
    expect(
      selectActiveBranch(
        [branch("el-alto", { isDefault: true }), branch("cochabamba")],
        "cochabamba"
      )
    ).toMatchObject({ ok: true, branch: { code: "cochabamba" } });
  });

  it.each([
    ["no asignada", branch("cochabamba", { assigned: false })],
    ["con membresía desactivada", branch("cochabamba", { membershipActive: false })],
    ["en preparación", branch("cochabamba", { status: "preparation" })]
  ])("rechaza una cookie de sede %s sin caer en otra sucursal", (_label, target) => {
    expect(
      selectActiveBranch([branch("el-alto", { isDefault: true }), target], "cochabamba")
    ).toEqual({ ok: false, reason: "invalid_active_branch" });
  });

  it("rechaza un código inventado aunque exista una sede predeterminada", () => {
    expect(
      selectActiveBranch([branch("el-alto", { isDefault: true })], "sede-inventada")
    ).toEqual({ ok: false, reason: "invalid_active_branch" });
  });

  it("sin cookie usa únicamente una asignación marcada explícitamente como default", () => {
    expect(
      selectActiveBranch([
        branch("cochabamba"),
        branch("el-alto", { isDefault: true })
      ])
    ).toMatchObject({ ok: true, branch: { code: "el-alto" } });
  });

  it("conserva el rol propio de la sucursal seleccionada", () => {
    expect(
      selectActiveBranch(
        [
          branch("el-alto", { role: "administracion", isDefault: true }),
          branch("cochabamba", { role: "enfermeria" })
        ],
        "cochabamba"
      )
    ).toMatchObject({ ok: true, branch: { role: "enfermeria" } });
  });

  it("no elige la primera sede cuando falta una asignación default", () => {
    expect(selectActiveBranch([branch("cochabamba")])).toEqual({
      ok: false,
      reason: "active_branch_required"
    });
  });
});

describe("resolveBranchAccessMode", () => {
  it("deja trabajar solo en la sede clínica predeterminada", () => {
    expect(resolveBranchAccessMode({ role: "medico", isDefault: true })).toBe("work");
    expect(resolveBranchAccessMode({ role: "medico", isDefault: false })).toBe("consult");
    expect(resolveBranchAccessMode({ role: "enfermeria", isDefault: false })).toBe(
      "consult"
    );
    expect(resolveBranchAccessMode({ role: "super_admin", isDefault: false })).toBe(
      "work"
    );
  });
});

describe("resolveBranchContext", () => {
  beforeEach(() => {
    mocks.cookie.mockReset();
    mocks.getBranchesForUser.mockReset();
    mocks.getInternalSessionToken.mockResolvedValue("token");
    mocks.getInternalUserBySessionToken.mockResolvedValue(user);
  });

  it("construye usuario, asignación y rol operativo desde la sesión", async () => {
    mocks.cookie.mockReturnValue({ value: "cochabamba" });
    mocks.getBranchesForUser.mockResolvedValue([
      branch("el-alto", { isDefault: true }),
      branch("cochabamba")
    ]);

    const resolution = await resolveBranchContext();

    expect(resolution).toMatchObject({
      ok: true,
      context: {
        user: { id: "user-1" },
        activeBranch: { code: "cochabamba" },
        assignment: {
          userId: "user-1",
          branchCode: "cochabamba",
          source: "membership"
        },
        operationalRole: "super_admin",
        accessMode: "work"
      }
    });
  });
});

describe("assertBranchMatchesContext", () => {
  it("rechaza un branchCode informativo de otra sede sin revelar recursos", () => {
    const context = {
      activeBranch: { code: "el-alto" }
    } as BranchRequestContext;

    expect(() => assertBranchMatchesContext(context, "cochabamba")).toThrow(
      BranchContextMismatchError
    );
    expect(() => assertBranchMatchesContext(context, "el-alto")).not.toThrow();
  });
});
