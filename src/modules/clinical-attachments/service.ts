import { createHash, randomBytes } from "node:crypto";
import type {
  ClinicalAttachmentAccessPurpose,
  ClinicalAttachmentStorageDriver,
  InternalRole
} from "@/generated/prisma/client";
import { resolveClinicalAttachmentStorage } from "@/lib/deployment-environment";
import { prisma } from "@/modules/database";
import {
  createClinicalStorageKey,
  deleteClinicalFile,
  readClinicalFile,
  storeClinicalFile
} from "@/modules/clinical-attachments/storage";
import { validateClinicalFile } from "@/modules/clinical-attachments/validation";

const accessGrantLifetimeMs = 2 * 60 * 1000;

export type ClinicalAttachmentActor = {
  id: string;
  role: InternalRole;
  branchCode: string;
};

export class ClinicalAttachmentError extends Error {
  constructor(
    public readonly code:
      | "association_mismatch"
      | "idempotency_conflict"
      | "upload_in_progress"
      | "not_found"
      | "not_available"
      | "invalid_grant"
      | "integrity_failure",
    public readonly status: 400 | 403 | 404 | 409 | 410 | 500
  ) {
    super(code);
    this.name = "ClinicalAttachmentError";
  }
}

function storageDriver(): ClinicalAttachmentStorageDriver {
  return resolveClinicalAttachmentStorage().driver === "local"
    ? "local"
    : "vercel_blob";
}

function hashAccessToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function assertAssociations(input: {
  branchCode: string;
  patientId: string;
  visitId?: string;
  studyId?: string;
}) {
  const [patient, visit, study] = await Promise.all([
    prisma.patientBranchRecord.findUnique({
      where: { patientId_branchCode: { patientId: input.patientId, branchCode: input.branchCode } },
      select: { patientId: true }
    }),
    input.visitId
      ? prisma.visit.findUnique({
          where: { id_branchCode: { id: input.visitId, branchCode: input.branchCode } },
          select: { id: true, patientId: true }
        })
      : null,
    input.studyId
      ? prisma.study.findUnique({
          where: { id_branchCode: { id: input.studyId, branchCode: input.branchCode } },
          select: { id: true, patientId: true, visitId: true }
        })
      : null
  ]);

  if (
    !patient ||
    (input.visitId && visit?.patientId !== input.patientId) ||
    (input.studyId && study?.patientId !== input.patientId) ||
    (input.visitId && input.studyId && study?.visitId && study.visitId !== input.visitId)
  ) {
    throw new ClinicalAttachmentError("association_mismatch", 400);
  }
}

function safeAttachmentResult(attachment: {
  id: string;
  label: string;
  contentType: string;
  sizeBytes: number;
  status: string;
  createdAt: Date;
}) {
  return {
    id: attachment.id,
    label: attachment.label,
    contentType: attachment.contentType,
    sizeBytes: attachment.sizeBytes,
    status: attachment.status,
    createdAt: attachment.createdAt
  };
}

export async function createClinicalAttachment(input: {
  actor: ClinicalAttachmentActor;
  patientId: string;
  visitId?: string;
  studyId?: string;
  uploadRequestId: string;
  label?: string;
  file: File;
}) {
  await assertAssociations({ ...input, branchCode: input.actor.branchCode });
  const validated = await validateClinicalFile(input.file, input.label);
  const existing = await prisma.clinicalAttachment.findUnique({
    where: { branchCode_uploadRequestId: { branchCode: input.actor.branchCode, uploadRequestId: input.uploadRequestId } }
  });

  if (existing) {
    if (
      existing.uploadedById !== input.actor.id ||
      existing.patientId !== input.patientId ||
      existing.checksumSha256 !== validated.checksumSha256
    ) {
      throw new ClinicalAttachmentError("idempotency_conflict", 409);
    }

    if (existing.status === "available") {
      return { attachment: safeAttachmentResult(existing), reused: true };
    }

    if (existing.status === "pending") {
      throw new ClinicalAttachmentError("upload_in_progress", 409);
    }
  }

  const storageKey = createClinicalStorageKey(
    input.actor.branchCode,
    input.uploadRequestId,
    validated.extension
  );
  const pendingData = {
    patientId: input.patientId,
    branchCode: input.actor.branchCode,
    visitId: input.visitId,
    studyId: input.studyId,
    uploadedById: input.actor.id,
    label: validated.label,
    contentType: validated.contentType,
    fileExtension: validated.extension,
    sizeBytes: validated.sizeBytes,
    checksumSha256: validated.checksumSha256,
    storageDriver: storageDriver(),
    storageKey,
    status: "pending" as const,
    scanStatus: "basic_validation_only" as const,
    scanProvider: "format-signature-v1",
    scannedAt: new Date(),
    quarantineReason: null
  };

  const attachment = existing
    ? await prisma.clinicalAttachment.update({
        where: { id_branchCode: { id: existing.id, branchCode: input.actor.branchCode } },
        data: pendingData
      })
    : await prisma.clinicalAttachment.create({
        data: {
          uploadRequestId: input.uploadRequestId,
          ...pendingData
        }
      });

  let stored = false;

  try {
    const actualDriver = await storeClinicalFile({
      storageKey,
      bytes: validated.bytes,
      contentType: validated.contentType
    });
    stored = true;

    if (actualDriver !== attachment.storageDriver) {
      throw new Error("CLINICAL_FILE_STORAGE_DRIVER_MISMATCH");
    }

    const available = await prisma.clinicalAttachment.update({
      where: { id_branchCode: { id: attachment.id, branchCode: input.actor.branchCode } },
      data: { status: "available" }
    });

    return { attachment: safeAttachmentResult(available), reused: false };
  } catch (error) {
    if (stored) {
      await deleteClinicalFile(attachment).catch(() => undefined);
    }
    await prisma.clinicalAttachment
      .update({
        where: { id_branchCode: { id: attachment.id, branchCode: input.actor.branchCode } },
        data: { status: "failed" }
      })
      .catch(() => undefined);
    throw error;
  }
}

