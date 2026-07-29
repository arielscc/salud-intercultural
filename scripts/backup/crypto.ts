import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  scryptSync
} from "node:crypto";
import {
  appendFile,
  chmod,
  open,
  readFile,
  stat,
  unlink
} from "node:fs/promises";
import { createReadStream, createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";

const backupMagic = Buffer.from("SIGECOBKP01", "ascii");
const saltBytes = 16;
const initializationVectorBytes = 12;
const authenticationTagBytes = 16;
const headerBytes =
  backupMagic.byteLength + saltBytes + initializationVectorBytes;

export function assertStrongBackupEncryptionKey(value: string | undefined) {
  const key = value?.trim();

  if (!key || key.length < 32) {
    throw new Error(
      "BACKUP_ENCRYPTION_KEY must contain at least 32 characters."
    );
  }

  if (
    /example|development|local|placeholder|change.?me|backup-key|password/i.test(
      key
    )
  ) {
    throw new Error(
      "BACKUP_ENCRYPTION_KEY must not use a predictable example or password."
    );
  }

  return key;
}

export async function sha256File(filePath: string) {
  const hash = createHash("sha256");
  await pipeline(createReadStream(filePath), hash);
  return hash.digest("hex");
}

async function appendFileContents(sourcePath: string, targetPath: string) {
  await pipeline(
    createReadStream(sourcePath),
    createWriteStream(targetPath, { flags: "a", mode: 0o600 })
  );
}

export async function encryptBackupFile(input: {
  sourcePath: string;
  targetPath: string;
  encryptionKey: string;
}) {
  const encryptionKey = assertStrongBackupEncryptionKey(input.encryptionKey);
  const salt = randomBytes(saltBytes);
  const initializationVector = randomBytes(initializationVectorBytes);
  const derivedKey = scryptSync(encryptionKey, salt, 32);
  const cipher = createCipheriv(
    "aes-256-gcm",
    derivedKey,
    initializationVector
  );
  const ciphertextPath = `${input.targetPath}.ciphertext`;

  try {
    await pipeline(
      createReadStream(input.sourcePath),
      cipher,
      createWriteStream(ciphertextPath, { flags: "wx", mode: 0o600 })
    );

    const target = await open(input.targetPath, "wx", 0o600);
    try {
      await target.write(
        Buffer.concat([backupMagic, salt, initializationVector])
      );
    } finally {
      await target.close();
    }

    await appendFileContents(ciphertextPath, input.targetPath);
    await appendFile(input.targetPath, cipher.getAuthTag());
    await chmod(input.targetPath, 0o600);
  } catch (error) {
    await unlink(input.targetPath).catch(() => undefined);
    throw error;
  } finally {
    await unlink(ciphertextPath).catch(() => undefined);
  }
}

export async function decryptBackupFile(input: {
  sourcePath: string;
  targetPath: string;
  encryptionKey: string;
}) {
  const encryptionKey = assertStrongBackupEncryptionKey(input.encryptionKey);
  const sourceStat = await stat(input.sourcePath);

  if (sourceStat.size <= headerBytes + authenticationTagBytes) {
    throw new Error("The backup file is incomplete.");
  }

  const source = await open(input.sourcePath, "r");
  let header: Buffer;
  let authenticationTag: Buffer;

  try {
    header = Buffer.alloc(headerBytes);
    authenticationTag = Buffer.alloc(authenticationTagBytes);
    await source.read(header, 0, headerBytes, 0);
    await source.read(
      authenticationTag,
      0,
      authenticationTagBytes,
      sourceStat.size - authenticationTagBytes
    );
  } finally {
    await source.close();
  }

  const magic = header.subarray(0, backupMagic.byteLength);
  if (!magic.equals(backupMagic)) {
    throw new Error("The file is not a supported SIGECO backup.");
  }

  const salt = header.subarray(
    backupMagic.byteLength,
    backupMagic.byteLength + saltBytes
  );
  const initializationVector = header.subarray(
    backupMagic.byteLength + saltBytes,
    headerBytes
  );
  const derivedKey = scryptSync(encryptionKey, salt, 32);
  const decipher = createDecipheriv(
    "aes-256-gcm",
    derivedKey,
    initializationVector
  );
  decipher.setAuthTag(authenticationTag);

  try {
    await pipeline(
      createReadStream(input.sourcePath, {
        start: headerBytes,
        end: sourceStat.size - authenticationTagBytes - 1
      }),
      decipher,
      createWriteStream(input.targetPath, { flags: "wx", mode: 0o600 })
    );
    await chmod(input.targetPath, 0o600);
  } catch {
    await unlink(input.targetPath).catch(() => undefined);
    throw new Error(
      "The backup could not be authenticated. The key is wrong or the file was modified."
    );
  }
}

export async function readBackupMagic(filePath: string) {
  const contents = await readFile(filePath);
  return contents.subarray(0, backupMagic.byteLength).toString("ascii");
}

export const sigecoBackupMagic = backupMagic.toString("ascii");
