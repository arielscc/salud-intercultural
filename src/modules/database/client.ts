import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "@/generated/prisma/client";
import { assertEnvironmentIsolation } from "@/lib/deployment-environment";
import {
  getDatabaseRlsStore,
  runWithTransactionRlsStore,
  type DatabaseRlsContext
} from "@/modules/database/rls-context";

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

const prismaDelegateNames = new Set(
  Object.values(Prisma.ModelName).map(
    (modelName) => modelName.charAt(0).toLowerCase() + modelName.slice(1)
  )
);

async function configureRlsTransaction(
  transaction: Prisma.TransactionClient,
  context: DatabaseRlsContext
) {
  await transaction.$queryRaw`
    SELECT
      set_config('app.branch_code', ${context.branchCode}, true),
      set_config('app.user_id', ${context.userId}, true),
      set_config('app.effective_role', ${context.effectiveRole}, true),
      set_config('app.access_mode', ${context.accessMode}, true),
      set_config('app.continuity_access_id', ${context.continuityAccessId ?? ""}, true),
      set_config('app.platform_audit_write', ${context.platformAuditWrite ? "true" : "false"}, true)
  `;
}

function invokeInRlsTransaction(
  client: PrismaClient,
  context: DatabaseRlsContext,
  operation: (transaction: Prisma.TransactionClient) => Promise<unknown>
) {
  return client.$transaction(async (transaction) => {
    await configureRlsTransaction(transaction, context);
    return runWithTransactionRlsStore(transaction, () => operation(transaction));
  });
}

function delegateProxy(client: PrismaClient, delegateName: string, delegate: object) {
  return new Proxy(delegate, {
    get(target, property) {
      const member = Reflect.get(target, property);
      if (typeof member !== "function") return member;
      return (...args: unknown[]) => {
        const store = getDatabaseRlsStore();
        if (store?.transaction) {
          const transactionDelegate = Reflect.get(store.transaction, delegateName) as object;
          return Reflect.apply(Reflect.get(transactionDelegate, property), transactionDelegate, args);
        }
        if (!store) return Reflect.apply(member, target, args);
        return invokeInRlsTransaction(client, store.context, async (transaction) => {
          const transactionDelegate = Reflect.get(transaction, delegateName) as object;
          return Reflect.apply(Reflect.get(transactionDelegate, property), transactionDelegate, args);
        });
      };
    }
  });
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getPrismaClient();
    const value = Reflect.get(client, property);

    if (typeof property === "string" && prismaDelegateNames.has(property)) {
      return delegateProxy(client, property, value as object);
    }
    if (property === "$transaction" && typeof value === "function") {
      return (operation: unknown, options?: unknown) => {
        if (typeof operation !== "function") {
          throw new Error("Las transacciones RLS deben usar callback interactivo.");
        }
        const store = getDatabaseRlsStore();
        if (store?.transaction) {
          return Reflect.apply(operation, undefined, [store.transaction]);
        }
        if (!store) return Reflect.apply(value, client, [operation, options]);
        return Reflect.apply(value, client, [
          async (transaction: Prisma.TransactionClient) => {
            await configureRlsTransaction(transaction, store.context);
            return runWithTransactionRlsStore(transaction, () =>
              Reflect.apply(operation, undefined, [transaction])
            );
          },
          options
        ]);
      };
    }
    if (
      (property === "$queryRaw" || property === "$executeRaw") &&
      typeof value === "function"
    ) {
      return (...args: unknown[]) => {
        const store = getDatabaseRlsStore();
        if (store?.transaction) {
          const transactionMethod = Reflect.get(store.transaction, property);
          return Reflect.apply(transactionMethod, store.transaction, args);
        }
        if (!store) return Reflect.apply(value, client, args);
        return invokeInRlsTransaction(client, store.context, async (transaction) =>
          Reflect.apply(Reflect.get(transaction, property), transaction, args)
        );
      };
    }
    return typeof value === "function" ? value.bind(client) : value;
  }
});

export type DatabaseClient = PrismaClient;
