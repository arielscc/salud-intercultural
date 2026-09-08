import { prisma } from "../src/modules/database";
import {
  assignableInternalRoles,
  deprecatedInternalRoles
} from "../src/features/internal-auth/permissions";
import type { InternalRole } from "../src/generated/prisma/client";
import { reportScriptError } from "./safe-error";

/*
 * Reasigna el rol de un usuario interno existente.
 * Uso: INTERNAL_USER_EMAIL=... INTERNAL_USER_ROLE=recepcion pnpm internal:set-role
 * Solo acepta roles asignables (los deprecados, como `captacion` y
 * `seguimiento`, se rechazan).
 */
async function main() {
  const email = process.env.INTERNAL_USER_EMAIL?.trim().toLowerCase();
  const role = process.env.INTERNAL_USER_ROLE?.trim();

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
    await tx.internalUser.update({
      where: { id: user.id },
      data: { role: role as InternalRole }
    });

    if (role === "super_admin") {
      const branches = await tx.clinicBranch.findMany({
        where: { status: { not: "inactive" } },
        select: { code: true }
      });
      await tx.internalUserBranch.createMany({
        data: branches.map((branch) => ({ userId: user.id, branchCode: branch.code })),
        skipDuplicates: true
      });
    }
  });

  console.log(`Internal user role updated: ${user.role} -> ${role}.`);
}

main()
  .catch((error) => {
    reportScriptError("Internal role update", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
