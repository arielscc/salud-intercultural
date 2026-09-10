import { createHash } from "node:crypto";
import { Pool, type PoolClient } from "pg";
import {
  createClinicalStorageKey,
  deleteClinicalFile,
  readClinicalFile,
  storeClinicalFile
} from "../src/modules/clinical-attachments/storage";
import { reportScriptError } from "./safe-error";

const confirmationToken = "APPLY_CLINICAL_ATTACHMENT_STORAGE_RECONCILIATION";

type AttachmentRow = {
  id: string;
  branchCode: string;
  contentType: string;
  fileExtension: string;
  sizeBytes: number;
  checksumSha256: string;
  storageDriver: "local" | "vercel_blob";
  storageKey: string;
};

type SupportedExtension = "pdf" | "jpg" | "png" | "webp";

function parseOptions(args: string[]) {
  if (args.includes("--help")) {
    console.log(`Uso:
  pnpm attachments:reconcile-keys
  pnpm attachments:reconcile-keys -- --apply --confirm=${confirmationToken}

Ejecutar después de la migración 20260910130000 y antes de 20260910140000.
Sin --apply solo informa IDs técnicos, sucursal y cantidad de claves pendientes.`);
    process.exit(0);
  }
  const confirmation = args
    .find((argument) => argument.startsWith("--confirm="))
    ?.slice("--confirm=".length);
  return { apply: args.includes("--apply"), confirmation };
}

function supportedExtension(value: string): SupportedExtension {
  if (value === "pdf" || value === "jpg" || value === "png" || value === "webp") {
    return value;
  }
  throw new Error("CLINICAL_ATTACHMENT_UNSUPPORTED_EXTENSION");
}

function checksum(bytes: Uint8Array) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function assertExpansionMigrationApplied(client: PoolClient) {
  const result = await client.query<{ ready: boolean }>(`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = 'ClinicalAttachment'
        AND column_name = 'branchCode'
    ) AS "ready"
  `);
  if (result.rows[0]?.ready !== true) {
    throw new Error("CLINICAL_ATTACHMENT_BRANCH_EXPANSION_REQUIRED");
  }
}

async function loadPendingRows(client: PoolClient) {
  const result = await client.query<AttachmentRow>(`
    SELECT
      "id", "branchCode", "contentType", "fileExtension", "sizeBytes",
      "checksumSha256", "storageDriver"::text AS "storageDriver", "storageKey"
    FROM "ClinicalAttachment"
    WHERE "branchCode" IS NOT NULL
      AND "storageKey" NOT LIKE ('clinical/%/' || "branchCode" || '/%')
    ORDER BY "branchCode", "id"
  `);
  return result.rows;
}

async function ensureDestinationFile(row: AttachmentRow, storageKey: string, bytes: Uint8Array) {
  try {
    await storeClinicalFile({ storageKey, bytes, contentType: row.contentType });
  } catch (error) {
    const existing = await readClinicalFile({
      storageDriver: row.storageDriver,
      storageKey
    }).catch(() => null);
    if (
      !existing ||
      existing.byteLength !== row.sizeBytes ||
      checksum(existing) !== row.checksumSha256
    ) {
      throw error;
    }
  }
}

async function reconcileRow(client: PoolClient, row: AttachmentRow) {
  const extension = supportedExtension(row.fileExtension);
  const destinationKey = createClinicalStorageKey(row.branchCode, row.id, extension);
  const bytes = await readClinicalFile(row);
  if (bytes.byteLength !== row.sizeBytes || checksum(bytes) !== row.checksumSha256) {
    throw new Error("CLINICAL_ATTACHMENT_LEGACY_FILE_INTEGRITY_MISMATCH");
  }

  await ensureDestinationFile(row, destinationKey, bytes);
  const updated = await client.query(
    `UPDATE "ClinicalAttachment"
     SET "storageKey" = $3, "updatedAt" = CURRENT_TIMESTAMP
     WHERE "id" = $1 AND "branchCode" = $2 AND "storageKey" = $4`,
    [row.id, row.branchCode, destinationKey, row.storageKey]
  );
  if (updated.rowCount !== 1) {
    throw new Error("CLINICAL_ATTACHMENT_RECONCILIATION_CONFLICT");
  }
  await deleteClinicalFile(row);
  return destinationKey;
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  if (options.apply && options.confirmation !== confirmationToken) {
    throw new Error("CLINICAL_ATTACHMENT_RECONCILIATION_CONFIRMATION_REQUIRED");
  }
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL_REQUIRED");

  const pool = new Pool({ connectionString: databaseUrl, max: 1 });
  const client = await pool.connect();
  try {
    await assertExpansionMigrationApplied(client);
    const pending = await loadPendingRows(client);
    const changes: Array<{ id: string; branchCode: string; storageKey: string }> = [];
    if (options.apply) {
      for (const row of pending) {
        changes.push({
          id: row.id,
          branchCode: row.branchCode,
          storageKey: await reconcileRow(client, row)
        });
      }
    }
    console.log(
      JSON.stringify(
        {
          mode: options.apply ? "apply" : "dry-run",
          pendingCount: pending.length,
          pending: pending.map(({ id, branchCode }) => ({ id, branchCode })),
          changes
        },
        null,
        2
      )
    );
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  reportScriptError("Clinical attachment storage key reconciliation", error);
  process.exitCode = 1;
});
