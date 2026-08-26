import { describe, expect, it } from "vitest";
import {
  ClinicalFileValidationError,
  maximumClinicalFileBytes,
  validateClinicalFile
} from "@/modules/clinical-attachments/validation";

function pdfFile(
  contents = "%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF",
  options: { name?: string; type?: string } = {}
) {
  return new File([contents], options.name ?? "resultado.pdf", {
    type: options.type ?? "application/pdf"
  });
}

describe("clinical file validation", () => {
  it("accepts a complete PDF and calculates its checksum", async () => {
    const result = await validateClinicalFile(
      pdfFile(),
      "Resultado de laboratorio"
    );

    expect(result).toMatchObject({
      contentType: "application/pdf",
      extension: "pdf",
      label: "Resultado de laboratorio"
    });
    expect(result.checksumSha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it("detects a JPEG by signature instead of trusting the browser", async () => {
    const file = new File(
      [new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])],
      "fotografia.jpeg",
      { type: "image/jpeg" }
    );

    await expect(validateClinicalFile(file, "Fotografía clínica")).resolves.toMatchObject({
      contentType: "image/jpeg",
      extension: "jpg"
    });
  });

  it.each([
    [
      "spoofed MIME",
      pdfFile(undefined, { type: "image/png" }),
      "type_mismatch"
    ],
    [
      "wrong extension",
      pdfFile(undefined, { name: "resultado.jpg" }),
      "invalid_name"
    ],
    [
      "truncated PDF",
      pdfFile("%PDF-1.7\nincompleto"),
      "invalid_content"
    ],
    [
      "antimalware test marker",
      pdfFile("%PDF-1.7\nEICAR-STANDARD-ANTIVIRUS-TEST-FILE\n%%EOF"),
      "malware_test_signature"
    ]
  ])("rejects %s", async (_name, file, expectedCode) => {
    await expect(validateClinicalFile(file, "Documento")).rejects.toMatchObject({
      code: expectedCode
    });
  });

  it("rejects files larger than the server request limit", async () => {
    const file = new File(
      [new Uint8Array(maximumClinicalFileBytes + 1)],
      "grande.jpg",
      { type: "image/jpeg" }
    );

    await expect(validateClinicalFile(file, "Documento")).rejects.toBeInstanceOf(
      ClinicalFileValidationError
    );
  });
});
