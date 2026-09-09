import { prisma } from "../src/modules/database";
import {
  assignableInternalRoles,
  deprecatedInternalRoles
} from "../src/features/internal-auth/permissions";
import type { InternalRole } from "../src/generated/prisma/client";
import { reportScriptError } from "./safe-error";

/*
 * Reasigna el rol de un usuario interno existente.
 * Uso: INTERNAL_USER_EMAIL=... INTERNAL_USER_ROLE=recepcion
 *      INTERNAL_USER_BRANCH=el-alto pnpm internal:set-role
 * Solo acepta roles asignables (los deprecados, como `captacion` y
 * `seguimiento`, se rechazan).
 */
async function main() {
  const email = process.env.INTERNAL_USER_EMAIL?.trim().toLowerCase();
  const role = process.env.INTERNAL_USER_ROLE?.trim();
  const branchCode = process.env.INTERNAL_USER_BRANCH?.trim();

  if (!email || !role) {
    throw new Error("INTERNAL_USER_EMAIL and INTERNAL_USER_ROLE are required.");
  }

  if (deprecatedInternalRoles.includes(role as InternalRole)) {
    throw new Error(
      `Role "${role}" is deprecated and can no longer be assigned. Assignable roles: ${assignableInternalRoles.join(", ")}.`
    );
  }

  if (!assignableInternalRoles.includes(role as InternalRole)) {
    throw new Error(
      `Unknown role "${role}". Assignable roles: ${assignableInternalRoles.join(", ")}.`
    );
  }

  const user = await prisma.internalUser.findUnique({ where: { email } });

  if (!user) {
    throw new Error(`No internal user found with email ${email}.`);
  }

  await prisma.$transaction(async (tx) => {
    if (role === "super_admin") {
      await tx.internalUser.update({
        where: { id: user.id },
        data: { platformRole: "super_admin" }
      });
      const branches = await tx.clinicBranch.findMany({
        where: { status: { not: "inactive" } },
        select: { code: true }
      });
      await tx.internalUserBranch.createMany({
        data: branches.map((branch) => ({
          userId: user.id,
          branchCode: branch.code,
          role: "super_admin" as const,
          active: true
        })),
        skipDuplicates: true
      });
      await tx.internalUserBranch.updateMany({
        where: { userId: user.id, branchCode: { in: branches.map((branch) => branch.code) } },
        data: { role: "super_admin", active: true }
      });
      return;
    }

    if (!branchCode) {
      throw new Error("INTERNAL_USER_BRANCH is required for an operational role.");
    }
    const branch = await tx.clinicBranch.findFirst({
      where: { code: branchCode, status: { not: "inactive" } },
      select: { code: true }
    });
    if (!branch) throw new Error(`Unknown or inactive branch "${branchCode}".`);
    await tx.internalUser.update({
      where: { id: user.id },
      data: { platformRole: null }
    });
    // El comando asigna un único destino. Las rotaciones de médicos y
    // enfermería se administran explícitamente desde Usuarios, sede por sede.
    await tx.internalUserBranch.updateMany({
      where: { userId: user.id },
      data: { role: role as InternalRole, active: false, isDefault: false }
    });
    await tx.internalUserBranch.upsert({
      where: { userId_branchCode: { userId: user.id, branchCode } },
      create: {
        userId: user.id,
        branchCode,
        role: role as InternalRole,
        active: true,
        isDefault: true
      },
      update: { role: role as InternalRole, active: true, isDefault: true }
    });
  });

  console.log(
    role === "super_admin"
      ? "Internal user promoted to platform super administrator."
      : `Internal user role updated to ${role} in ${branchCode}.`
  );
}

main()
  .catch((error) => {
    reportScriptError("Internal role update", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
