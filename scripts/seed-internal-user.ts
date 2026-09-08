import { prisma } from "../src/modules/database";
import { hashPassword } from "../src/features/internal-auth/password";
import { reportScriptError } from "./safe-error";

/**
 * Sucursal predeterminada del administrador sembrado.
 *
 * El Alto es la sede que opera hoy, así que sigue siendo la omisión. Se
 * parametriza porque un entorno de piloto arranca en otra sede —Cochabamba— y
 * sin esto el administrador nacía asignado a la sucursal equivocada, que es
 * justo la que no se quiere tocar.
 */
const defaultBranchCode = "el-alto";

async function assignAllBranchesToSuperAdmin(userId: string, defaultCode: string) {
  const branches = await prisma.clinicBranch.findMany({
    where: { status: { not: "inactive" } },
    select: { code: true }
  });

  await prisma.$transaction(async (tx) => {
    await tx.internalUserBranch.createMany({
      data: branches.map((branch) => ({ userId, branchCode: branch.code })),
      skipDuplicates: true
    });
    await tx.internalUserBranch.updateMany({
      where: { userId },
      data: { isDefault: false }
    });
    await tx.internalUserBranch.update({
      where: { userId_branchCode: { userId, branchCode: defaultCode } },
      data: { isDefault: true }
    });
  });
}

async function main() {
  const email = process.env.INTERNAL_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.INTERNAL_ADMIN_PASSWORD;
  const branchCode = process.env.INTERNAL_ADMIN_BRANCH?.trim() || defaultBranchCode;

  if (!email || !password) {
    throw new Error("INTERNAL_ADMIN_EMAIL and INTERNAL_ADMIN_PASSWORD are required.");
  }

  if (password.length < 10) {
    throw new Error("INTERNAL_ADMIN_PASSWORD must be at least 10 characters.");
  }

  const branch = await prisma.clinicBranch.findUnique({ where: { code: branchCode } });
  if (!branch) {
    throw new Error(`INTERNAL_ADMIN_BRANCH "${branchCode}" is not a known branch.`);
  }

  const passwordHash = await hashPassword(password);
  const existing = await prisma.internalUser.findUnique({
    where: { email }
  });

  if (existing) {
    const updated = await prisma.internalUser.update({
      where: { id: existing.id },
      data: {
        passwordHash,
        role: "super_admin",
        active: true,
        failedAttempts: 0,
        lockedUntil: null,
        mustChangePassword: false,
        passwordChangedAt: new Date()
      }
    });
    await assignAllBranchesToSuperAdmin(updated.id, branchCode);
    console.log(`Internal super administrator updated (${branchCode}).`);
    return;
  }

  const created = await prisma.internalUser.create({
    data: {
      email,
      passwordHash,
      role: "super_admin",
      active: true,
      mustChangePassword: false,
      passwordChangedAt: new Date(),
      name: "Super Administrador"
    }
  });
  await assignAllBranchesToSuperAdmin(created.id, branchCode);

  console.log(`Internal super administrator created (${branchCode}).`);
}

main()
  .catch((error) => {
    reportScriptError("Internal administrator seed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
