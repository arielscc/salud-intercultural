import { assignableInternalRoles } from "../src/features/internal-auth/permissions";
import { prisma } from "../src/modules/database";
import { assertSafeStagingCommand } from "./staging-safety";

async function main() {
  const summary = assertSafeStagingCommand("staging:verify");
  const domain = process.env.STAGING_QA_EMAIL_DOMAIN?.trim().toLowerCase() || "staging.invalid";
  const expectedEmails = assignableInternalRoles.map((role) => `qa.${role}@${domain}`);

  const [accounts, patientCount, inventoryFixture] = await Promise.all([
    prisma.internalUser.findMany({
      where: { email: { in: expectedEmails } },
      select: { active: true, email: true, role: true }
    }),
    prisma.patient.count({
      where: { internalCode: { startsWith: "QA-" } }
    }),
    prisma.inventoryItem.findUnique({
      where: { internalCode: "QA-INV-001" },
      select: { id: true }
    })
  ]);

  const validAccounts = new Set(
    accounts
      .filter((account) => account.active)
      .map((account) => `${account.email}:${account.role}`)
  );
  const missingRoles = assignableInternalRoles.filter(
    (role) => !validAccounts.has(`qa.${role}@${domain}:${role}`)
  );

  if (missingRoles.length > 0) {
    throw new Error(`Missing active QA accounts for roles: ${missingRoles.join(", ")}.`);
  }

  if (patientCount < 5 || !inventoryFixture) {
    throw new Error("Synthetic staging fixtures are incomplete. Run pnpm staging:seed.");
  }

  console.log(
    [
      "Staging verified",
      `roles=${accounts.length}/${assignableInternalRoles.length}`,
      `syntheticPatients=${patientCount}`,
      `database=${summary.databaseEnvironment}`,
      `storage=${summary.storageEnvironment}`,
      `communications=${summary.externalCommunicationsMode}`
    ].join(" | ")
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
