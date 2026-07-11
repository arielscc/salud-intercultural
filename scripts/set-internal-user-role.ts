import { prisma } from "../src/modules/database";
import {
  assignableInternalRoles,
  deprecatedInternalRoles
} from "../src/features/internal-auth/permissions";
import type { InternalRole } from "../src/generated/prisma/client";

/*
 * Reasigna el rol de un usuario interno existente.
 * Uso: INTERNAL_USER_EMAIL=... INTERNAL_USER_ROLE=seguimiento pnpm internal:set-role
 * Solo acepta roles asignables (los deprecados, como `captacion`, se rechazan).
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

  await prisma.internalUser.update({
    where: { id: user.id },
    data: { role: role as InternalRole }
  });

  console.log(`Updated ${email}: ${user.role} -> ${role}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
