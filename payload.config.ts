import path from "path";
import { fileURLToPath } from "url";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { buildConfig } from "payload";
import { collections } from "./src/payload/collections/index.ts";
import { globals } from "./src/payload/globals/index.ts";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export default buildConfig({
  admin: {
    user: "users",
    importMap: {
      baseDir: path.resolve(dirname)
    }
  },
  collections,
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || ""
    },
    schemaName: process.env.PAYLOAD_DB_SCHEMA || "payload"
  }),
  globals,
  secret: process.env.PAYLOAD_SECRET || "development-payload-secret",
  typescript: {
    outputFile: path.resolve(dirname, "src/types/payload-types.ts")
  }
});
