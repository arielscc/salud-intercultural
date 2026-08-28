import { readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

/*
 * `RecordList` lleva `sm:hidden`: existe solo debajo de 640 px. Su par de
 * escritorio es `RecordTable`, con `hidden sm:block`. Una pantalla que use la
 * primera sin la segunda no muestra nada desde 640 px: ni los registros ni el
 * mensaje de vacío, y sin ningún error que lo delate.
 *
 * Pasó de verdad. El patrón lo definió la Tarea 1 del plan móvil, cerrado el
 * 2026-07-15; `administracion/ventas/nueva` y `administracion/clientes/[id]`
 * se escribieron el 2026-08-24 con una sola mitad. El QA del 2026-08-28
 * encontró que desde una computadora no se podía iniciar una venta, porque el
 * buscador de cliente no listaba a nadie.
 *
 * Esta prueba existe para que la próxima pantalla que nazca a medias falle acá
 * y no en producción.
 */

const appDirectory = resolve(process.cwd(), "src/app/(internal)");

/** `<RecordList>` y `<RecordList className=...>`, nunca `<RecordListEmpty>`. */
const usesRecordList = /<RecordList[\s>]/;
const usesRecordTable = /<RecordTable[\s>]/;

function collectPages(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collectPages(path);
    return entry.isFile() && path.endsWith(".tsx") ? [path] : [];
  });
}

describe("pares de lista móvil y tabla de escritorio", () => {
  it("ninguna pantalla usa RecordList sin RecordTable", () => {
    const incomplete = collectPages(appDirectory)
      .filter((path) => {
        const source = readFileSync(path, "utf8");
        return usesRecordList.test(source) && !usesRecordTable.test(source);
      })
      .map((path) => relative(process.cwd(), path));

    expect(
      incomplete,
      `Estas pantallas no muestran nada desde 640 px porque les falta su RecordTable:\n  ${incomplete.join("\n  ")}`
    ).toEqual([]);
  });

  it("encuentra las pantallas que sí tienen el par, para que la prueba no pase por vacía", () => {
    const paired = collectPages(appDirectory).filter((path) => {
      const source = readFileSync(path, "utf8");
      return usesRecordList.test(source) && usesRecordTable.test(source);
    });

    expect(paired.length).toBeGreaterThanOrEqual(20);
  });
});
