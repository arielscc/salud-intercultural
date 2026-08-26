/**
 * Semilla mínima del catálogo de diagnósticos frecuentes para la consulta.
 * La lista es pequeña a propósito: el catálogo crece con el uso real (cada
 * diagnóstico principal o secundario escrito/elegido al guardar una consulta
 * suma a `usageCount`).
 *
 * Es idempotente: se puede volver a ejecutar sin duplicar (upsert por texto
 * normalizado). No pisa el `usageCount` de los que ya crecieron con el uso.
 *
 * Local: pnpm seed:diagnoses
 */
import { prisma } from "../src/modules/database";
import { reportScriptError } from "./safe-error";

const DIAGNOSES = [
  "Infección respiratoria aguda",
  "Faringitis aguda",
  "Rinofaringitis aguda (resfrío común)",
  "Gastritis aguda",
  "Enfermedad diarreica aguda",
  "Infección de vías urinarias",
  "Cefalea tensional",
  "Lumbalgia",
  "Hipertensión arterial",
  "Diabetes mellitus tipo 2",
  "Dermatitis",
  "Anemia"
];

function normalize(text: string): string {
  return text.trim().replace(/\s+/g, " ").toLowerCase();
}

async function main() {
  console.log("Sembrando catálogo mínimo de diagnósticos…");
  let created = 0;
  let skipped = 0;
  for (const text of DIAGNOSES) {
    const normalized = normalize(text);
    const existing = await prisma.diagnosisCatalogItem.findUnique({
      where: { normalized },
      select: { id: true }
    });
    if (existing) {
      skipped += 1;
      continue;
    }
    await prisma.diagnosisCatalogItem.create({
      data: { text, normalized, usageCount: 0 }
    });
    created += 1;
  }
  console.log(`Diagnósticos: ${created} creados, ${skipped} ya existían.`);
}

main()
  .catch((error) => {
    reportScriptError("Diagnosis catalog seed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
