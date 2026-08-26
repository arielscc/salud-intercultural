import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { prisma } from "@/modules/database";

describe("append-only audit events integration", () => {
  it("allows insert and rejects update and delete", async () => {
    const id = `audit-test-${randomUUID()}`;

    await prisma.auditEvent.create({
      data: {
        id,
        action: "audit.integration_test",
        entityType: "audit_event",
        result: "success",
        requestId: randomUUID()
      }
    });

    await expect(
      prisma.auditEvent.update({
        where: { id },
        data: { result: "failure" }
      })
    ).rejects.toThrow(/append-only/i);

    await expect(prisma.auditEvent.delete({ where: { id } })).rejects.toThrow(/append-only/i);

    expect(await prisma.auditEvent.findUnique({ where: { id } })).toMatchObject({
      action: "audit.integration_test",
      result: "success"
    });
  });
});
