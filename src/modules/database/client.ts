import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { assertEnvironmentIsolation } from "@/lib/deployment-environment";

const globalForPrisma = globalThis as typeof globalThis & {
  __saludInterculturalPrisma?: PrismaClient;
};

/*
 * Cuánto se espera una conexión antes de darla por perdida.
 *
 * El valor por defecto de `pg` es cero, que significa **esperar para siempre**.
 * Con eso, el 2026-08-28 el ingreso quedó en «Ingresando…» treinta segundos sin
 * timeout, sin mensaje y sin volver a habilitar el botón: la base estaba
 * apagada y nadie iba a avisarlo nunca. En producción, un hipo de la base
 * dejaría al personal frente a un botón muerto sin saber si el cobro entró.
 *
 * Diez segundos distinguen «la base tarda» de «la base no está». También cubren
 * la espera por un lugar libre en el pool, así que un valor más corto haría
 * fallar picos de carga legítimos.
 */
const connectionTimeoutMillis = 10_000;

/*
 * Las transacciones interactivas traen 5 s por defecto. El 2026-08-28,
 * `updateInventoryItemSuppliersRecord` tardó 6256 ms contra un contenedor
 * recién creado y `pnpm seed:demo` murió con «expired transaction»; la segunda
 * corrida pasaba. Esa transacción también corre desde la aplicación, así que
 * una función fría contra una base fría puede pagar lo mismo.
 *
 * Quince segundos absorben el arranque sin volver eterna una transacción
 * trabada, que retiene sus locks mientras viva.
 *
 * Honestidad sobre la evidencia: con el volumen ya caliente el seed pasa igual
 * con el límite viejo de 5 s, así que este margen **no está comprobado como la
 * causa** del arreglo. Reproducir el fallo original exige un volumen nuevo
 * (`docker compose down -v`). Queda como resguardo razonable, no como fix
 * verificado.
 */
const transactionOptions = { maxWait: 5_000, timeout: 15_000 };

function createPrismaClient() {
  assertEnvironmentIsolation();
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is required to initialize Prisma.");
  }

  const adapter = new PrismaPg({ connectionString, connectionTimeoutMillis });

  return new PrismaClient({
    adapter,
    errorFormat: "minimal",
    transactionOptions,
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"]
  });
}

function getPrismaClient() {
  globalForPrisma.__saludInterculturalPrisma ??= createPrismaClient();
  return globalForPrisma.__saludInterculturalPrisma;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getPrismaClient();
    const value = Reflect.get(client, property);

    return typeof value === "function" ? value.bind(client) : value;
  }
});

export type DatabaseClient = PrismaClient;