export async function getClinicalAttachmentsForPatient(patientId: string, branchCode: string) {
  return prisma.clinicalAttachment.findMany({
    where: {
      patientId,
      branchCode,
      status: "available"
    },
    select: {
      id: true,
      label: true,
      contentType: true,
      sizeBytes: true,
      scanStatus: true,
      createdAt: true,
      visitId: true,
      studyId: true,
      uploadedBy: {
        select: { name: true }
      },
      visit: {
        select: { checkedInAt: true }
      },
      study: {
        select: { title: true }
      }
    },
    orderBy: { createdAt: "desc" }
  });
}

export async function createClinicalAttachmentAccessGrant(input: {
  attachmentId: string;
  actor: ClinicalAttachmentActor;
  purpose: ClinicalAttachmentAccessPurpose;
  continuityAccessId?: string;
}) {
  let allowedBranchCodes = [input.actor.branchCode];
  let remotePatientId: string | undefined;
  let reason = `Acceso local: ${input.purpose}`;

  if (input.continuityAccessId && input.actor.role === "medico") {
    const access = await prisma.clinicalContinuityAccess.findFirst({
      where: {
        id: input.continuityAccessId,
        doctorId: input.actor.id,
        branchCode: input.actor.branchCode,
        expiresAt: { gt: new Date() },
        doctorMembership: { active: true, role: "medico" }
      },
      select: { patientId: true, consultedBranchCodes: true, reason: true }
    });
    const consent = access ? await prisma.patientConsent.findFirst({
      where: { patientId: access.patientId, purpose: "clinical_continuity" },
      orderBy: [{ decidedAt: "desc" }, { createdAt: "desc" }],
      select: { decision: true }
    }) : null;
    if (access && consent?.decision === "granted") {
      allowedBranchCodes = [input.actor.branchCode, ...access.consultedBranchCodes];
      remotePatientId = access.patientId;
      reason = access.reason;
    }
  } else if (input.continuityAccessId && input.actor.role === "enfermeria") {
    const access = await prisma.nursingContinuityAccess.findFirst({
      where: {
        id: input.continuityAccessId,
        nurseId: input.actor.id,
        branchCode: input.actor.branchCode,
        expiresAt: { gt: new Date() },
        nurseMembership: { active: true, role: "enfermeria" }
      },
      select: { patientId: true, consultedBranchCodes: true, reason: true }
    });
    const consent = access ? await prisma.patientConsent.findFirst({
      where: { patientId: access.patientId, purpose: "clinical_continuity" },
      orderBy: [{ decidedAt: "desc" }, { createdAt: "desc" }],
      select: { decision: true }
    }) : null;
    if (access && consent?.decision === "granted") {
      allowedBranchCodes = [input.actor.branchCode, ...access.consultedBranchCodes];
      remotePatientId = access.patientId;
      reason = access.reason;
    }
  }

  const attachment = await prisma.clinicalAttachment.findFirst({
    where: {
      id: input.attachmentId,
      branchCode: { in: allowedBranchCodes },
      ...(remotePatientId ? { patientId: remotePatientId } : {})
    },
    select: {
      id: true,
      patientId: true,
      branchCode: true,
      status: true,
      study: { select: { clinicalOrder: { select: { targetArea: true } } } }
    }
  });

  if (!attachment) throw new ClinicalAttachmentError("not_found", 404);
  if (
    attachment.branchCode !== input.actor.branchCode &&
    input.actor.role === "enfermeria" &&
    attachment.study?.clinicalOrder?.targetArea !== "enfermeria"
  ) {
    throw new ClinicalAttachmentError("not_found", 404);
  }
  if (attachment.status !== "available") {
    throw new ClinicalAttachmentError("not_available", 410);
  }

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + accessGrantLifetimeMs);

  await prisma.clinicalAttachmentAccessGrant.create({
    data: {
      attachmentId: attachment.id,
      patientId: attachment.patientId,
      branchCode: attachment.branchCode,
      requestingBranchCode: input.actor.branchCode,
      userId: input.actor.id,
      actorRole: input.actor.role,
      reason,
      tokenHash: hashAccessToken(token),
      purpose: input.purpose,
      expiresAt
    }
  });

  return { token, expiresAt };
}

