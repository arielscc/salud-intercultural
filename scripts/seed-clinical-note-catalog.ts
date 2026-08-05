/**
 * Semilla mínima del catálogo de hallazgos y observaciones frecuentes.
 * La lista es pequeña a propósito: el catálogo crece con el uso real (cada línea
 * escrita/elegida al guardar una consulta suma a `usageCount`).
 *
 * Es idempotente: upsert por (field, texto normalizado). No pisa el `usageCount`.
 *
 * Local: pnpm seed:clinical-notes
 */
import { prisma } from "../src/modules/database";
import { reportScriptError } from "./safe-error";

const FINDINGS = [
  "Faringe eritematosa",
  "Amígdalas hipertróficas",
  "Murmullo vesicular conservado",
  "Ruidos cardíacos rítmicos, sin soplos",
  "Abdomen blando, depresible, no doloroso",
  "Dolor a la palpación en epigastrio",
  "Adenopatías cervicales",
  "Mucosas hidratadas",
  "Sin signos de dificultad respiratoria",
  "Piel y faneras sin alteraciones"
];

const OBSERVATIONS = [
  "Paciente refiere alergia a penicilina",
  "Acude acompañado por familiar",
  "Se explicó el tratamiento y los signos de alarma",
  "Paciente colabora con el examen",
  "Refiere no tener antecedentes patológicos",
  "Se indica control por consultorio externo",
  "Paciente tolera la vía oral",
  "Se resolvieron dudas del paciente"
];

function normalize(text: string): string {
  return text.trim().replace(/\s+/g, " ").toLowerCase();
}

async function seedField(field: "finding" | "observation", texts: string[]) {
  let created = 0;
  let skipped = 0;
  for (const text of texts) {
    const normalized = normalize(text);
    const existing = await prisma.clinicalNoteCatalogItem.findUnique({
      where: { field_normalized: { field, normalized } },
      select: { id: true }
    });
    if (existing) {
      skipped += 1;
      continue;
    }
    await prisma.clinicalNoteCatalogItem.create({
      data: { field, text, normalized, usageCount: 0 }
    });
    created += 1;
  }
  return { created, skipped };
}

async function main() {
  console.log("Sembrando catálogo mínimo de hallazgos y observaciones…");
  const findings = await seedField("finding", FINDINGS);
  const observations = await seedField("observation", OBSERVATIONS);
  console.log(`Hallazgos: ${findings.created} creados, ${findings.skipped} ya existían.`);
  console.log(
    `Observaciones: ${observations.created} creadas, ${observations.skipped} ya existían.`
  );
}

main()
  .catch((error) => {
    reportScriptError("Clinical note catalog seed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
