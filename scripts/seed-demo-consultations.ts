/**
 * Seed de pacientes ficticios EN CONSULTA con el médico, para pruebas locales.
 *
 * Crea 10 pacientes con datos falsos y una visita con estado `in_consultation`
 * (área médico), de modo que aparezcan en la bandeja de Consultas del doctor.
 *
 * SOLO corre en `local` (entorno de desarrollo). Nunca en staging/production/test.
 * Es idempotente: identifica a los pacientes por su teléfono demo (prefijo
 * +591 7000200x); si ya existe, reutiliza y solo garantiza la visita en consulta.
 *
 * Uso: pnpm seed:demo-consultas
 */
import { prisma } from "../src/modules/database";
import { resolveDeploymentEnvironment } from "../src/lib/deployment-environment";
import { createPatientRecord } from "../src/modules/database/queries/patients";
import { createVisitRecord, updateVisitRouteStatus } from "../src/modules/database/queries/visits";
import { normalizePatientPhone } from "../src/features/patient-duplicates/normalize";
import { reportScriptError } from "./safe-error";

type PatientGender = "male" | "female";

type DemoPatient = {
  fullName: string;
  phone: string;
  gender: PatientGender;
  birthDate: string; // ISO
  city: string;
  department: string;
  address: string;
  allergies?: string;
  relevantHistory?: string;
  reason: string;
};

const DEMO_PATIENTS: DemoPatient[] = [
  { fullName: "María Fernanda Quispe Mamani", phone: "+591 70002001", gender: "female", birthDate: "1990-03-12", city: "El Alto", department: "La Paz", address: "Villa Adela, calle 6 #123", allergies: "Penicilina", relevantHistory: "Gastritis crónica", reason: "Dolor abdominal de 3 días" },
  { fullName: "Juan Carlos Condori Apaza", phone: "+591 70002002", gender: "male", birthDate: "1985-07-25", city: "La Paz", department: "La Paz", address: "Sopocachi, av. 20 de Octubre #456", relevantHistory: "Hipertensión", reason: "Cefalea y presión alta" },
  { fullName: "Rosa Elena Flores Choque", phone: "+591 70002003", gender: "female", birthDate: "1978-11-02", city: "El Alto", department: "La Paz", address: "Ciudad Satélite, plan 40 #78", allergies: "Ninguna conocida", reason: "Control de diabetes" },
  { fullName: "Pedro Antonio Mamani Huanca", phone: "+591 70002004", gender: "male", birthDate: "1995-01-18", city: "Viacha", department: "La Paz", address: "Av. Bolivia #900", reason: "Tos persistente y fiebre" },
  { fullName: "Ana Lucía Torrez Vargas", phone: "+591 70002005", gender: "female", birthDate: "2000-06-30", city: "La Paz", department: "La Paz", address: "Miraflores, calle Díaz Romero #12", relevantHistory: "Migraña", reason: "Dolor de cabeza recurrente" },
  { fullName: "Luis Alberto Choquehuanca Cruz", phone: "+591 70002006", gender: "male", birthDate: "1969-09-14", city: "El Alto", department: "La Paz", address: "Río Seco, av. Juan Pablo II #340", allergies: "Sulfas", relevantHistory: "Artritis", reason: "Dolor articular en rodillas" },
  { fullName: "Carmen Gloria Aruquipa Ticona", phone: "+591 70002007", gender: "female", birthDate: "1988-04-08", city: "La Paz", department: "La Paz", address: "Villa Fátima, calle 15 #56", reason: "Malestar general y náuseas" },
  { fullName: "José Miguel Callisaya Poma", phone: "+591 70002008", gender: "male", birthDate: "1992-12-21", city: "El Alto", department: "La Paz", address: "Senkata, av. 6 de Marzo #210", relevantHistory: "Asma", reason: "Dificultad para respirar" },
  { fullName: "Silvia Beatriz Nina Colque", phone: "+591 70002009", gender: "female", birthDate: "1975-02-17", city: "Achocalla", department: "La Paz", address: "Comunidad Marquirivi s/n", allergies: "Aspirina", reason: "Dolor lumbar" },
  { fullName: "Roberto Iván Gutiérrez Limachi", phone: "+591 70002010", gender: "male", birthDate: "1983-08-05", city: "La Paz", department: "La Paz", address: "Cotahuma, calle Boquerón #89", relevantHistory: "Colesterol alto", reason: "Chequeo general" }
];

async function main() {
  const environment = resolveDeploymentEnvironment();
  if (environment !== "local") {
    throw new Error(
      `seed:demo-consultas solo corre en local (entorno detectado: ${environment}).`
    );
  }

  const branch =
    (await prisma.clinicBranch.findFirst({
      where: { status: "active" },
      select: { code: true },
      orderBy: { code: "asc" }
    })) ?? (await prisma.clinicBranch.findFirst({ select: { code: true } }));
  if (!branch) throw new Error("No hay ninguna sucursal registrada.");

  // El médico es el actor de la visita (para que quede realista). Si no hay
  // médico, usamos cualquier usuario interno activo.
  const doctor =
    (await prisma.internalUser.findFirst({
      where: { active: true, role: "medico" },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true }
    })) ??
    (await prisma.internalUser.findFirst({
      where: { active: true },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true }
    }));
  if (!doctor) throw new Error("No hay ningún usuario interno para registrar las visitas.");

  console.log(
    `Sembrando 10 pacientes en consulta en "${environment}" (sucursal ${branch.code}, médico ${doctor.name ?? doctor.id})…`
  );

  let created = 0;
  let reused = 0;

  for (const spec of DEMO_PATIENTS) {
    const normalizedPhone = normalizePatientPhone(spec.phone);
    let patient = await prisma.patient.findFirst({
      where: { normalizedPhone },
      select: { id: true, internalCode: true }
    });

    if (patient) {
      reused += 1;
    } else {
      patient = await createPatientRecord({
        fullName: spec.fullName,
        phone: spec.phone,
        gender: spec.gender,
        birthDate: new Date(spec.birthDate),
        city: spec.city,
        department: spec.department,
        address: spec.address,
        captureSource: "other",
        allergies: spec.allergies,
        relevantHistory: spec.relevantHistory,
        createdById: doctor.id
      });
      created += 1;
    }

    // ¿Ya tiene una visita en consulta? Si no, la creamos y la derivamos.
    const activeConsultation = await prisma.visit.findFirst({
      where: { patientId: patient.id, status: "in_consultation" },
      select: { id: true }
    });
    if (activeConsultation) continue;

    const visit = await createVisitRecord({
      patientId: patient.id,
      userId: doctor.id,
      branchCode: branch.code,
      reason: spec.reason,
      note: "Paciente ficticio de demostración"
    });
    await updateVisitRouteStatus({
      visitId: visit.id,
      userId: doctor.id,
      status: "in_consultation",
      area: "medico",
      note: "Derivado a consulta médica (demo)"
    });
  }

  console.log(
    `Listo. Pacientes: ${created} creados, ${reused} ya existían. Todos con visita en consulta.`
  );
}

main()
  .catch((error) => {
    reportScriptError("Demo consultations seed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
