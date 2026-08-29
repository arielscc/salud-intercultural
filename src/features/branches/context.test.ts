import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cookie: vi.fn(),
  getBranchesForUser: vi.fn()
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: mocks.cookie }))
}));

vi.mock("@/modules/database/queries/branches", () => ({
  getBranchesForUser: mocks.getBranchesForUser
}));

import { resolveBranchContext } from "@/features/branches/context";

const user = { id: "user-1", role: "super_admin" as const };

function branch(
  code: string,
  overrides: Partial<{ status: "active" | "preparation"; assigned: boolean; isDefault: boolean }> = {}
) {
  return {
    code,
    name: code,
    city: code,
    department: code,
    status: "active" as const,
    assigned: true,
    isDefault: false,
    ...overrides
  };
}

/** La cookie elige la sede activa, y desde la activación por módulo por sucursal
 *  esa elección decide además qué está encendido. Solo puede elegir entre las
 *  sedes asignadas y abiertas: nunca agregar una. */
describe("resolveBranchContext", () => {
  beforeEach(() => {
    mocks.cookie.mockReset();
    mocks.getBranchesForUser.mockReset();
  });

  it("respeta la sucursal pedida por la cookie cuando está asignada y abierta", async () => {
    mocks.cookie.mockReturnValue({ value: "cochabamba" });
    mocks.getBranchesForUser.mockResolvedValue([
      branch("el-alto", { isDefault: true }),
      branch("cochabamba")
    ]);

    const { activeBranch } = await resolveBranchContext(user);

    expect(activeBranch?.code).toBe("cochabamba");
  });

  it("ignora una cookie que nombra una sede no asignada", async () => {
    mocks.cookie.mockReturnValue({ value: "cochabamba" });
    mocks.getBranchesForUser.mockResolvedValue([
      branch("el-alto", { isDefault: true }),
      branch("cochabamba", { assigned: false })
    ]);

    const { activeBranch } = await resolveBranchContext(user);

    expect(activeBranch?.code).toBe("el-alto");
  });

  it("ignora una cookie que nombra una sede todavía en preparación", async () => {
    mocks.cookie.mockReturnValue({ value: "cochabamba" });
    mocks.getBranchesForUser.mockResolvedValue([
      branch("el-alto", { isDefault: true }),
      branch("cochabamba", { status: "preparation" })
    ]);

    const { activeBranch } = await resolveBranchContext(user);

    expect(activeBranch?.code).toBe("el-alto");
  });

  it("ignora una cookie con un código inventado", async () => {
    mocks.cookie.mockReturnValue({ value: "sede-que-no-existe" });
    mocks.getBranchesForUser.mockResolvedValue([branch("el-alto", { isDefault: true })]);

    const { activeBranch } = await resolveBranchContext(user);

    expect(activeBranch?.code).toBe("el-alto");
  });

  it("no devuelve sucursal cuando ninguna está asignada y abierta", async () => {
    mocks.cookie.mockReturnValue(undefined);
    mocks.getBranchesForUser.mockResolvedValue([
      branch("cochabamba", { status: "preparation" })
    ]);

    const { activeBranch } = await resolveBranchContext(user);

    expect(activeBranch).toBeUndefined();
  });
});
