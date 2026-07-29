import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auditCreate: vi.fn(),
  getCurrentInternalUser: vi.fn()
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

vi.mock("@/modules/permissions", () => ({
  getCurrentInternalUser: mocks.getCurrentInternalUser
}));

import {
  auditedResult,
  denyAuditedAction,
  runAuditedAction
} from "@/modules/audit/service";

describe("runAuditedAction", () => {
  beforeEach(() => {
    mocks.auditCreate.mockReset();
    mocks.getCurrentInternalUser.mockReset();
    mocks.auditCreate.mockResolvedValue({ id: "audit-1" });
    mocks.getCurrentInternalUser.mockResolvedValue({
      id: "user-1",
      role: "super_admin"
    });
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
    mocks.getCurrentInternalUser.mockResolvedValue({
      id: "user-2",
      role: "medico"
    });

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
});
