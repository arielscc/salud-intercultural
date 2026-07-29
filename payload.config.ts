import path from "path";
import { fileURLToPath } from "url";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { buildConfig } from "payload";
import { vercelBlobStorage } from "@payloadcms/storage-vercel-blob";
import sharp from "sharp";
import { collections } from "./src/payload/collections/index.ts";
import { globals } from "./src/payload/globals/index.ts";
import {
  assertEnvironmentIsolation,
  resolveBlobReadWriteToken
} from "./src/lib/deployment-environment.ts";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);
const environment = assertEnvironmentIsolation();
const blobReadWriteToken = resolveBlobReadWriteToken();
const storagePrefix =
  environment.storageEnvironment === "staging"
    ? "staging"
    : environment.storageEnvironment === "production"
      ? "production"
      : undefined;

export default buildConfig({
  admin: {
    user: "users",
    components: {
      afterNavLinks: [
        {
          path: "@/payload/admin/AdminQuickLinks",
          exportName: "AdminQuickLinks"
        }
      ],
      beforeDashboard: [
        {
          path: "@/payload/admin/AdminDashboard",
          exportName: "AdminDashboard"
        }
      ],
      graphics: {
        Icon: {
          path: "@/payload/admin/BrandIcon",
          exportName: "BrandIcon"
        },
        Logo: {
          path: "@/payload/admin/BrandLogo",
          exportName: "BrandLogo"
        }
      }
    },
    importMap: {
      baseDir: path.resolve(dirname)
    },
    meta: {
      icons: [
        {
          rel: "icon",
          type: "image/svg+xml",
          url: "/admin-favicon.svg"
        }
      ],
      titleSuffix: "- Salud Intercultural"
    },
    theme: "light"
  },
  collections,
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || ""
    },
    schemaName: process.env.PAYLOAD_DB_SCHEMA || "payload"
  }),
  globals,
  plugins: [
    vercelBlobStorage({
      enabled: Boolean(blobReadWriteToken),
      collections: {
        media: storagePrefix ? { prefix: storagePrefix } : true
      },
      token: blobReadWriteToken
    })
  ],
  secret: process.env.PAYLOAD_SECRET || "development-payload-secret",
  sharp,
  typescript: {
    outputFile: path.resolve(dirname, "src/types/payload-types.ts")
  }
});
