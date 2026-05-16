import path from "path";
import { fileURLToPath } from "url";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { buildConfig } from "payload";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export default buildConfig({
  admin: {
    user: "users",
    importMap: {
      baseDir: path.resolve(dirname)
    }
  },
  collections: [
    {
      slug: "users",
      auth: true,
      admin: {
        useAsTitle: "email"
      },
      fields: []
    },
    {
      slug: "media",
      upload: true,
      fields: [
        {
          name: "alt",
          type: "text",
          required: true
        }
      ]
    }
  ],
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || ""
    }
  }),
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || "development-payload-secret",
  typescript: {
    outputFile: path.resolve(dirname, "src/types/payload-types.ts")
  }
});
