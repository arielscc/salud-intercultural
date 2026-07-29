import type {
  InternalRole,
  PatientRouteArea,
  VisitStatus
} from "../src/generated/prisma/client";
import { hashPassword } from "../src/features/internal-auth/password";
import {
  assignableInternalRoles,
  internalRoleLabels
} from "../src/features/internal-auth/permissions";
import { prisma } from "../src/modules/database";
import { reportScriptError } from "./safe-error";
import { assertSafeStagingCommand } from "./staging-safety";

const qaPatientFixtures = [
  {
    area: "recepcion",
    code: "QA-000001",
    name: "[QA] Paciente en recepción",
    reason: "Dato sintético para validar una llegada",
    status: "in_reception"
  },
  {
    area: "medico",
    code: "QA-000002",
    name: "[QA] Paciente en consulta",
    reason: "Dato sintético para validar consulta médica",
    status: "in_consultation"
  },
  {
    area: "enfermeria",
    code: "QA-000003",
    name: "[QA] Paciente en enfermería",
    reason: "Dato sintético para validar enfermería",
    status: "in_nursing"
  },
  {
    area: "administracion",
    code: "QA-000004",
    name: "[QA] Paciente en administración",
    reason: "Dato sintético para validar Caja y venta",
    status: "in_administration"
  }
] as const satisfies ReadonlyArray<{
  area: PatientRouteArea;
  code: string;
  name: string;
  reason: string;
  status: VisitStatus;
}>;

function qaEmail(role: InternalRole, domain: string) {
  return `qa.${role}@${domain}`;
}

async function seedQaUsers(basePassword: string, domain: string) {
  const users = new Map<InternalRole, string>();

  for (const role of assignableInternalRoles) {
    const email = qaEmail(role, domain);
    const passwordHash = await hashPassword(`${basePassword}:${role}`);
    const user = await prisma.internalUser.upsert({
      where: { email },
      update: {
        active: true,
        failedAttempts: 0,
        lockedUntil: null,
        mustChangePassword: false,
        passwordChangedAt: new Date(),
        name: `[QA] ${internalRoleLabels[role]}`,
        passwordHash,
        role
      },
      create: {
        active: true,
        email,
        mustChangePassword: false,
        name: `[QA] ${internalRoleLabels[role]}`,
        passwordChangedAt: new Date(),
        passwordHash,
        role
      }
    });

    users.set(role, user.id);
  }

  return users;
}

