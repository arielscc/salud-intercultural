import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { assertEnvironmentIsolation } from "@/lib/deployment-environment";

const globalForPrisma = globalThis as typeof globalThis & {
  __saludInterculturalPrisma?: PrismaClient;
};

function createPrismaClient() {
  assertEnvironmentIsolation();
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is required to initialize Prisma.");
  }

  const adapter = new PrismaPg({ connectionString });

  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
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
