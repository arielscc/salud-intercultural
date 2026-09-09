import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auditCreate: vi.fn(),
  branchOwnedEntityExists: vi.fn(),
  getBranchContext: vi.fn(),
  getModuleAccessState: vi.fn()
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers({ "x-request-id": "request-test" }))
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((target: string) => {
    throw new Error(`REDIRECT:${target}`);
  })
}));

vi.mock("@/modules/database", () => ({
  prisma: {
    auditEvent: {
      create: mocks.auditCreate
    }
  }
}));

vi.mock("@/features/branches/context", () => {
  class BranchContextMismatchError extends Error {}
  class BranchContextUnavailableError extends Error {}
  return {
    BranchContextMismatchError,
    BranchContextUnavailableError,
    getBranchContext: mocks.getBranchContext
  };
});

vi.mock("@/features/modules/request-state", () => ({
  getModuleAccessState: mocks.getModuleAccessState
}));

vi.mock("@/modules/database/queries/branch-ownership", () => ({
  branchOwnedEntityExists: mocks.branchOwnedEntityExists
}));

import { sigecoModuleCodes } from "@/features/modules/catalog";
import {
  auditedResult,
  denyAuditedAction,
  runAuditedAction
} from "@/modules/audit/service";

function branchContext(user: {
  id: string;
  role: "super_admin" | "medico" | "enfermeria";
  mustChangePassword?: boolean;
}) {
  return {
    user: { ...user, mustChangePassword: user.mustChangePassword ?? false },
    operationalRole: user.role,
    activeBranch: { code: "el-alto", name: "El Alto" },
    assignment: {
      userId: user.id,
      branchCode: "el-alto",
      isDefault: true,
      source: "membership"
    },
    branches: [],
    canSwitch: false
  };
}

describe("runAuditedAction", () => {
  beforeEach(() => {
    mocks.auditCreate.mockReset();
    mocks.branchOwnedEntityExists.mockReset();
    mocks.getBranchContext.mockReset();
    mocks.getModuleAccessState.mockReset();
    // Por defecto, todo lanzado: las pruebas existentes describen el sistema
    // completo y no deben cambiar de resultado por el gate de módulos.
    mocks.getModuleAccessState.mockResolvedValue({
      active: [...sigecoModuleCodes],
      suspended: []
    });
    mocks.auditCreate.mockResolvedValue({ id: "audit-1" });
    mocks.branchOwnedEntityExists.mockResolvedValue(null);
    mocks.getBranchContext.mockResolvedValue(
      branchContext({ id: "user-1", role: "super_admin" })
    );
  });

  it("writes exactly one success event", async () => {
    const result = await runAuditedAction(
      {
        permission: "patients_create",
        action: "patient.create",
        entityType: "patient"
      },
      async () => auditedResult("created", { entityId: "patient-1" })
    );

    expect(result).toBe("created");
    expect(mocks.auditCreate).toHaveBeenCalledTimes(1);
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorId: "user-1",
        action: "patient.create",
        entityId: "patient-1",
        result: "success",
        requestId: "request-test"
      })
    });
  });

  it("writes exactly one failure event and rethrows the action error", async () => {
    await expect(
      runAuditedAction(
        {
          permission: "patients_create",
          action: "patient.create",
          entityType: "patient"
        },
        async () => {
          throw new Error("database failed");
        }
      )
    ).rejects.toThrow("database failed");

    expect(mocks.auditCreate).toHaveBeenCalledTimes(1);
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ result: "failure" })
    });
  });

  it("writes exactly one denied event when the role lacks permission", async () => {
    mocks.getBranchContext.mockResolvedValue(
      branchContext({ id: "user-2", role: "medico" })
    );

    await expect(
      runAuditedAction(
        {
          permission: "audit_read",
          action: "audit.list",
          entityType: "audit_event"
        },
        async () => auditedResult(undefined)
      )
    ).rejects.toThrow("REDIRECT:/sigeco");

    expect(mocks.auditCreate).toHaveBeenCalledTimes(1);
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorId: "user-2",
        result: "denied"
      })
    });
  });

  it("does not retry the audit insert when the audit store fails", async () => {
    mocks.auditCreate.mockRejectedValue(new Error("audit unavailable"));

    await expect(
      runAuditedAction(
        {
          permission: "patients_create",
          action: "patient.create",
          entityType: "patient"
        },
        async () => auditedResult("created", { entityId: "patient-2" })
      )
    ).rejects.toThrow("audit unavailable");

    expect(mocks.auditCreate).toHaveBeenCalledTimes(1);
  });

  it("records a policy denial raised inside the protected operation", async () => {
    await expect(
      runAuditedAction(
        {
          permission: "visits_create",
          action: "reception.intake.create",
          entityType: "visit"
        },
        async () => denyAuditedAction("secondary_permission_denied")
      )
    ).rejects.toThrow("REDIRECT:/sigeco");

    expect(mocks.auditCreate).toHaveBeenCalledTimes(1);
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ result: "denied" })
    });
  });

  it("denies an operational ID outside the active branch without running the action", async () => {
    mocks.branchOwnedEntityExists.mockResolvedValue(false);
    const operation = vi.fn(async () => auditedResult(undefined));

    await expect(
      runAuditedAction(
        {
          permission: "visits_update",
          action: "visit.update",
          entityType: "visit",
          entityId: "visit-from-other-branch"
        },
        operation
      )
    ).rejects.toThrow("REDIRECT:/sigeco");

    expect(operation).not.toHaveBeenCalled();
    expect(mocks.branchOwnedEntityExists).toHaveBeenCalledWith({
      entityType: "visit",
      entityId: "visit-from-other-branch",
      branchCode: "el-alto"
    });
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        result: "denied",
        context: expect.objectContaining({ reason: "entity_not_found" })
      })
    });
  });

  it("blocks critical actions until a required password change is completed", async () => {
    mocks.getBranchContext.mockResolvedValue(
      branchContext({
        id: "user-3",
        role: "super_admin",
        mustChangePassword: true
      })
    );
    const operation = vi.fn(async () => auditedResult(undefined));

    await expect(
      runAuditedAction(
        {
          permission: "users_manage",
          action: "user.create",
          entityType: "internal_user"
        },
        operation
      )
    ).rejects.toThrow("REDIRECT:/sigeco/cambiar-contrasena");

    expect(operation).not.toHaveBeenCalled();
    expect(mocks.auditCreate).toHaveBeenCalledTimes(1);
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ result: "denied" })
    });
  });
});

