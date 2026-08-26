import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createCashReceiptStorageKey,
  deleteCashReceipt,
  readCashReceipt,
  storeCashReceipt
} from "@/modules/cash-receipts/storage";

const unitStorageRoot = ".data/cash-receipts-unit";
const originalEnvironment = {
  APP_ENV: process.env.APP_ENV,
  NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
  CLINICAL_FILES_STORAGE_DRIVER:
    process.env.CLINICAL_FILES_STORAGE_DRIVER,
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

describe("private cash receipt storage", () => {
  it("writes, reads and removes a receipt outside public", async () => {
    const storageKey = createCashReceiptStorageKey(randomUUID(), "jpg");
    const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);

    const storageDriver = await storeCashReceipt({
      storageKey,
      bytes,
      contentType: "image/jpeg"
    });
    expect(storageDriver).toBe("local");
    await expect(
      readCashReceipt({ storageKey, storageDriver })
    ).resolves.toEqual(bytes);

    await deleteCashReceipt({ storageKey, storageDriver });
    await expect(
      readCashReceipt({ storageKey, storageDriver })
    ).rejects.toThrow();
  });

  it("rejects a path that could escape private storage", async () => {
    await expect(
      readCashReceipt({
        storageKey: "../../public/comprobante.jpg",
        storageDriver: "local"
      })
    ).rejects.toThrow("CASH_RECEIPT_INVALID_STORAGE_KEY");
  });
});
