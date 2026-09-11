import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations"
  },
  datasource: {
    // Prisma CLI es una herramienta de migración/mantenimiento. La aplicación
    // web continúa usando exclusivamente DATABASE_URL desde client.ts.
    url: process.env.MAINTENANCE_DATABASE_URL?.trim() || env("DATABASE_URL")
  }
});
