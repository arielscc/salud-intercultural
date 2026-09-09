import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { hashPassword } from "@/features/internal-auth/password";
import { createInternalSession, getInternalSessionByToken } from "@/features/internal-auth/session";
import { prisma } from "@/modules/database";
import {
  createManagedInternalUser,
  updateManagedInternalUserAccess
} from "@/modules/database/queries/internal-users";

async function cleanUsers() {
  await prisma.internalSession.deleteMany();
  await prisma.internalUser.deleteMany();
}

async function createUser(
  email: string,
  role:
    | "super_admin"
    | "direccion"
    | "medico"
    | "recepcion"
    | "administracion"
    | "enfermeria"
    | "seguimiento" = "super_admin"
) {
  const user = await prisma.internalUser.create({
    data: {
      email,
      platformRole: role === "super_admin" ? "super_admin" : null,
      passwordHash: await hashPassword("clave-segura-para-pruebas")
    }
  });
  await prisma.internalUserBranch.create({
    data: {
      userId: user.id,
      branchCode: "el-alto",
      role,
      active: true,
      isDefault: true
    }
  });
  return user;
}

beforeEach(cleanUsers);
afterEach(cleanUsers);

describe("internal user management integration", () => {
  it("persists every configurable branch when creating a super administrator", async () => {
    const user = await createManagedInternalUser({
      name: "Administrador global",
      email: "global-admin@example.com",
      role: "super_admin",
      passwordHash: await hashPassword("clave-segura-para-pruebas"),
      branchCode: "el-alto"
    });

    const assignments = await prisma.internalUserBranch.findMany({
      where: { userId: user.id },
      select: { branchCode: true, isDefault: true },
      orderBy: { branchCode: "asc" }
    });

    expect(assignments.map((assignment) => assignment.branchCode)).toEqual([
      "cochabamba",
      "el-alto"
    ]);
    expect(assignments.find((assignment) => assignment.isDefault)?.branchCode).toBe(
      "el-alto"
    );
  });

  it("does not deactivate or demote the last active super administrator", async () => {
    const admin = await createUser("ultimo-admin@example.com");

    await expect(
      updateManagedInternalUserAccess({
        actorId: "otro-actor",
        userId: admin.id,
        platformRole: "super_admin",
        staffRole: "direccion",
        active: false,
        defaultBranchCode: "el-alto"
      })
    ).rejects.toMatchObject({
      code: "LAST_SUPER_ADMIN"
    });
    await expect(
      updateManagedInternalUserAccess({
        actorId: "otro-actor",
        userId: admin.id,
        platformRole: null,
        staffRole: "direccion",
        active: true,
        defaultBranchCode: "el-alto"
      })
    ).rejects.toMatchObject({
      code: "LAST_SUPER_ADMIN"
    });

    expect(await prisma.internalUser.findUnique({ where: { id: admin.id } })).toMatchObject({
      active: true,
      platformRole: "super_admin"
    });
  });

  it("prevents changing or deactivating the actor's own access", async () => {
    const admin = await createUser("self-admin@example.com");

    await expect(
      updateManagedInternalUserAccess({
        actorId: admin.id,
        userId: admin.id,
        platformRole: null,
        staffRole: "direccion",
        active: true,
        defaultBranchCode: "el-alto"
      })
    ).rejects.toMatchObject({ code: "SELF_ROLE_CHANGE" });
    await expect(
      updateManagedInternalUserAccess({
        actorId: admin.id,
        userId: admin.id,
        platformRole: "super_admin",
        staffRole: "direccion",
        active: false,
        defaultBranchCode: "el-alto"
      })
    ).rejects.toMatchObject({ code: "SELF_DEACTIVATE" });
  });

  it("revokes active sessions as soon as global access changes", async () => {
    const actor = await createUser("admin-actor@example.com");
    const target = await createUser("empleado@example.com", "recepcion");
    const session = await createInternalSession(target.id, "Mozilla/5.0 Android Chrome/126.0");

    const result = await updateManagedInternalUserAccess({
      actorId: actor.id,
      userId: target.id,
      platformRole: null,
      staffRole: "recepcion",
      active: false,
      defaultBranchCode: "el-alto"
    });

    expect(result.revokedSessions).toBe(1);
    expect(await getInternalSessionByToken(session.token)).toBeNull();
  });

  it("never assigns the deprecated captacion role to a new user", async () => {
    await expect(
      createManagedInternalUser({
        name: "Rol Antiguo",
        email: "captacion-nueva@example.com",
        role: "captacion",
        passwordHash: await hashPassword("clave-segura-para-pruebas"),
        branchCode: "el-alto"
      })
    ).rejects.toMatchObject({ code: "INVALID_ROLE" });
  });
});
