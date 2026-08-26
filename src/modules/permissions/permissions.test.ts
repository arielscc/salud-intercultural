import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  getModuleAccessState: vi.fn(),
  append: vi.fn()
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((target: string) => {
    throw new Error(`REDIRECT:${target}`);
  })
}));

vi.mock("@/features/internal-auth/session", () => ({
  getInternalSessionToken: vi.fn(async () => "session-token"),
  getInternalUserBySessionToken: mocks.getUser,
  getInternalSessionByToken: vi.fn()
}));

vi.mock("@/modules/database/queries/modules", () => ({
  getModuleAccessState: mocks.getModuleAccessState
}));

vi.mock("@/modules/audit/append", () => ({
  appendAuditEvent: mocks.append
}));

import { requireModule, requirePermission } from "@/modules/permissions";

describe("requirePermission", () => {
  beforeEach(() => {
    mocks.getUser.mockReset();
    mocks.getModuleAccessState.mockReset();
    mocks.append.mockReset();
    mocks.append.mockResolvedValue({ id: "audit-1" });
    mocks.getUser.mockResolvedValue({
      id: "user-1",
      role: "super_admin",
      mustChangePassword: false
    });
    mocks.getModuleAccessState.mockResolvedValue({
      active: ["core", "administracion"],
      suspended: []
    });
  });

  it("deja pasar cuando el rol tiene el permiso y el módulo está lanzado", async () => {
    await expect(requirePermission("sales_read")).resolves.toMatchObject({ id: "user-1" });
    expect(mocks.append).not.toHaveBeenCalled();
  });

  it("rechaza y audita el acceso de un rol sin el permiso", async () => {
    mocks.getUser.mockResolvedValue({
      id: "user-2",
      role: "recepcion",
      mustChangePassword: false
    });
    mocks.getModuleAccessState.mockResolvedValue({ active: ["core"], suspended: [] });

    await expect(requirePermission("modules_read")).rejects.toThrow(
      "REDIRECT:/sigeco?aviso=permiso-denegado"
    );
    expect(mocks.append).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "page.denied",
        entityType: "page",
        result: "denied",
        context: { permission: "modules_read", reason: "missing_permission" }
      })
    );
  });

  it("rechaza y audita la entrada a una pantalla de un módulo apagado", async () => {
    await expect(requirePermission("clinical_read")).rejects.toThrow(
      "REDIRECT:/sigeco?aviso=modulo-no-disponible"
    );
    expect(mocks.append).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "module.disabled",
        entityType: "module",
        result: "denied",
        context: expect.objectContaining({
          reason: "module_disabled",
          permission: "clinical_read",
          modules: ["consulta"]
        })
      })
    );
  });

  it("respeta el módulo fijado aunque el permiso lo habilite otro", async () => {
    // Administración tiene `patients_read`, pero la ficha vive en Recepción.
    await expect(requirePermission("patients_read")).resolves.toMatchObject({ id: "user-1" });

    await expect(
      requirePermission("patients_read", { module: "recepcion" })
    ).rejects.toThrow("REDIRECT:/sigeco?aviso=modulo-no-disponible");
  });

  it("no deja que el super administrador evada un módulo apagado", async () => {
    mocks.getModuleAccessState.mockResolvedValue({ active: ["core"], suspended: [] });

    await expect(requirePermission("sales_read")).rejects.toThrow(
      "REDIRECT:/sigeco?aviso=modulo-no-disponible"
    );
  });

  it("nunca bloquea los permisos del núcleo", async () => {
    mocks.getModuleAccessState.mockResolvedValue({ active: ["core"], suspended: [] });

    await expect(requirePermission("modules_manage")).resolves.toMatchObject({ id: "user-1" });
    await expect(requirePermission("users_manage")).resolves.toMatchObject({ id: "user-1" });
  });
});

describe("requireModule", () => {
  beforeEach(() => {
    mocks.getUser.mockReset();
    mocks.getModuleAccessState.mockReset();
    mocks.append.mockReset();
    mocks.append.mockResolvedValue({ id: "audit-1" });
    mocks.getUser.mockResolvedValue({
      id: "user-1",
      role: "super_admin",
      mustChangePassword: false
    });
  });

  it("deja pasar un módulo activo", async () => {
    mocks.getModuleAccessState.mockResolvedValue({
      active: ["core", "recepcion"],
      suspended: []
    });

    await expect(requireModule("recepcion")).resolves.toMatchObject({ id: "user-1" });
  });

  it("rechaza y audita un módulo apagado", async () => {
    mocks.getModuleAccessState.mockResolvedValue({ active: ["core"], suspended: [] });

    await expect(requireModule("recepcion")).rejects.toThrow(
      "REDIRECT:/sigeco?aviso=modulo-no-disponible"
    );
    expect(mocks.append).toHaveBeenCalledWith(
      expect.objectContaining({ action: "module.disabled", entityId: "recepcion" })
    );
  });
});

describe("módulo suspendido", () => {
  beforeEach(() => {
    mocks.getUser.mockReset();
    mocks.getModuleAccessState.mockReset();
    mocks.append.mockReset();
    mocks.append.mockResolvedValue({ id: "audit-1" });
    mocks.getModuleAccessState.mockResolvedValue({
      active: ["core"],
      suspended: ["administracion"]
    });
  });

  it("deja entrar a Dirección en solo lectura, sin auditar un rechazo", async () => {
    mocks.getUser.mockResolvedValue({
      id: "direccion-1",
      role: "direccion",
      mustChangePassword: false
    });

    await expect(requirePermission("sales_read")).resolves.toMatchObject({
      id: "direccion-1"
    });
    expect(mocks.append).not.toHaveBeenCalled();
  });

  it("bloquea la escritura incluso para el super administrador", async () => {
    mocks.getUser.mockResolvedValue({
      id: "root-1",
      role: "super_admin",
      mustChangePassword: false
    });

    await expect(requirePermission("sales_write")).rejects.toThrow(
      "REDIRECT:/sigeco?aviso=modulo-no-disponible"
    );
  });

  it("no abre la lectura al resto del personal", async () => {
    mocks.getUser.mockResolvedValue({
      id: "admin-1",
      role: "administracion",
      mustChangePassword: false
    });

    await expect(requirePermission("sales_read")).rejects.toThrow(
      "REDIRECT:/sigeco?aviso=modulo-no-disponible"
    );
    expect(mocks.append).toHaveBeenCalledWith(
      expect.objectContaining({ action: "module.disabled" })
    );
  });

  it("no confunde suspendido con nunca lanzado", async () => {
    mocks.getUser.mockResolvedValue({
      id: "direccion-1",
      role: "direccion",
      mustChangePassword: false
    });

    // Consulta no está suspendida: nunca se lanzó.
    await expect(requirePermission("clinical_read")).rejects.toThrow(
      "REDIRECT:/sigeco?aviso=modulo-no-disponible"
    );
  });
});
