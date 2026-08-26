/**
 * Semilla mínima del catálogo de indicaciones frecuentes para la consulta.
 * La lista es pequeña a propósito: el catálogo crece con el uso real (cada
 * indicación escrita o elegida al guardar una consulta suma a `usageCount`).
 *
 * Es idempotente: se puede volver a ejecutar sin duplicar (upsert por texto
 * normalizado). No pisa el `usageCount` de las que ya crecieron con el uso.
 *
 * Local: pnpm seed:indications
 */
import { prisma } from "../src/modules/database";
import { reportScriptError } from "./safe-error";

const INDICATIONS = [
  "Tomar 2 litros de agua al día",
  "Reposo relativo por 3 días",
  "Dieta blanda y fraccionada",
  "Evitar alimentos irritantes (café, alcohol, condimentos)",
  "Control en 7 días o antes si presenta signos de alarma",
  "Acudir a emergencias si hay fiebre alta persistente",
  "No automedicarse",
  "Mantener la herida limpia y seca",
  "Aplicar compresas frías en la zona por 15 minutos",
  "Elevar el miembro afectado",
  "Completar el tratamiento antibiótico indicado",
  "Tomar los medicamentos con alimentos"
];

function normalize(text: string): string {
  return text.trim().replace(/\s+/g, " ").toLowerCase();
}

async function main() {
  console.log("Sembrando catálogo mínimo de indicaciones…");
  let created = 0;
  let skipped = 0;
  for (const text of INDICATIONS) {
    const normalized = normalize(text);
    const existing = await prisma.indicationCatalogItem.findUnique({
      where: { normalized },
      select: { id: true }
    });
    if (existing) {
      skipped += 1;
      continue;
    }
    await prisma.indicationCatalogItem.create({
      data: { text, normalized, usageCount: 0 }
    });
    created += 1;
  }
  console.log(`Indicaciones: ${created} creadas, ${skipped} ya existían.`);
}

main()
  .catch((error) => {
    reportScriptError("Indication catalog seed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
