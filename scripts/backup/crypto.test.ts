import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  assertStrongBackupEncryptionKey,
  decryptBackupFile,
  encryptBackupFile,
  readBackupMagic,
  sigecoBackupMagic
} from "./crypto";

const createdDirectories: string[] = [];
const strongKey =
  "7Q!sA2-vn8kL4yW9pR3xT6mC1zF5hJ0uB7dE2gN8qK4";

async function temporaryDirectory() {
  const directory = await mkdtemp(join(tmpdir(), "sigeco-backup-crypto-"));
  createdDirectories.push(directory);
  return directory;
}

afterEach(async () => {
  const { rm } = await import("node:fs/promises");
  await Promise.all(
    createdDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true })
    )
  );
});

describe("SIGECO authenticated backup encryption", () => {
  it("encrypts and decrypts a backup without exposing plaintext", async () => {
    const directory = await temporaryDirectory();
    const sourcePath = join(directory, "source.tar");
    const encryptedPath = join(directory, "backup.sigeco-backup");
    const restoredPath = join(directory, "restored.tar");
    const plaintext = Buffer.from(
      "patient fixture and clinical attachment bytes",
      "utf8"
    );
    await writeFile(sourcePath, plaintext);

    await encryptBackupFile({
      sourcePath,
      targetPath: encryptedPath,
      encryptionKey: strongKey
    });

    expect(await readBackupMagic(encryptedPath)).toBe(sigecoBackupMagic);
    expect((await readFile(encryptedPath)).includes(plaintext)).toBe(false);

    await decryptBackupFile({
      sourcePath: encryptedPath,
      targetPath: restoredPath,
      encryptionKey: strongKey
    });
    expect(await readFile(restoredPath)).toEqual(plaintext);
  });

  it("rejects a modified encrypted backup", async () => {
    const directory = await temporaryDirectory();
    const sourcePath = join(directory, "source.tar");
    const encryptedPath = join(directory, "backup.sigeco-backup");
    const restoredPath = join(directory, "restored.tar");
    await writeFile(sourcePath, "authenticated backup");
    await encryptBackupFile({
      sourcePath,
      targetPath: encryptedPath,
      encryptionKey: strongKey
    });
    const encrypted = await readFile(encryptedPath);
    encrypted[Math.floor(encrypted.length / 2)] ^= 0xff;
    await writeFile(encryptedPath, encrypted);

    await expect(
      decryptBackupFile({
        sourcePath: encryptedPath,
        targetPath: restoredPath,
        encryptionKey: strongKey
      })
    ).rejects.toThrow(/wrong or the file was modified/i);
  });

  it.each([
    undefined,
    "too-short",
    "development-backup-key-that-is-long-but-predictable"
  ])("rejects a weak backup encryption key", (value) => {
    expect(() => assertStrongBackupEncryptionKey(value)).toThrow();
  });
});
