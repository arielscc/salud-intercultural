import { resolveDeploymentEnvironment } from "../src/lib/deployment-environment";
import { prisma } from "../src/modules/database";
import { reportScriptError } from "./safe-error";

const syntheticPatientCode = "QA-CBBA-000001";
const syntheticVisitKey = "qa:multi-branch:cochabamba:visit-1";

async function main() {
  const environment = resolveDeploymentEnvironment();
  if (environment !== "local" && environment !== "test") {
    throw new Error("Synthetic multi-branch data is allowed only in local or test.");
  }

  const branch = await prisma.clinicBranch.findUnique({ where: { code: "cochabamba" } });
  if (!branch || branch.status !== "preparation") {
    throw new Error("Cochabamba must exist in preparation status.");
  }

  const patient = await prisma.patient.upsert({
    where: { internalCode: syntheticPatientCode },
    create: {
      internalCode: syntheticPatientCode,
      fullName: "Paciente Sintético Cochabamba",
      phone: "00000000",
      normalizedName: "paciente sintetico cochabamba",
      normalizedPhone: "00000000",
      city: "Cochabamba",
      department: "Cochabamba",
      country: "Bolivia"
    },
    update: {}
  });

  await prisma.visit.upsert({
    where: { idempotencyKey: syntheticVisitKey },
    create: {
      idempotencyKey: syntheticVisitKey,
      patientId: patient.id,
      branchCode: branch.code,
      isTestData: true,
      reason: "Validación sintética de separación entre sucursales",
      originCity: "Cochabamba",
      originDepartment: "Cochabamba",
      originCountry: "Bolivia"
    },
    update: { isTestData: true, branchCode: branch.code }
  });

  console.log("Synthetic Cochabamba branch data verified locally.");
}

main()
  .catch((error) => {
    reportScriptError("Multi-branch synthetic seed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
