import { AsyncLocalStorage } from "node:async_hooks";
import type { InternalRole, Prisma } from "@/generated/prisma/client";

export type DatabaseEffectiveRole = InternalRole | "platform" | "system_job";

export type DatabaseRlsContext = {
  branchCode: string;
  userId: string;
  effectiveRole: DatabaseEffectiveRole;
  accessMode: "work" | "consult";
  continuityAccessId?: string;
  platformAuditWrite?: boolean;
};

type DatabaseRlsStore = {
  context: DatabaseRlsContext;
  transaction?: Prisma.TransactionClient;
};

const globalForRls = globalThis as typeof globalThis & {
  __saludInterculturalRlsStorage?: AsyncLocalStorage<DatabaseRlsStore>;
};

export const databaseRlsStorage =
  (globalForRls.__saludInterculturalRlsStorage ??=
    new AsyncLocalStorage<DatabaseRlsStore>());

export function getDatabaseRlsStore() {
  return databaseRlsStorage.getStore();
}

export function activateDatabaseRlsContext(context: DatabaseRlsContext) {
  databaseRlsStorage.enterWith({ context });
}

export function runWithDatabaseRlsContext<T>(
  context: DatabaseRlsContext,
  operation: () => Promise<T>
) {
  return databaseRlsStorage.run({ context }, operation);
}

export function runWithContinuityDatabaseContext<T>(
  continuityAccessId: string,
  operation: () => Promise<T>
) {
  const current = databaseRlsStorage.getStore();
  if (!current) throw new Error("DATABASE_BRANCH_CONTEXT_REQUIRED");
  return databaseRlsStorage.run(
    {
      ...current,
      context: { ...current.context, continuityAccessId }
    },
    operation
  );
}

export function activateContinuityDatabaseContext(continuityAccessId: string) {
  const current = databaseRlsStorage.getStore();
  if (!current) throw new Error("DATABASE_BRANCH_CONTEXT_REQUIRED");
  databaseRlsStorage.enterWith({
    ...current,
    context: { ...current.context, continuityAccessId }
  });
}

export function runWithPlatformAuditDatabaseContext<T>(
  userId: string,
  operation: () => Promise<T>
) {
  return runWithDatabaseRlsContext(
    {
      branchCode: "",
      userId,
      effectiveRole: "platform",
      accessMode: "work",
      platformAuditWrite: true
    },
    operation
  );
}

export function runWithTransactionRlsStore<T>(
  transaction: Prisma.TransactionClient,
  operation: () => Promise<T>
) {
  const current = databaseRlsStorage.getStore();
  if (!current) return operation();
  return databaseRlsStorage.run({ ...current, transaction }, operation);
}
