import { del as deleteBlob, get as getBlob, put } from "@vercel/blob";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import type { ClinicalAttachmentStorageDriver } from "@/generated/prisma/client";
import {
  resolveClinicalAttachmentStorage,
  resolveDeploymentEnvironment
} from "@/lib/deployment-environment";

const safeStorageKey =
  /^purchase-documents\/(?:local|test|staging|production)\/[a-f0-9-]{36}\.(?:pdf|jpg|png|webp)$/;

function assertSafeStorageKey(storageKey: string) {
  if (!safeStorageKey.test(storageKey)) {
    throw new Error("PURCHASE_DOCUMENT_INVALID_STORAGE_KEY");
  }
}

function localStorageRoot() {
  const configuration = resolveClinicalAttachmentStorage();
  if (configuration.driver !== "local") {
    throw new Error("PURCHASE_DOCUMENT_LOCAL_STORAGE_NOT_CONFIGURED");
  }
  const relativePath = configuration.rootPath.replace(/\/+$/, "");
  const segments = relativePath.split("/");
  if (
    segments[0] !== ".data" ||
    segments.length < 2 ||
    segments.some(
      (segment) =>
        !segment ||
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
  assertSafeStorageKey(storageKey);
  return `${localStorageRoot()}/${storageKey}`;
}

export function createPurchaseDocumentStorageKey(
  requestId: string,
  extension: "pdf" | "jpg" | "png" | "webp"
) {
  const storageKey = `purchase-documents/${resolveDeploymentEnvironment()}/${requestId}.${extension}`;
  assertSafeStorageKey(storageKey);
  return storageKey;
}

export async function storePurchaseDocument(input: {
  storageKey: string;
  bytes: Uint8Array;
  contentType: string;
}): Promise<ClinicalAttachmentStorageDriver> {
  assertSafeStorageKey(input.storageKey);
  const configuration = resolveClinicalAttachmentStorage();
  if (configuration.driver === "local") {
    const filePath = localFilePath(input.storageKey);
    await mkdir(filePath.slice(0, filePath.lastIndexOf("/")), {
      recursive: true,
      mode: 0o700
    });
    await writeFile(filePath, input.bytes, { flag: "wx", mode: 0o600 });
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

export async function readPurchaseDocument(input: {
  storageKey: string;
  storageDriver: ClinicalAttachmentStorageDriver;
}) {
  assertSafeStorageKey(input.storageKey);
  const configuration = resolveClinicalAttachmentStorage();
  if (input.storageDriver === "local") {
    if (configuration.driver !== "local") {
      throw new Error("PURCHASE_DOCUMENT_STORAGE_DRIVER_MISMATCH");
    }
    return new Uint8Array(await readFile(localFilePath(input.storageKey)));
  }
  if (configuration.driver !== "vercel-blob") {
    throw new Error("PURCHASE_DOCUMENT_STORAGE_DRIVER_MISMATCH");
  }
  const result = await getBlob(input.storageKey, {
    access: "private",
    useCache: false,
    token: configuration.token
  });
  if (!result || result.statusCode !== 200) {
    throw new Error("PURCHASE_DOCUMENT_NOT_FOUND");
  }
  return new Uint8Array(await new Response(result.stream).arrayBuffer());
}

export async function deletePurchaseDocument(input: {
  storageKey: string;
  storageDriver: ClinicalAttachmentStorageDriver;
}) {
  assertSafeStorageKey(input.storageKey);
  const configuration = resolveClinicalAttachmentStorage();
  if (input.storageDriver === "local") {
    if (configuration.driver !== "local") return;
    try {
      await unlink(localFilePath(input.storageKey));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    return;
  }
  if (configuration.driver === "vercel-blob") {
    await deleteBlob(input.storageKey, { token: configuration.token });
  }
}
