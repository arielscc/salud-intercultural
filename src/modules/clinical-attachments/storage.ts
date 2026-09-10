import { del as deleteBlob, get as getBlob, put } from "@vercel/blob";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import type { ClinicalAttachmentStorageDriver } from "@/generated/prisma/client";
import {
  resolveClinicalAttachmentStorage,
  resolveDeploymentEnvironment
} from "@/lib/deployment-environment";

type StoredAttachmentReference = {
  storageDriver: ClinicalAttachmentStorageDriver;
  storageKey: string;
};

const branchScopedStorageKey =
  /^clinical\/(?:local|test|staging|production)\/[a-z0-9-]{2,64}\/[a-zA-Z0-9-]{20,80}\.(?:pdf|jpg|png|webp)$/;
const legacyStorageKey =
  /^clinical\/(?:local|test|staging|production)\/[a-zA-Z0-9-]{20,80}\.(?:pdf|jpg|png|webp)$/;

function assertBranchScopedStorageKey(storageKey: string) {
  if (!branchScopedStorageKey.test(storageKey)) {
    throw new Error("CLINICAL_FILE_INVALID_STORAGE_KEY");
  }
}

function assertReadableStorageKey(storageKey: string) {
  if (
    !branchScopedStorageKey.test(storageKey) &&
    !legacyStorageKey.test(storageKey)
  ) {
    throw new Error("CLINICAL_FILE_INVALID_STORAGE_KEY");
  }
}

function localStorageRoot() {
  const configuration = resolveClinicalAttachmentStorage();
  if (configuration.driver !== "local") {
    throw new Error("CLINICAL_FILE_LOCAL_STORAGE_NOT_CONFIGURED");
  }

  const relativePath = configuration.rootPath.replace(/\/+$/, "");
  const segments = relativePath.split("/");

  if (
    segments[0] !== ".data" ||
    segments.length < 2 ||
    segments.some(
      (segment) =>
        segment === "" ||
        segment === "." ||
        segment === ".." ||
        !/^[a-zA-Z0-9._-]+$/.test(segment)
    )
  ) {
    throw new Error(
      "CLINICAL_FILES_LOCAL_PATH must use a private subdirectory inside .data/."
    );
  }

  return `${process.cwd()}/${relativePath}`;
}

function localFilePath(storageKey: string) {
  assertReadableStorageKey(storageKey);
  return `${localStorageRoot()}/${storageKey}`;
}

function blobConfiguration() {
  const configuration = resolveClinicalAttachmentStorage();
  if (configuration.driver !== "vercel-blob") {
    throw new Error("CLINICAL_FILE_BLOB_STORAGE_NOT_CONFIGURED");
  }
  return configuration;
}

export function createClinicalStorageKey(
  branchCode: string,
  uploadRequestId: string,
  extension: "pdf" | "jpg" | "png" | "webp"
) {
  const environment = resolveDeploymentEnvironment();
  if (!/^[a-z0-9-]{2,64}$/.test(branchCode)) {
    throw new Error("CLINICAL_FILE_INVALID_BRANCH");
  }
  const storageKey = `clinical/${environment}/${branchCode}/${uploadRequestId}.${extension}`;
  assertBranchScopedStorageKey(storageKey);
  return storageKey;
}

export async function storeClinicalFile(input: {
  storageKey: string;
  bytes: Uint8Array;
  contentType: string;
}): Promise<ClinicalAttachmentStorageDriver> {
  assertBranchScopedStorageKey(input.storageKey);
  const configuration = resolveClinicalAttachmentStorage();

  if (configuration.driver === "local") {
    const filePath = localFilePath(input.storageKey);
    const directory = filePath.slice(0, filePath.lastIndexOf("/"));
    await mkdir(/* turbopackIgnore: true */ directory, {
      recursive: true,
      mode: 0o700
    });
    await writeFile(/* turbopackIgnore: true */ filePath, input.bytes, {
      flag: "wx",
      mode: 0o600
    });
    return "local";
  }

  await put(input.storageKey, Buffer.from(input.bytes), {
    access: "private",
    allowOverwrite: false,
    addRandomSuffix: false,
    cacheControlMaxAge: 60,
    contentType: input.contentType,
    token: configuration.token
  });
  return "vercel_blob";
}

export async function readClinicalFile(
  reference: StoredAttachmentReference
): Promise<Uint8Array> {
  assertReadableStorageKey(reference.storageKey);
  const configuration = resolveClinicalAttachmentStorage();

  if (reference.storageDriver === "local") {
    if (configuration.driver !== "local") {
      throw new Error("CLINICAL_FILE_STORAGE_DRIVER_MISMATCH");
    }
    const filePath = localFilePath(reference.storageKey);
    return new Uint8Array(
      await readFile(/* turbopackIgnore: true */ filePath)
    );
  }

  if (configuration.driver !== "vercel-blob") {
    throw new Error("CLINICAL_FILE_STORAGE_DRIVER_MISMATCH");
  }

  const result = await getBlob(reference.storageKey, {
    access: "private",
    useCache: false,
    token: blobConfiguration().token
  });

  if (!result || result.statusCode !== 200) {
    throw new Error("CLINICAL_FILE_NOT_FOUND_IN_STORAGE");
  }

  return new Uint8Array(await new Response(result.stream).arrayBuffer());
}

export async function deleteClinicalFile(reference: StoredAttachmentReference) {
  assertReadableStorageKey(reference.storageKey);
  const configuration = resolveClinicalAttachmentStorage();

  if (reference.storageDriver === "local") {
    if (configuration.driver !== "local") {
      throw new Error("CLINICAL_FILE_STORAGE_DRIVER_MISMATCH");
    }

    try {
      const filePath = localFilePath(reference.storageKey);
      await unlink(/* turbopackIgnore: true */ filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    return;
  }

  if (configuration.driver !== "vercel-blob") {
    throw new Error("CLINICAL_FILE_STORAGE_DRIVER_MISMATCH");
  }

  await deleteBlob(reference.storageKey, { token: blobConfiguration().token });
}
