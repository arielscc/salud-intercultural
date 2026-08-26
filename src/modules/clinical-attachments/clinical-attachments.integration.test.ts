import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/modules/database";
import {
  ClinicalAttachmentError,
  consumeClinicalAttachmentAccessGrant,
  createClinicalAttachment,
  createClinicalAttachmentAccessGrant,
  getClinicalAttachmentsForPatient,
  softDeleteClinicalAttachment
} from "@/modules/clinical-attachments/service";

const integrationStorageRoot = ".data/clinical-files-integration";

async function cleanClinicalAttachments() {
  await prisma.clinicalAttachmentAccessGrant.deleteMany();
  await prisma.clinicalAttachment.deleteMany();
  await prisma.study.deleteMany();
  await prisma.visit.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.internalSession.deleteMany();
  await prisma.internalUser.deleteMany();
  await rm(resolve(process.cwd(), integrationStorageRoot), {
    recursive: true,
    force: true
  });
}

beforeEach(async () => {
  process.env.APP_ENV = "test";
  process.env.NEXT_PUBLIC_APP_ENV = "test";
  process.env.CLINICAL_FILES_STORAGE_DRIVER = "local";
  process.env.CLINICAL_FILES_LOCAL_PATH = integrationStorageRoot;
  await cleanClinicalAttachments();
});

afterEach(cleanClinicalAttachments);

describe("secure clinical attachments integration", () => {
  it("uploads idempotently, grants one read and deletes content", async () => {
    const user = await prisma.internalUser.create({
      data: {
        email: `adjuntos-${randomUUID()}@example.com`,
        passwordHash: "integration-only",
        role: "medico"
      }
    });
    const patient = await prisma.patient.create({
      data: {
        internalCode: `ATT-${randomUUID()}`,
        fullName: "Paciente Adjuntos",
        phone: "70000006"
      }
    });
    const visit = await prisma.visit.create({
      data: {
        patientId: patient.id,
        createdById: user.id
      }
    });
    const study = await prisma.study.create({
      data: {
        patientId: patient.id,
        visitId: visit.id,
        recordedById: user.id,
        title: "Laboratorio",
        status: "performed"
      }
    });
    const uploadRequestId = randomUUID();
    const file = new File(
      ["%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF"],
      "laboratorio.pdf",
      { type: "application/pdf" }
    );
    const actor = { id: user.id, role: user.role };

    const first = await createClinicalAttachment({
      actor,
      patientId: patient.id,
      visitId: visit.id,
      studyId: study.id,
      uploadRequestId,
      label: "Resultado de laboratorio",
      file
    });
    const retry = await createClinicalAttachment({
      actor,
      patientId: patient.id,
      visitId: visit.id,
      studyId: study.id,
      uploadRequestId,
      label: "Resultado de laboratorio",
      file
    });

    expect(first.reused).toBe(false);
    expect(retry).toMatchObject({
      reused: true,
      attachment: { id: first.attachment.id }
    });

    const list = await getClinicalAttachmentsForPatient(patient.id);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({
      label: "Resultado de laboratorio",
      visitId: visit.id,
      studyId: study.id,
      scanStatus: "basic_validation_only"
    });

    const expiredGrant = await createClinicalAttachmentAccessGrant({
      attachmentId: first.attachment.id,
      actor,
      purpose: "preview"
    });
    await prisma.clinicalAttachmentAccessGrant.updateMany({
      where: {
        attachmentId: first.attachment.id,
        userId: user.id,
        consumedAt: null
      },
      data: { expiresAt: new Date(Date.now() - 1_000) }
    });
    await expect(
      consumeClinicalAttachmentAccessGrant({
        attachmentId: first.attachment.id,
        actor,
        purpose: "preview",
        token: expiredGrant.token
      })
    ).rejects.toMatchObject({ code: "invalid_grant" });

    const grant = await createClinicalAttachmentAccessGrant({
      attachmentId: first.attachment.id,
      actor,
      purpose: "preview"
    });
    const content = await consumeClinicalAttachmentAccessGrant({
      attachmentId: first.attachment.id,
      actor,
      purpose: "preview",
      token: grant.token
    });

    expect(new TextDecoder().decode(content.bytes)).toContain("%PDF-1.7");
    await expect(
      consumeClinicalAttachmentAccessGrant({
        attachmentId: first.attachment.id,
        actor,
        purpose: "preview",
        token: grant.token
      })
    ).rejects.toMatchObject({ code: "invalid_grant" });

    await expect(
      softDeleteClinicalAttachment({
        attachmentId: first.attachment.id,
        actor
      })
    ).resolves.toEqual({ alreadyDeleted: false });
    await expect(
      prisma.clinicalAttachment.findUnique({
        where: { id: first.attachment.id }
      })
    ).resolves.toMatchObject({
      status: "deleted",
      deletedById: user.id
    });
    await expect(
      createClinicalAttachmentAccessGrant({
        attachmentId: first.attachment.id,
        actor,
        purpose: "download"
      })
    ).rejects.toMatchObject({ code: "not_available" });
  });

  it("rejects a visit that belongs to another patient", async () => {
    const user = await prisma.internalUser.create({
      data: {
        email: `adjuntos-${randomUUID()}@example.com`,
        passwordHash: "integration-only",
        role: "medico"
      }
    });
    const [patient, otherPatient] = await Promise.all([
      prisma.patient.create({
        data: {
          internalCode: `ATT-${randomUUID()}`,
          fullName: "Paciente Uno",
          phone: "70000007"
        }
      }),
      prisma.patient.create({
        data: {
          internalCode: `ATT-${randomUUID()}`,
          fullName: "Paciente Dos",
          phone: "70000008"
        }
      })
    ]);
    const otherVisit = await prisma.visit.create({
      data: { patientId: otherPatient.id }
    });

    await expect(
      createClinicalAttachment({
        actor: { id: user.id, role: user.role },
        patientId: patient.id,
        visitId: otherVisit.id,
        uploadRequestId: randomUUID(),
        label: "Documento",
        file: new File(["%PDF-1.7\n%%EOF"], "documento.pdf", {
          type: "application/pdf"
        })
      })
    ).rejects.toBeInstanceOf(ClinicalAttachmentError);
  });
});
