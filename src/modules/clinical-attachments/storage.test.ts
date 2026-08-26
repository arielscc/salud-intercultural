import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createClinicalStorageKey,
  deleteClinicalFile,
  readClinicalFile,
  storeClinicalFile
} from "@/modules/clinical-attachments/storage";

const unitStorageRoot = ".data/clinical-files-unit";
const originalEnvironment = {
  APP_ENV: process.env.APP_ENV,
  NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
  CLINICAL_FILES_STORAGE_DRIVER: process.env.CLINICAL_FILES_STORAGE_DRIVER,
  CLINICAL_FILES_LOCAL_PATH: process.env.CLINICAL_FILES_LOCAL_PATH
};

beforeEach(async () => {
  process.env.APP_ENV = "local";
  process.env.NEXT_PUBLIC_APP_ENV = "local";
  process.env.CLINICAL_FILES_STORAGE_DRIVER = "local";
  process.env.CLINICAL_FILES_LOCAL_PATH = unitStorageRoot;
  await rm(resolve(process.cwd(), unitStorageRoot), {
    recursive: true,
    force: true
  });
});

afterEach(async () => {
  for (const [key, value] of Object.entries(originalEnvironment)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  await rm(resolve(process.cwd(), unitStorageRoot), {
    recursive: true,
    force: true
  });
});

describe("private clinical file storage", () => {
  it("writes, reads and removes a local file outside public", async () => {
    const storageKey = createClinicalStorageKey(randomUUID(), "pdf");
    const bytes = new TextEncoder().encode("%PDF-1.7\n%%EOF");

    await expect(
      storeClinicalFile({
        storageKey,
        bytes,
        contentType: "application/pdf"
      })
    ).resolves.toBe("local");

    const storedBytes = await readClinicalFile({
      storageDriver: "local",
      storageKey
    });
    expect(Array.from(storedBytes)).toEqual(Array.from(bytes));

    await deleteClinicalFile({ storageDriver: "local", storageKey });
    await expect(
      readClinicalFile({ storageDriver: "local", storageKey })
    ).rejects.toThrow();
  });

  it("rejects storage keys that could escape the private directory", async () => {
    await expect(
      readClinicalFile({
        storageDriver: "local",
        storageKey: "../../public/paciente.pdf"
      })
    ).rejects.toThrow("CLINICAL_FILE_INVALID_STORAGE_KEY");
  });

  it.each(["public/clinical-files", "../clinical-files", ".data/../public"])(
    "rejects an unsafe local storage root: %s",
    async (unsafeRoot) => {
      process.env.CLINICAL_FILES_LOCAL_PATH = unsafeRoot;
      const storageKey = createClinicalStorageKey(randomUUID(), "pdf");

      await expect(
        readClinicalFile({ storageDriver: "local", storageKey })
      ).rejects.toThrow(
        "CLINICAL_FILES_LOCAL_PATH must use a private subdirectory inside .data/."
      );
    }
  );
});