async function seedQaQueues(users: Map<InternalRole, string>) {
  const receptionUserId = users.get("recepcion");

  if (!receptionUserId) {
    throw new Error("The reception QA account was not created.");
  }

  for (const [index, fixture] of qaPatientFixtures.entries()) {
    const patient = await prisma.patient.upsert({
      where: { internalCode: fixture.code },
      update: {
        captureSource: "other",
        captureSources: ["other"],
        city: "El Alto",
        followUpPreference: "no_contact",
        fullName: fixture.name,
        generalObservations: "REGISTRO SINTÉTICO DE STAGING. NO CORRESPONDE A UNA PERSONA REAL.",
        phone: `+5910000000${index + 1}`,
        status: "active"
      },
      create: {
        captureSource: "other",
        captureSources: ["other"],
        city: "El Alto",
        followUpPreference: "no_contact",
        fullName: fixture.name,
        generalObservations: "REGISTRO SINTÉTICO DE STAGING. NO CORRESPONDE A UNA PERSONA REAL.",
        internalCode: fixture.code,
        phone: `+5910000000${index + 1}`,
        status: "active"
      }
    });

    const visitId = `qa_visit_${fixture.area}`;
    const routeId = `qa_route_${fixture.area}`;
    const checkedInAt = new Date(Date.now() - index * 15 * 60 * 1000);

    await prisma.visit.upsert({
      where: { id: visitId },
      update: {
        checkedInAt,
        createdById: receptionUserId,
        patientId: patient.id,
        reason: fixture.reason,
        status: fixture.status
      },
      create: {
        checkedInAt,
        createdById: receptionUserId,
        id: visitId,
        patientId: patient.id,
        reason: fixture.reason,
        status: fixture.status
      }
    });

    await prisma.receptionCheckIn.upsert({
      where: { visitId },
      update: {
        note: "Llegada sintética de staging",
        userId: receptionUserId
      },
      create: {
        id: `qa_checkin_${fixture.area}`,
        note: "Llegada sintética de staging",
        userId: receptionUserId,
        visitId
      }
    });

    const route = await prisma.patientRoute.upsert({
      where: { visitId },
      update: {
        active: true,
        currentArea: fixture.area
      },
      create: {
        active: true,
        currentArea: fixture.area,
        id: routeId,
        visitId
      }
    });

    await prisma.patientRouteStep.upsert({
      where: { id: `qa_route_step_${fixture.area}` },
      update: {
        area: fixture.area,
        note: "Paso sintético de staging",
        routeId: route.id,
        status: fixture.status
      },
      create: {
        area: fixture.area,
        id: `qa_route_step_${fixture.area}`,
        note: "Paso sintético de staging",
        routeId: route.id,
        status: fixture.status
      }
    });

    await prisma.visitStatusHistory.upsert({
      where: { id: `qa_status_${fixture.area}` },
      update: {
        note: "Estado sintético de staging",
        toStatus: fixture.status,
        userId: receptionUserId,
        visitId
      },
      create: {
        id: `qa_status_${fixture.area}`,
        note: "Estado sintético de staging",
        toStatus: fixture.status,
        userId: receptionUserId,
        visitId
      }
    });

    await prisma.visitWorkItem.upsert({
      where: { id: `qa_work_item_${fixture.area}` },
      update: {
        area: fixture.area,
        createdById: receptionUserId,
        description: fixture.reason,
        status: "pending",
        title: `[QA] Trabajo de ${fixture.area}`,
        visitId
      },
      create: {
        area: fixture.area,
        createdById: receptionUserId,
        description: fixture.reason,
        id: `qa_work_item_${fixture.area}`,
        status: "pending",
        title: `[QA] Trabajo de ${fixture.area}`,
        visitId
      }
    });
  }

  const followUpPatient = await prisma.patient.upsert({
    where: { internalCode: "QA-000005" },
    update: {
      followUpPreference: "no_contact",
      fullName: "[QA] Paciente de seguimiento",
      phone: "+59100000005"
    },
    create: {
      captureSource: "other",
      captureSources: ["other"],
      city: "El Alto",
      followUpPreference: "no_contact",
      fullName: "[QA] Paciente de seguimiento",
      generalObservations: "REGISTRO SINTÉTICO. NO CONTACTAR.",
      internalCode: "QA-000005",
      phone: "+59100000005"
    }
  });

  await prisma.followUpTask.upsert({
    where: { id: "qa_follow_up_pending" },
    update: {
      assignedToId: users.get("seguimiento"),
      createdById: receptionUserId,
      dueAt: new Date(),
      notes: "Seguimiento sintético. Los enlaces de contacto deben permanecer bloqueados.",
      patientId: followUpPatient.id,
      status: "pending",
      title: "[QA] Validar bandeja de seguimiento"
    },
    create: {
      assignedToId: users.get("seguimiento"),
      createdById: receptionUserId,
      dueAt: new Date(),
      id: "qa_follow_up_pending",
      notes: "Seguimiento sintético. Los enlaces de contacto deben permanecer bloqueados.",
      patientId: followUpPatient.id,
      status: "pending",
      title: "[QA] Validar bandeja de seguimiento"
    }
  });

  await prisma.inventoryItem.upsert({
    where: { internalCode: "QA-INV-001" },
    update: {
      active: true,
      currentStock: 3,
      description: "Producto sintético para pruebas de staging",
      minimumStock: 5,
      name: "[QA] Producto con stock bajo"
    },
    create: {
      active: true,
      currentStock: 3,
      description: "Producto sintético para pruebas de staging",
      internalCode: "QA-INV-001",
      minimumStock: 5,
      name: "[QA] Producto con stock bajo",
      sku: "QA-SKU-001",
      unit: "unidad"
    }
  });
}

async function main() {
  assertSafeStagingCommand("staging:seed:sigeco");

  const basePassword = process.env.STAGING_QA_PASSWORD;
  const domain = process.env.STAGING_QA_EMAIL_DOMAIN?.trim().toLowerCase() || "staging.invalid";

  if (!basePassword || basePassword.length < 20) {
    throw new Error("STAGING_QA_PASSWORD must contain at least 20 characters.");
  }

  if (!domain.endsWith(".invalid")) {
    throw new Error("STAGING_QA_EMAIL_DOMAIN must use the reserved .invalid domain.");
  }

  const users = await seedQaUsers(basePassword, domain);
  await seedQaQueues(users);

  console.log(`Staging SIGECO seed completed: ${users.size} QA roles and synthetic queues.`);
  console.log("QA passwords were not printed. Each role uses STAGING_QA_PASSWORD:<role>.");
}

main()
  .catch((error) => {
    reportScriptError("Staging SIGECO seed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
