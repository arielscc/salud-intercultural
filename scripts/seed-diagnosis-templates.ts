/**
 * Semilla mínima de plantillas por diagnóstico (plan + indicaciones sugeridos).
 * Al elegir uno de estos diagnósticos en la consulta, el plan e indicaciones se
 * agregan (sin sobrescribir) y el médico puede editarlos.
 *
 * Es idempotente y NO destructivo: aplica la plantilla sobre el diagnóstico del
 * catálogo (lo crea si no existe) y sí actualiza plan/indicaciones a los valores de
 * esta semilla. No toca el `usageCount`. La lista es pequeña a propósito.
 *
 * Local: pnpm seed:diagnosis-templates
 */
import { prisma } from "../src/modules/database";
import { reportScriptError } from "./safe-error";

type TemplateSpec = {
  diagnosis: string;
  plan: string;
  indications: string[];
};

const TEMPLATES: TemplateSpec[] = [
  {
    diagnosis: "Infección respiratoria aguda",
    plan: "Reposo, hidratación abundante y tratamiento sintomático. Control de temperatura.",
    indications: [
      "Tomar 2 litros de agua al día",
      "Reposo relativo por 3 días",
      "Acudir a emergencias si hay fiebre alta persistente"
    ]
  },
  {
    diagnosis: "Gastritis aguda",
    plan: "Inhibidor de bomba de protones y medidas dietéticas.",
    indications: [
      "Dieta blanda y fraccionada",
      "Evitar alimentos irritantes (café, alcohol, condimentos)",
      "No automedicarse"
    ]
  },
  {
    diagnosis: "Enfermedad diarreica aguda",
    plan: "Hidratación oral y vigilancia de signos de deshidratación.",
    indications: [
      "Tomar sales de rehidratación oral tras cada evacuación",
      "Dieta blanda y fraccionada",
      "Acudir a emergencias si hay signos de deshidratación"
    ]
  },
  {
    diagnosis: "Infección de vías urinarias",
    plan: "Tratamiento antibiótico indicado e hidratación.",
    indications: [
      "Tomar 2 litros de agua al día",
      "Completar el tratamiento antibiótico indicado",
      "Control en 7 días o antes si presenta signos de alarma"
    ]
  }
];

function normalize(text: string): string {
  return text.trim().replace(/\s+/g, " ").toLowerCase();
}

async function main() {
  console.log("Sembrando plantillas mínimas por diagnóstico…");
  let applied = 0;
  for (const spec of TEMPLATES) {
    const normalized = normalize(spec.diagnosis);
    await prisma.diagnosisCatalogItem.upsert({
      where: { normalized },
      create: {
        text: spec.diagnosis,
        normalized,
        usageCount: 0,
        planTemplate: spec.plan,
        indicationsTemplate: spec.indications.join("\n")
      },
      update: {
        planTemplate: spec.plan,
        indicationsTemplate: spec.indications.join("\n")
      }
    });
    applied += 1;
  }
  console.log(`Plantillas aplicadas: ${applied}.`);
}

main()
  .catch((error) => {
    reportScriptError("Diagnosis templates seed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
