import { prisma } from "../src/modules/database";
import { hashPassword } from "../src/features/internal-auth/password";
import { reportScriptError } from "./safe-error";

async function main() {
  const email = process.env.INTERNAL_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.INTERNAL_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error("INTERNAL_ADMIN_EMAIL and INTERNAL_ADMIN_PASSWORD are required.");
  }

  if (password.length < 10) {
    throw new Error("INTERNAL_ADMIN_PASSWORD must be at least 10 characters.");
  }

  const passwordHash = await hashPassword(password);
  const existing = await prisma.internalUser.findUnique({
    where: { email }
  });

  if (existing) {
    await prisma.internalUser.update({
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
    console.log("Internal super administrator updated.");
    return;
  }

  await prisma.internalUser.create({
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

  console.log("Internal super administrator created.");
}

main()
  .catch((error) => {
    reportScriptError("Internal administrator seed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