export async function consumeClinicalAttachmentAccessGrant(input: {
  attachmentId: string;
  actor: ClinicalAttachmentActor;
  token: string;
  purpose: ClinicalAttachmentAccessPurpose;
}) {
  const tokenHash = hashAccessToken(input.token);
  const now = new Date();

  const attachment = await prisma.$transaction(async (tx) => {
    const grant = await tx.clinicalAttachmentAccessGrant.findUnique({
      where: { tokenHash },
      include: { attachment: true }
    });

    if (
      !grant ||
      grant.attachmentId !== input.attachmentId ||
      grant.userId !== input.actor.id ||
      grant.requestingBranchCode !== input.actor.branchCode ||
      grant.actorRole !== input.actor.role ||
      grant.branchCode !== grant.attachment.branchCode ||
      grant.patientId !== grant.attachment.patientId ||
      grant.purpose !== input.purpose ||
      grant.expiresAt <= now ||
      grant.consumedAt ||
      grant.attachment.status !== "available" ||
      !(await tx.internalUserBranch.findFirst({
        where: {
          userId: input.actor.id,
          branchCode: input.actor.branchCode,
          active: true,
          role: input.actor.role
        },
        select: { userId: true }
      }))
    ) {
      return null;
    }

    const consumed = await tx.clinicalAttachmentAccessGrant.updateMany({
      where: {
        id: grant.id,
        consumedAt: null,
        expiresAt: { gt: now }
      },
      data: { consumedAt: now }
    });

    return consumed.count === 1 ? grant.attachment : null;
  });

  if (!attachment) {
    throw new ClinicalAttachmentError("invalid_grant", 403);
  }

  const bytes = await readClinicalFile(attachment);
  const checksum = createHash("sha256").update(bytes).digest("hex");

  if (
    bytes.byteLength !== attachment.sizeBytes ||
    checksum !== attachment.checksumSha256
  ) {
    await prisma.clinicalAttachment.update({
      where: { id_branchCode: { id: attachment.id, branchCode: attachment.branchCode } },
      data: {
        status: "quarantined",
        quarantineReason: "integrity_mismatch"
      }
    });
    throw new ClinicalAttachmentError("integrity_failure", 500);
  }

  return { attachment, bytes };
}

export async function softDeleteClinicalAttachment(input: {
  attachmentId: string;
  actor: ClinicalAttachmentActor;
}) {
  const attachment = await prisma.clinicalAttachment.findUnique({
    where: { id_branchCode: { id: input.attachmentId, branchCode: input.actor.branchCode } }
  });

  if (!attachment) throw new ClinicalAttachmentError("not_found", 404);
  if (attachment.status === "deleted") return { alreadyDeleted: true };
  if (attachment.status !== "available") {
    throw new ClinicalAttachmentError("not_available", 410);
  }

  await prisma.clinicalAttachment.update({
    where: { id_branchCode: { id: attachment.id, branchCode: input.actor.branchCode } },
    data: {
      status: "quarantined",
      quarantineReason: "controlled_deletion"
    }
  });

  try {
    await deleteClinicalFile(attachment);
    await prisma.$transaction([
      prisma.clinicalAttachmentAccessGrant.deleteMany({
        where: { attachmentId: attachment.id, branchCode: input.actor.branchCode }
      }),
      prisma.clinicalAttachment.update({
        where: { id_branchCode: { id: attachment.id, branchCode: input.actor.branchCode } },
        data: {
          status: "deleted",
          deletedAt: new Date(),
          deletedById: input.actor.id
        }
      })
    ]);
    return { alreadyDeleted: false };
  } catch (error) {
    await prisma.clinicalAttachment
      .update({
        where: { id_branchCode: { id: attachment.id, branchCode: input.actor.branchCode } },
        data: {
          status: "available",
          quarantineReason: null
        }
      })
      .catch(() => undefined);
    throw error;
  }
}