describe("gate de módulos en acciones auditadas", () => {
  beforeEach(() => {
    mocks.auditCreate.mockReset();
    mocks.branchOwnedEntityExists.mockReset();
    mocks.getBranchContext.mockReset();
    mocks.getModuleAccessState.mockReset();
    mocks.auditCreate.mockResolvedValue({ id: "audit-module" });
    mocks.branchOwnedEntityExists.mockResolvedValue(null);
    mocks.getBranchContext.mockResolvedValue(
      branchContext({ id: "user-1", role: "super_admin" })
    );
  });

  it("rechaza la acción de un módulo apagado sin ejecutarla", async () => {
    mocks.getModuleAccessState.mockResolvedValue({ active: ["core"], suspended: [] });
    const operation = vi.fn();

    await expect(
      runAuditedAction(
        {
          permission: "visits_create",
          action: "reception.intake.create",
          entityType: "visit"
        },
        operation
      )
    ).rejects.toThrow("REDIRECT:/sigeco?aviso=modulo-no-disponible");

    expect(operation).not.toHaveBeenCalled();
  });

  it("audita el rechazo como module.disabled con la acción intentada", async () => {
    mocks.getModuleAccessState.mockResolvedValue({ active: ["core"], suspended: [] });

    await expect(
      runAuditedAction(
        {
          permission: "visits_create",
          action: "reception.intake.create",
          entityType: "visit"
        },
        async () => auditedResult("nunca")
      )
    ).rejects.toThrow("REDIRECT:/sigeco?aviso=modulo-no-disponible");

    expect(mocks.auditCreate).toHaveBeenCalledTimes(1);
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "module.disabled",
        entityType: "module",
        result: "denied",
        context: expect.objectContaining({
          reason: "module_disabled",
          attemptedAction: "reception.intake.create",
          permission: "visits_create",
          modules: ["recepcion"]
        })
      })
    });
  });

  it("distingue el rechazo por módulo del rechazo por permiso", async () => {
    mocks.getModuleAccessState.mockResolvedValue({
      active: [...sigecoModuleCodes],
      suspended: []
    });
    mocks.getBranchContext.mockResolvedValue(
      branchContext({ id: "user-2", role: "enfermeria" })
    );

    await expect(
      runAuditedAction(
        {
          permission: "visits_create",
          action: "reception.intake.create",
          entityType: "visit"
        },
        async () => auditedResult("nunca")
      )
    ).rejects.toThrow("REDIRECT:/sigeco?aviso=permiso-denegado");

    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "reception.intake.create",
        result: "denied",
        context: expect.objectContaining({ reason: "missing_permission" })
      })
    });
  });

  it("no deja que el super administrador evada un módulo apagado", async () => {
    mocks.getModuleAccessState.mockResolvedValue({
      active: ["core", "administracion"],
      suspended: []
    });

    await expect(
      runAuditedAction(
        {
          permission: "clinical_write",
          action: "clinical.consultation.save",
          entityType: "clinical_consultation"
        },
        async () => auditedResult("nunca")
      )
    ).rejects.toThrow("REDIRECT:/sigeco?aviso=modulo-no-disponible");
  });

  it("respeta el módulo fijado cuando el permiso lo comparten varios", async () => {
    mocks.getModuleAccessState.mockResolvedValue({
      active: ["core", "administracion"],
      suspended: []
    });

    // Sin fijar el módulo, Administración alcanza para `patients_update`.
    await expect(
      runAuditedAction(
        {
          permission: "patients_update",
          action: "patient.update",
          entityType: "patient"
        },
        async () => auditedResult("ok")
      )
    ).resolves.toBe("ok");

    // Fijado a Recepción, la misma acción queda bloqueada.
    await expect(
      runAuditedAction(
        {
          permission: "patients_update",
          module: "recepcion",
          action: "reception.patient.update",
          entityType: "patient"
        },
        async () => auditedResult("nunca")
      )
    ).rejects.toThrow("REDIRECT:/sigeco?aviso=modulo-no-disponible");
  });

  it("bloquea los permisos retirados aunque todo esté lanzado", async () => {
    mocks.getModuleAccessState.mockResolvedValue({
      active: [...sigecoModuleCodes],
      suspended: []
    });

    await expect(
      runAuditedAction(
        { permission: "leads_create", action: "lead.create", entityType: "lead" },
        async () => auditedResult("nunca")
      )
    ).rejects.toThrow("REDIRECT:/sigeco?aviso=modulo-no-disponible");
  });
});
