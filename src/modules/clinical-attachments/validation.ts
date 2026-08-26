import { createHash } from "node:crypto";
import { extname } from "node:path";

export const maximumClinicalFileBytes = 4_000_000;
export const maximumClinicalUploadRequestBytes =
  maximumClinicalFileBytes + 64_000;
export const maximumClinicalFilesPerSelection = 8;

export const acceptedClinicalFileTypes = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp"
] as const;

export type AcceptedClinicalFileType =
  (typeof acceptedClinicalFileTypes)[number];

type DetectedFile = {
  contentType: AcceptedClinicalFileType;
  extension: "pdf" | "jpg" | "png" | "webp";
};

export class ClinicalFileValidationError extends Error {
  constructor(
    public readonly code:
      | "empty"
      | "too_large"
      | "invalid_name"
      | "type_mismatch"
      | "unsupported_type"
      | "invalid_content"
      | "malware_test_signature",
    message: string
  ) {
    super(message);
    this.name = "ClinicalFileValidationError";
  }
}

function startsWith(bytes: Uint8Array, signature: number[]) {
  return signature.every((value, index) => bytes[index] === value);
}

function detectFile(bytes: Uint8Array): DetectedFile | null {
  if (
    bytes.length >= 5 &&
    startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])
  ) {
    return { contentType: "application/pdf", extension: "pdf" };
  }

  if (
    bytes.length >= 3 &&
    startsWith(bytes, [0xff, 0xd8, 0xff])
  ) {
    return { contentType: "image/jpeg", extension: "jpg" };
  }

  if (
    bytes.length >= 8 &&
    startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  ) {
    return { contentType: "image/png", extension: "png" };
  }

  if (
    bytes.length >= 12 &&
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    startsWith(bytes.slice(8), [0x57, 0x45, 0x42, 0x50])
  ) {
    return { contentType: "image/webp", extension: "webp" };
  }

  return null;
}

function assertSafeClientFileName(name: string, extension: DetectedFile["extension"]) {
  const trimmed = name.trim();
  const suppliedExtension = extname(trimmed).slice(1).toLowerCase();
  const acceptedExtensions =
    extension === "jpg" ? new Set(["jpg", "jpeg"]) : new Set([extension]);

  if (
    !trimmed ||
    trimmed.length > 180 ||
    /[\/\\\u0000-\u001f\u007f]/.test(trimmed) ||
    !acceptedExtensions.has(suppliedExtension)
  ) {
    throw new ClinicalFileValidationError(
      "invalid_name",
      "El nombre del archivo no es válido o su extensión no coincide."
    );
  }
}

function normalizeLabel(value: string | undefined) {
  const normalized = value?.trim().replace(/\s+/g, " ");

  if (
    !normalized ||
    normalized.length > 80 ||
    /[\u0000-\u001f\u007f]/.test(normalized)
  ) {
    throw new ClinicalFileValidationError(
      "invalid_name",
      "Escribe una descripción corta de hasta 80 caracteres."
    );
  }

  return normalized;
}

function assertCompletePdf(bytes: Uint8Array) {
  const tail = new TextDecoder("latin1").decode(bytes.slice(-1024));
  if (!tail.includes("%%EOF")) {
    throw new ClinicalFileValidationError(
      "invalid_content",
      "El PDF está incompleto o dañado."
    );
  }
}

function assertNoAntimalwareTestSignature(bytes: Uint8Array) {
  const text = new TextDecoder("latin1").decode(bytes);
  if (text.includes("EICAR-STANDARD-ANTIVIRUS-TEST-FILE")) {
    throw new ClinicalFileValidationError(
      "malware_test_signature",
      "El archivo fue rechazado por la validación de seguridad."
    );
  }
}

export async function validateClinicalFile(
  file: File,
  label: string | undefined
) {
  if (file.size === 0) {
    throw new ClinicalFileValidationError("empty", "El archivo está vacío.");
  }

  if (file.size > maximumClinicalFileBytes) {
    throw new ClinicalFileValidationError(
      "too_large",
      "El archivo supera el límite de 4 MB."
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const detected = detectFile(bytes);

  if (!detected) {
    throw new ClinicalFileValidationError(
      "unsupported_type",
      "Solo se permiten PDF, JPG, PNG y WebP."
    );
  }

  if (
    file.type &&
    file.type !== "application/octet-stream" &&
    file.type !== detected.contentType
  ) {
    throw new ClinicalFileValidationError(
      "type_mismatch",
      "El contenido del archivo no coincide con el tipo declarado."
    );
  }

  assertSafeClientFileName(file.name, detected.extension);
  if (detected.contentType === "application/pdf") assertCompletePdf(bytes);
  assertNoAntimalwareTestSignature(bytes);

  return {
    bytes,
    label: normalizeLabel(label),
    contentType: detected.contentType,
    extension: detected.extension,
    sizeBytes: bytes.byteLength,
    checksumSha256: createHash("sha256").update(bytes).digest("hex")
  };
}
