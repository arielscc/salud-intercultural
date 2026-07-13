/*
 * Seed de un paciente demo con historia completa para QA manual:
 * varias visitas en distintos dias, distintos tipos de llegada y
 * acciones en todas las areas (recepcion, medico, enfermeria,
 * administracion y seguimiento). Solo corre contra la base local dev.
 *
 * Uso: node --import dotenv/config --import tsx scripts/seed-demo-patient.ts
 */
import { prisma } from "../src/modules/database";
import { assertSafeDatabaseCommand } from "./database-safety";

const PATIENT_NAME = "Ariel Socrates Chura Choque";
const PATIENT_PHONE = "72514890";
const SEED_USER_EMAIL = "test@test.si";

function at(daysAgo: number, hour: number, minute = 0) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hour, minute, 0, 0);
  return date;
}

function inDays(days: number, hour: number, minute = 0) {
  return at(-days, hour, minute);
}

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

type RouteStepInput = {
  area: "recepcion" | "medico" | "enfermeria" | "administracion" | "seguimiento" | "cierre";
  status:
    | "in_reception"
    | "in_consultation"
    | "in_nursing"
    | "in_administration"
    | "completed"
    | "left_without_care"
    | "cancelled";
  note?: string;
  startedAt: Date;
  endedAt?: Date;
};

type VisitSeedInput = {
  patientId: string;
  userId: string;
  status: RouteStepInput["status"];
  reason: string;
  intakeType: "first_visit" | "treatment_control" | "new_problem" | "results_review";
  symptomDurationValue?: number;
  symptomDurationUnit?: "days" | "weeks" | "months" | "years";
  previouslyTreated?: boolean;
  bringsStudies?: boolean;
  checkedInAt: Date;
  completedAt?: Date;
  checkInNote?: string;
  steps: RouteStepInput[];
};

/*
 * Replica lo que crean createVisitInTransaction y updateVisitRouteStatus:
 * visita + check-in + historial de estados + ruta con pasos + work items
 * de derivacion, pero con fechas historicas controladas.
 */
async function seedVisit(tx: Tx, input: VisitSeedInput) {
  const [firstStep, ...transitions] = input.steps;
  const lastStep = input.steps[input.steps.length - 1];
  const isClosed = ["completed", "left_without_care", "cancelled"].includes(input.status);

  const visit = await tx.visit.create({
    data: {
      patientId: input.patientId,
      createdById: input.userId,
      status: input.status,
      reason: input.reason,
      intakeType: input.intakeType,
      symptomDurationValue: input.symptomDurationValue,
      symptomDurationUnit: input.symptomDurationUnit,
      previouslyTreated: input.previouslyTreated,
      bringsStudies: input.bringsStudies ?? false,
      checkedInAt: input.checkedInAt,
      completedAt: input.completedAt,
      createdAt: input.checkedInAt
    }
  });

  await tx.receptionCheckIn.create({
    data: {
      visitId: visit.id,
      userId: input.userId,
      note: input.checkInNote,
      createdAt: input.checkedInAt
    }
  });

  const route = await tx.patientRoute.create({
    data: {
      visitId: visit.id,
      currentArea: lastStep.area,
      active: !isClosed,
      createdAt: input.checkedInAt
    }
  });

  for (const step of input.steps) {
    await tx.patientRouteStep.create({
      data: {
        routeId: route.id,
        area: step.area,
        status: step.status,
        note: step.note,
        startedAt: step.startedAt,
        endedAt: step.endedAt
      }
    });
  }

  await tx.visitStatusHistory.create({
    data: {
      visitId: visit.id,
      userId: input.userId,
      toStatus: "in_reception",
      note: input.checkInNote ?? "Llegada registrada",
      createdAt: input.checkedInAt
    }
  });

  let previousStatus: RouteStepInput["status"] = firstStep.status;

  for (const step of transitions) {
    await tx.visitStatusHistory.create({
      data: {
        visitId: visit.id,
        userId: input.userId,
        fromStatus: previousStatus,
        toStatus: step.status,
        note: step.note,
        createdAt: step.startedAt
      }
    });
    previousStatus = step.status;
  }

  await tx.visitWorkItem.create({
    data: {
      visitId: visit.id,
      createdById: input.userId,
      area: "recepcion",
      status: isClosed ? "completed" : "pending",
      title: "Recepción registrada",
      description: input.reason,
      createdAt: input.checkedInAt,
      completedAt: isClosed ? input.completedAt : undefined
    }
  });

  return { visit, route };
}

