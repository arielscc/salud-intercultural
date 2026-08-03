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
  return prisma.internalUser.create({
    data: {
      email,
      role,
      passwordHash: await hashPassword("clave-segura-para-pruebas")
    }
  });
}

beforeEach(cleanUsers);
afterEach(cleanUsers);

describe("internal user management integration", () => {
  it("does not deactivate or demote the last active super administrator", async () => {
    const admin = await createUser("ultimo-admin@example.com");

    await expect(
      updateManagedInternalUserAccess({
        actorId: "otro-actor",
        userId: admin.id,
        role: "super_admin",
        active: false
      })
    ).rejects.toMatchObject({
      code: "LAST_SUPER_ADMIN"
    });
    await expect(
      updateManagedInternalUserAccess({
        actorId: "otro-actor",
        userId: admin.id,
        role: "direccion",
        active: true
      })
    ).rejects.toMatchObject({
      code: "LAST_SUPER_ADMIN"
    });

    expect(await prisma.internalUser.findUnique({ where: { id: admin.id } })).toMatchObject({
      active: true,
      role: "super_admin"
    });
  });

  it("prevents changing or deactivating the actor's own access", async () => {
    const admin = await createUser("self-admin@example.com");

    await expect(
      updateManagedInternalUserAccess({
        actorId: admin.id,
        userId: admin.id,
        role: "direccion",
        active: true
      })
    ).rejects.toMatchObject({ code: "SELF_ROLE_CHANGE" });
    await expect(
      updateManagedInternalUserAccess({
        actorId: admin.id,
        userId: admin.id,
        role: "super_admin",
        active: false
      })
    ).rejects.toMatchObject({ code: "SELF_DEACTIVATE" });
  });

  it("revokes active sessions as soon as access changes", async () => {
    const actor = await createUser("admin-actor@example.com");
    const target = await createUser("empleado@example.com", "recepcion");
    const session = await createInternalSession(target.id, "Mozilla/5.0 Android Chrome/126.0");

    const result = await updateManagedInternalUserAccess({
      actorId: actor.id,
      userId: target.id,
      role: "administracion",
      active: true
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
        passwordHash: await hashPassword("clave-segura-para-pruebas")
      })
    ).rejects.toMatchObject({ code: "INVALID_ROLE" });
  });
});