async function main() {
  assertSafeDatabaseCommand({
    commandName: "seed-demo-patient",
    allowedDatabaseNames: ["salud_intercultural_dev"],
    requireLocalHost: true
  });

  const user = await prisma.internalUser.findUnique({
    where: { email: SEED_USER_EMAIL },
    select: { id: true }
  });

  if (!user) {
    throw new Error(`No existe el usuario interno ${SEED_USER_EMAIL}. Corre pnpm internal:seed primero.`);
  }

  const existing = await prisma.patient.findFirst({
    where: { fullName: PATIENT_NAME },
    select: { internalCode: true }
  });

  if (existing) {
    console.log(`El paciente demo ya existe (${existing.internalCode}). No se creo nada.`);
    return;
  }

  const cashMethod = await prisma.paymentMethod.findUniqueOrThrow({ where: { code: "cash" } });
  const qrMethod = await prisma.paymentMethod.findUniqueOrThrow({ where: { code: "qr" } });

  await prisma.$transaction(
    async (tx) => {
      const patientCount = await tx.patient.count();
      const userId = user.id;

      const patient = await tx.patient.create({
        data: {
          internalCode: `SI-${String(patientCount + 1).padStart(6, "0")}`,
          fullName: PATIENT_NAME,
          phone: PATIENT_PHONE,
          secondaryPhone: "68024417",
          birthDate: new Date("1988-06-21T12:00:00.000Z"),
          gender: "male",
          city: "La Paz",
          department: "La Paz",
          address: "Av. Buenos Aires 1240, zona Gran Poder",
          captureSource: "referral",
          captureSources: ["referral", "tiktok"],
          firstVisitAt: at(18, 9, 10),
          generalObservations: "Trabaja de noche; prefiere citas por la tarde.",
          allergies: "Penicilina",
          relevantHistory: "Gastritis crónica diagnosticada en 2023. Lumbalgia recurrente.",
          currentMedication: "Omeprazol 20 mg en ayunas",
          followUpPreference: "whatsapp",
          createdAt: at(18, 9, 5)
        }
      });

      await tx.patientNote.create({
        data: {
          patientId: patient.id,
          userId,
          note: "Referido por su hermana Marisol (paciente SI-000002). Llega puntual.",
          createdAt: at(18, 9, 20)
        }
      });

      // ── Visita 1 (hace 18 dias): primera visita, flujo completo ──────────
      const v1 = await seedVisit(tx, {
        patientId: patient.id,
        userId,
        status: "completed",
        reason: "Dolor de espalda baja desde hace 3 semanas",
        intakeType: "first_visit",
        symptomDurationValue: 3,
        symptomDurationUnit: "weeks",
        previouslyTreated: false,
        bringsStudies: false,
        checkedInAt: at(18, 9, 10),
        completedAt: at(18, 10, 40),
        checkInNote: "Primera visita, viene referido por su hermana",
        steps: [
          {
            area: "recepcion",
            status: "in_reception",
            note: "Paciente en recepción",
            startedAt: at(18, 9, 10),
            endedAt: at(18, 9, 35)
          },
          {
            area: "medico",
            status: "in_consultation",
            note: "Pasa a consulta con el Dr. Quispe",
            startedAt: at(18, 9, 35),
            endedAt: at(18, 10, 5)
          },
          {
            area: "enfermeria",
            status: "in_nursing",
            note: "Aplicación de inyectable indicado en consulta",
            startedAt: at(18, 10, 5),
            endedAt: at(18, 10, 25)
          },
          {
            area: "administracion",
            status: "in_administration",
            note: "Pasa a caja a cancelar consulta y medicamentos",
            startedAt: at(18, 10, 25),
            endedAt: at(18, 10, 40)
          },
          {
            area: "cierre",
            status: "completed",
            note: "Atención completa, sale con receta e indicaciones",
            startedAt: at(18, 10, 40),
            endedAt: at(18, 10, 40)
          }
        ]
      });

      const v1Consultation = await tx.clinicalConsultation.create({
        data: {
          visitId: v1.visit.id,
          patientId: patient.id,
          doctorId: userId,
          motive: "Dolor lumbar de 3 semanas de evolución, empeora al cargar peso en el trabajo.",
          findings:
            "Dolor a la palpación paravertebral L4-L5, contractura muscular bilateral. Lasegue negativo. Sin signos de alarma.",
          observations: "Trabaja cargando mercadería. No refiere tratamiento previo.",
          treatmentPlanText:
            "Analgesia con AINE por 5 días, inyectable de inicio, relajante muscular nocturno y pausas activas en el trabajo.",
          indications: "Volver a control en 7 días. Acudir antes si aparece dolor irradiado a la pierna.",
          createdAt: at(18, 9, 40)
        }
      });

      await tx.diagnosis.createMany({
        data: [
          {
            consultationId: v1Consultation.id,
            kind: "primary",
            name: "Lumbalgia mecánica aguda",
            findings: "Contractura paravertebral bilateral",
            createdAt: at(18, 9, 55)
          },
          {
            consultationId: v1Consultation.id,
            kind: "secondary",
            name: "Sobrepeso",
            observations: "IMC 27.8, se recomienda control de peso",
            createdAt: at(18, 9, 56)
          }
        ]
      });

      await tx.treatmentPlan.create({
        data: {
          consultationId: v1Consultation.id,
          internalName: "Plan lumbalgia aguda",
          medications: "Diclofenaco 50 mg VO, Ciclobenzaprina 5 mg VO",
          dosage: "Diclofenaco cada 12 h; ciclobenzaprina 1 tableta por la noche",
          duration: "5 días",
          observations: "Tomar con alimentos por antecedente de gastritis.",
          createdAt: at(18, 9, 58)
        }
      });

      const v1Prescription = await tx.prescription.create({
        data: {
          visitId: v1.visit.id,
          patientId: patient.id,
          doctorId: userId,
          notes: "Receta de inicio para lumbalgia. Evitar AINE en ayunas.",
          createdAt: at(18, 10, 0)
        }
      });

      await tx.prescriptionItem.createMany({
        data: [
          {
            prescriptionId: v1Prescription.id,
            medication: "Diclofenaco 50 mg",
            dose: "1 tableta",
            frequency: "Cada 12 horas",
            duration: "5 días",
            observations: "Con alimentos",
            createdAt: at(18, 10, 0)
          },
          {
            prescriptionId: v1Prescription.id,
            medication: "Ciclobenzaprina 5 mg",
            dose: "1 tableta",
            frequency: "Cada noche",
            duration: "5 días",
            createdAt: at(18, 10, 0)
          }
        ]
      });

      const v1NursingWorkItem = await tx.visitWorkItem.create({
        data: {
          visitId: v1.visit.id,
          createdById: userId,
          area: "enfermeria",
          status: "completed",
          title: "Aplicar Diclofenaco 75 mg IM",
          description: "Dosis única indicada en consulta. Verificar alergias antes de aplicar.",
          createdAt: at(18, 10, 2),
          completedAt: at(18, 10, 20)
        }
      });

      const v1NursingOrder = await tx.clinicalOrder.create({
        data: {
          visitId: v1.visit.id,
          patientId: patient.id,
          doctorId: userId,
          workItemId: v1NursingWorkItem.id,
          type: "nursing_application",
          targetArea: "enfermeria",
          status: "completed",
          title: "Diclofenaco 75 mg IM dosis única",
          details: "Aplicar en glúteo. Paciente alérgico a penicilina (sin relación, solo recordatorio).",
          createdAt: at(18, 10, 2)
        }
      });

      await tx.vitalSigns.create({
        data: {
          patientId: patient.id,
          visitId: v1.visit.id,
          recordedById: userId,
          temperatureCelsius: "36.6",
          systolicPressureMmHg: 128,
          diastolicPressureMmHg: 84,
          heartRateBpm: 76,
          respiratoryRateRpm: 16,
          oxygenSaturation: 97,
          weightKg: "82.50",
          heightCm: "172.00",
          recordedAt: at(18, 10, 8),
          createdAt: at(18, 10, 8)
        }
      });

      await tx.nursingApplication.create({
        data: {
          patientId: patient.id,
          visitId: v1.visit.id,
          clinicalOrderId: v1NursingOrder.id,
          workItemId: v1NursingWorkItem.id,
          responsibleId: userId,
          medication: "Diclofenaco 75 mg",
          quantity: "1 ampolla",
          route: "Intramuscular",
          appliedAt: at(18, 10, 15),
          notes: "Tolerancia adecuada, sin reacción local.",
          createdAt: at(18, 10, 15)
        }
      });

      await tx.nursingNote.create({
        data: {
          patientId: patient.id,
          visitId: v1.visit.id,
          userId,
          note: "Se aplica inyectable sin complicaciones. Se refuerza indicación de tomar AINE con alimentos.",
          createdAt: at(18, 10, 18)
        }
      });

      const v1AdminWorkItem = await tx.visitWorkItem.create({
        data: {
          visitId: v1.visit.id,
          createdById: userId,
          area: "administracion",
          status: "completed",
          title: "Cobrar consulta, inyectable y medicamentos",
          description: "Consulta Bs 150 + inyectable Bs 35 + medicamentos Bs 80.",
          createdAt: at(18, 10, 22),
          completedAt: at(18, 10, 35)
        }
      });

      const v1Sale = await tx.sale.create({
        data: {
          patientId: patient.id,
          visitId: v1.visit.id,
          workItemId: v1AdminWorkItem.id,
          createdById: userId,
          status: "paid",
          subtotalCents: 26500,
          totalCents: 26500,
          paidCents: 26500,
          balanceCents: 0,
          notes: "Primera visita, paga todo en efectivo.",
          createdAt: at(18, 10, 28)
        }
      });

      await tx.saleItem.createMany({
        data: [
          {
            saleId: v1Sale.id,
            type: "service",
            description: "Consulta médica general",
            quantity: 1,
            unitPriceCents: 15000,
            totalCents: 15000,
            createdAt: at(18, 10, 28)
          },
          {
            saleId: v1Sale.id,
            type: "serum",
            description: "Aplicación de inyectable (Diclofenaco 75 mg)",
            quantity: 1,
            unitPriceCents: 3500,
            totalCents: 3500,
            createdAt: at(18, 10, 28)
          },
          {
            saleId: v1Sale.id,
            type: "medication",
            description: "Diclofenaco 50 mg x10 + Ciclobenzaprina 5 mg x5",
            quantity: 1,
            unitPriceCents: 8000,
            totalCents: 8000,
            delivered: true,
            createdAt: at(18, 10, 28)
          }
        ]
      });

      const v1Payment = await tx.payment.create({
        data: {
          saleId: v1Sale.id,
          patientId: patient.id,
          visitId: v1.visit.id,
          methodId: cashMethod.id,
          receivedById: userId,
          amountCents: 26500,
          paidAt: at(18, 10, 32),
          createdAt: at(18, 10, 32)
        }
      });

      await tx.cashMovement.create({
        data: {
          saleId: v1Sale.id,
          paymentId: v1Payment.id,
          patientId: patient.id,
          visitId: v1.visit.id,
          userId,
          type: "income",
          amountCents: 26500,
          description: "Pago en efectivo: consulta + inyectable + medicamentos",
          occurredAt: at(18, 10, 32),
          createdAt: at(18, 10, 32)
        }
      });

      const v1FollowUp = await tx.followUpTask.create({
        data: {
          patientId: patient.id,
          visitId: v1.visit.id,
          assignedToId: userId,
          createdById: userId,
          status: "improved",
          title: "Control de dolor lumbar por WhatsApp",
          notes: "Preguntar si el dolor bajó con el tratamiento y si está tomando el AINE con alimentos.",
          dueAt: at(15, 10, 0),
          completedAt: at(15, 10, 45),
          createdAt: at(18, 10, 38)
        }
      });

      await tx.followUpAttempt.create({
        data: {
          taskId: v1FollowUp.id,
          userId,
          method: "whatsapp",
          result: "improved",
          notes: "Refiere mejoría del 70%. Sigue con la medicación, confirma control.",
          contactedAt: at(15, 10, 45),
          createdAt: at(15, 10, 45)
        }
      });

      await tx.followUpStatusHistory.create({
        data: {
          taskId: v1FollowUp.id,
          userId,
          fromStatus: "pending",
          toStatus: "improved",
          note: "Contactado por WhatsApp, refiere mejoría.",
          createdAt: at(15, 10, 45)
        }
      });

      // ── Visita 2 (hace 11 dias): control de tratamiento ──────────────────
      const v2 = await seedVisit(tx, {
        patientId: patient.id,
        userId,
        status: "completed",
        reason: "Control de tratamiento por lumbalgia",
        intakeType: "treatment_control",
        previouslyTreated: true,
        checkedInAt: at(11, 16, 20),
        completedAt: at(11, 17, 10),
        checkInNote: "Viene a control programado de la semana pasada",
        steps: [
          {
            area: "recepcion",
            status: "in_reception",
            note: "Paciente en recepción",
            startedAt: at(11, 16, 20),
            endedAt: at(11, 16, 40)
          },
          {
            area: "medico",
            status: "in_consultation",
            note: "Control con el mismo médico tratante",
            startedAt: at(11, 16, 40),
            endedAt: at(11, 17, 10)
          },
          {
            area: "cierre",
            status: "completed",
            note: "Alta del cuadro agudo, continúa pausas activas",
            startedAt: at(11, 17, 10),
            endedAt: at(11, 17, 10)
          }
        ]
      });

      await tx.clinicalConsultation.create({
        data: {
          visitId: v2.visit.id,
          patientId: patient.id,
          doctorId: userId,
          motive: "Control de lumbalgia a los 7 días de tratamiento.",
          findings: "Dolor residual leve al final del día. Sin contractura a la palpación.",
          observations: "Cumplió el esquema completo de 5 días.",
          treatmentPlanText: "Suspender AINE. Continuar ejercicios de estiramiento y pausas activas.",
          indications: "Volver solo si el dolor reaparece o se irradia a la pierna.",
          createdAt: at(11, 16, 45)
        }
      });

      await tx.clinicalEvolution.create({
        data: {
          visitId: v2.visit.id,
          patientId: patient.id,
          userId,
          note: "Evolución favorable: dolor disminuyó de 8/10 a 2/10. Se da alta del cuadro agudo.",
          createdAt: at(11, 17, 0)
        }
      });

      const v2AdminWorkItem = await tx.visitWorkItem.create({
        data: {
          visitId: v2.visit.id,
          createdById: userId,
          area: "administracion",
          status: "completed",
          title: "Cobrar consulta de control",
          createdAt: at(11, 17, 0),
          completedAt: at(11, 17, 8)
        }
      });

      const v2Sale = await tx.sale.create({
        data: {
          patientId: patient.id,
          visitId: v2.visit.id,
          workItemId: v2AdminWorkItem.id,
          createdById: userId,
          status: "paid",
          subtotalCents: 10000,
          totalCents: 10000,
          paidCents: 10000,
          balanceCents: 0,
          createdAt: at(11, 17, 2)
        }
      });

      await tx.saleItem.create({
        data: {
          saleId: v2Sale.id,
          type: "service",
          description: "Consulta de control",
          quantity: 1,
          unitPriceCents: 10000,
          totalCents: 10000,
          createdAt: at(11, 17, 2)
        }
      });

      const v2Payment = await tx.payment.create({
        data: {
          saleId: v2Sale.id,
          patientId: patient.id,
          visitId: v2.visit.id,
          methodId: qrMethod.id,
          receivedById: userId,
          amountCents: 10000,
          reference: "QR-58213",
          paidAt: at(11, 17, 5),
          createdAt: at(11, 17, 5)
        }
      });

      await tx.cashMovement.create({
        data: {
          saleId: v2Sale.id,
          paymentId: v2Payment.id,
          patientId: patient.id,
          visitId: v2.visit.id,
          userId,
          type: "income",
          amountCents: 10000,
          description: "Pago QR: consulta de control",
          occurredAt: at(11, 17, 5),
          createdAt: at(11, 17, 5)
        }
      });

      // ── Visita 3 (hace 6 dias): se retira sin atencion ────────────────────
      const v3 = await seedVisit(tx, {
        patientId: patient.id,
        userId,
        status: "left_without_care",
        reason: "Malestar estomacal y acidez desde hace 4 días",
        intakeType: "new_problem",
        symptomDurationValue: 4,
        symptomDurationUnit: "days",
        previouslyTreated: false,
        checkedInAt: at(6, 11, 5),
        checkInNote: "Llega sin cita, sala de espera llena",
        steps: [
          {
            area: "recepcion",
            status: "in_reception",
            note: "Paciente en recepción",
            startedAt: at(6, 11, 5),
            endedAt: at(6, 11, 50)
          },
          {
            area: "cierre",
            status: "left_without_care",
            note: "Se retiró por tiempo de espera; debía volver al trabajo",
            startedAt: at(6, 11, 50),
            endedAt: at(6, 11, 50)
          }
        ]
      });

      const v3FollowUp = await tx.followUpTask.create({
        data: {
          patientId: patient.id,
          visitId: v3.visit.id,
          assignedToId: userId,
          createdById: userId,
          status: "wants_return",
          title: "Reagendar: se retiró sin atención",
          notes: "Ofrecerle horario de la tarde, que es cuando puede venir.",
          dueAt: at(5, 15, 0),
          completedAt: at(5, 15, 20),
          createdAt: at(6, 11, 55)
        }
      });

      await tx.followUpAttempt.create({
        data: {
          taskId: v3FollowUp.id,
          userId,
          method: "call",
          result: "wants_return",
          notes: "Quiere volver esta semana por la tarde para ver lo del estómago.",
          contactedAt: at(5, 15, 20),
          createdAt: at(5, 15, 20)
        }
      });

      await tx.followUpStatusHistory.create({
        data: {
          taskId: v3FollowUp.id,
          userId,
          fromStatus: "pending",
          toStatus: "wants_return",
          note: "Confirmó que quiere volver en horario de tarde.",
          createdAt: at(5, 15, 20)
        }
      });

      // ── Visita 4 (hace 2 dias): revision de resultados con estudios ──────
      const v4 = await seedVisit(tx, {
        patientId: patient.id,
        userId,
        status: "completed",
        reason: "Revisión de resultados de laboratorio y ecografía abdominal",
        intakeType: "results_review",
        previouslyTreated: true,
        bringsStudies: true,
        checkedInAt: at(2, 15, 30),
        completedAt: at(2, 16, 45),
        checkInNote: "Trae hemograma de laboratorio externo; se le hace ecografía aquí",
        steps: [
          {
            area: "recepcion",
            status: "in_reception",
            note: "Paciente en recepción",
            startedAt: at(2, 15, 30),
            endedAt: at(2, 15, 45)
          },
          {
            area: "medico",
            status: "in_consultation",
            note: "Revisión de resultados y ecografía en consultorio",
            startedAt: at(2, 15, 45),
            endedAt: at(2, 16, 30)
          },
          {
            area: "administracion",
            status: "in_administration",
            note: "Pasa a caja; deja saldo pendiente de la ecografía",
            startedAt: at(2, 16, 30),
            endedAt: at(2, 16, 45)
          },
          {
            area: "cierre",
            status: "completed",
            note: "Sale con nuevo esquema para gastritis",
            startedAt: at(2, 16, 45),
            endedAt: at(2, 16, 45)
          }
        ]
      });

      const v4Consultation = await tx.clinicalConsultation.create({
        data: {
          visitId: v4.visit.id,
          patientId: patient.id,
          doctorId: userId,
          motive: "Revisión de hemograma y ecografía abdominal por dolor epigástrico.",
          findings: "Hemograma dentro de parámetros. Ecografía: sin litiasis, leve engrosamiento de pared gástrica.",
          observations: "Cuadro compatible con reagudización de gastritis crónica.",
          treatmentPlanText: "Duplicar omeprazol por 4 semanas, dieta blanda, evitar irritantes.",
          indications: "Control en 4 semanas con nueva evaluación. Alarma: melena o vómito con sangre.",
          createdAt: at(2, 15, 50)
        }
      });

      await tx.diagnosis.create({
        data: {
          consultationId: v4Consultation.id,
          kind: "primary",
          name: "Gastritis crónica reagudizada",
          findings: "Dolor epigástrico postprandial, sin signos de sangrado",
          createdAt: at(2, 16, 0)
        }
      });

      const v4StudyWorkItem = await tx.visitWorkItem.create({
        data: {
          visitId: v4.visit.id,
          createdById: userId,
          area: "medico",
          status: "completed",
          title: "Ecografía abdominal completa",
          description: "Evaluar vesícula y pared gástrica por dolor epigástrico.",
          createdAt: at(2, 15, 50),
          completedAt: at(2, 16, 25)
        }
      });

      const v4StudyOrder = await tx.clinicalOrder.create({
        data: {
          visitId: v4.visit.id,
          patientId: patient.id,
          doctorId: userId,
          workItemId: v4StudyWorkItem.id,
          type: "study",
          targetArea: "medico",
          status: "completed",
          title: "Ecografía abdominal completa",
          details: "Realizada en la misma visita.",
          createdAt: at(2, 15, 50)
        }
      });

      await tx.study.create({
        data: {
          patientId: patient.id,
          visitId: v4.visit.id,
          requestedById: userId,
          recordedById: userId,
          type: "laboratory",
          status: "reviewed",
          title: "Hemograma completo (laboratorio externo)",
          resultSummary: "Serie roja y blanca dentro de parámetros normales.",
          findings: "Hb 15.1 g/dL, leucocitos 6.800, plaquetas 240.000.",
          performedAt: at(3, 8, 0),
          reviewedAt: at(2, 15, 55),
          createdAt: at(2, 15, 40)
        }
      });

      await tx.study.create({
        data: {
          patientId: patient.id,
          visitId: v4.visit.id,
          clinicalOrderId: v4StudyOrder.id,
          workItemId: v4StudyWorkItem.id,
          requestedById: userId,
          recordedById: userId,
          type: "ultrasound",
          status: "reviewed",
          title: "Ecografía abdominal completa",
          resultSummary: "Sin litiasis vesicular. Leve engrosamiento de pared gástrica.",
          findings: "Hígado, páncreas y riñones sin alteraciones. Vesícula alitiásica.",
          performedAt: at(2, 16, 10),
          reviewedAt: at(2, 16, 25),
          createdAt: at(2, 16, 10)
        }
      });

      const v4AdminWorkItem = await tx.visitWorkItem.create({
        data: {
          visitId: v4.visit.id,
          createdById: userId,
          area: "administracion",
          status: "completed",
          title: "Cobrar consulta y ecografía (acepta pago parcial)",
          description: "Total Bs 350. Paga Bs 250 por QR, saldo Bs 100 para el control.",
          createdAt: at(2, 16, 28),
          completedAt: at(2, 16, 42)
        }
      });

      const v4Sale = await tx.sale.create({
        data: {
          patientId: patient.id,
          visitId: v4.visit.id,
          workItemId: v4AdminWorkItem.id,
          createdById: userId,
          status: "partial",
          subtotalCents: 35000,
          totalCents: 35000,
          paidCents: 25000,
          balanceCents: 10000,
          notes: "Saldo Bs 100 comprometido para el próximo control.",
          createdAt: at(2, 16, 32)
        }
      });

      await tx.saleItem.createMany({
        data: [
          {
            saleId: v4Sale.id,
            type: "service",
            description: "Consulta médica (revisión de resultados)",
            quantity: 1,
            unitPriceCents: 10000,
            totalCents: 10000,
            createdAt: at(2, 16, 32)
          },
          {
            saleId: v4Sale.id,
            type: "study",
            description: "Ecografía abdominal completa",
            quantity: 1,
            unitPriceCents: 25000,
            totalCents: 25000,
            createdAt: at(2, 16, 32)
          }
        ]
      });

      const v4Payment = await tx.payment.create({
        data: {
          saleId: v4Sale.id,
          patientId: patient.id,
          visitId: v4.visit.id,
          methodId: qrMethod.id,
          receivedById: userId,
          amountCents: 25000,
          reference: "QR-60441",
          notes: "Pago parcial acordado.",
          paidAt: at(2, 16, 38),
          createdAt: at(2, 16, 38)
        }
      });

      await tx.cashMovement.create({
        data: {
          saleId: v4Sale.id,
          paymentId: v4Payment.id,
          patientId: patient.id,
          visitId: v4.visit.id,
          userId,
          type: "income",
          amountCents: 25000,
          description: "Pago QR parcial: consulta + ecografía abdominal",
          occurredAt: at(2, 16, 38),
          createdAt: at(2, 16, 38)
        }
      });

      // ── Visita 5 (hoy): control activo, actualmente en enfermeria ────────
      const v5 = await seedVisit(tx, {
        patientId: patient.id,
        userId,
        status: "in_nursing",
        reason: "Dolor epigástrico persiste pese a tratamiento, viene por suero indicado",
        intakeType: "treatment_control",
        previouslyTreated: true,
        checkedInAt: at(0, 9, 15),
        checkInNote: "Control de gastritis; el médico indicó suero con protector gástrico",
        steps: [
          {
            area: "recepcion",
            status: "in_reception",
            note: "Paciente en recepción",
            startedAt: at(0, 9, 15),
            endedAt: at(0, 9, 40)
          },
          {
            area: "medico",
            status: "in_consultation",
            note: "Evaluación rápida antes del suero",
            startedAt: at(0, 9, 40),
            endedAt: at(0, 10, 10)
          },
          {
            area: "enfermeria",
            status: "in_nursing",
            note: "Pasa a enfermería para suero indicado",
            startedAt: at(0, 10, 10)
          }
        ]
      });

      await tx.clinicalConsultation.create({
        data: {
          visitId: v5.visit.id,
          patientId: patient.id,
          doctorId: userId,
          motive: "Dolor epigástrico persistente a pesar de dosis doble de omeprazol.",
          findings: "Dolor epigástrico moderado a la palpación, sin signos de abdomen agudo.",
          treatmentPlanText: "Hidratación EV con protector gástrico hoy. Solicitar endoscopía si no mejora en 7 días.",
          indications: "Control en 7 días con resultado de evolución.",
          createdAt: at(0, 9, 45)
        }
      });

      await tx.vitalSigns.create({
        data: {
          patientId: patient.id,
          visitId: v5.visit.id,
          recordedById: userId,
          temperatureCelsius: "36.8",
          systolicPressureMmHg: 122,
          diastolicPressureMmHg: 80,
          heartRateBpm: 82,
          respiratoryRateRpm: 17,
          oxygenSaturation: 96,
          weightKg: "81.90",
          notes: "Refiere dolor 5/10 en epigastrio.",
          recordedAt: at(0, 10, 15),
          createdAt: at(0, 10, 15)
        }
      });

      const v5SerumWorkItem = await tx.visitWorkItem.create({
        data: {
          visitId: v5.visit.id,
          createdById: userId,
          area: "enfermeria",
          status: "in_progress",
          title: "Suero fisiológico 500 ml + protector gástrico EV",
          description: "Pasar en 45 minutos. Vigilar tolerancia; alérgico a penicilina.",
          createdAt: at(0, 10, 12)
        }
      });

      await tx.clinicalOrder.create({
        data: {
          visitId: v5.visit.id,
          patientId: patient.id,
          doctorId: userId,
          workItemId: v5SerumWorkItem.id,
          type: "serum",
          targetArea: "enfermeria",
          status: "acknowledged",
          title: "Suero fisiológico 500 ml + protector gástrico",
          details: "Indicado por dolor epigástrico persistente. Control de signos al terminar.",
          createdAt: at(0, 10, 12)
        }
      });

      const v5AdminWorkItem = await tx.visitWorkItem.create({
        data: {
          visitId: v5.visit.id,
          createdById: userId,
          area: "administracion",
          status: "pending",
          title: "Cobrar consulta y suero al salir",
          description: "Consulta Bs 100 + suero Bs 120. Recordar saldo pendiente de Bs 100 de la ecografía.",
          createdAt: at(0, 10, 12)
        }
      });

      await tx.clinicalOrder.create({
        data: {
          visitId: v5.visit.id,
          patientId: patient.id,
          doctorId: userId,
          workItemId: v5AdminWorkItem.id,
          type: "administration",
          targetArea: "administracion",
          status: "pending",
          title: "Cobro de consulta y suero",
          details: "Total del día Bs 220. Tiene saldo previo de Bs 100 (ecografía).",
          createdAt: at(0, 10, 12)
        }
      });

      await tx.sale.create({
        data: {
          patientId: patient.id,
          visitId: v5.visit.id,
          workItemId: v5AdminWorkItem.id,
          createdById: userId,
          status: "pending",
          subtotalCents: 22000,
          totalCents: 22000,
          paidCents: 0,
          balanceCents: 22000,
          notes: "Cobrar al terminar el suero.",
          items: {
            create: [
              {
                type: "service",
                description: "Consulta de control",
                quantity: 1,
                unitPriceCents: 10000,
                totalCents: 10000,
                createdAt: at(0, 10, 12)
              },
              {
                type: "serum",
                description: "Suero fisiológico 500 ml + protector gástrico",
                quantity: 1,
                unitPriceCents: 12000,
                totalCents: 12000,
                createdAt: at(0, 10, 12)
              }
            ]
          },
          createdAt: at(0, 10, 12)
        }
      });

      await tx.followUpTask.create({
        data: {
          patientId: patient.id,
          visitId: v5.visit.id,
          assignedToId: userId,
          createdById: userId,
          status: "pending",
          title: "Confirmar evolución tras el suero y agendar control",
          notes: "Preguntar mañana cómo amaneció del dolor. Si no mejora, coordinar endoscopía.",
          dueAt: inDays(1, 10, 0),
          createdAt: at(0, 10, 20)
        }
      });

      await tx.patientNote.create({
        data: {
          patientId: patient.id,
          userId,
          note: "Tiene saldo pendiente de Bs 100 de la ecografía; recordar en el próximo cobro.",
          createdAt: at(2, 16, 44)
        }
      });

      console.log(`Paciente demo creado: ${patient.internalCode} — ${patient.fullName}`);
      console.log("Visitas: 5 (2 completas con pago, 1 retirada, 1 con pago parcial, 1 activa en enfermería hoy)");
    },
    { timeout: 60000 }
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
