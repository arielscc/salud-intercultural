-- Tarea 6: los modelos V3.3 nunca se habilitaron para carga real. Si alguna
-- instalación los usó por fuera de SIGECO, detener la migración evita perder
-- referencias públicas que requieren una cuarentena manual.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "ClinicalAttachment" LIMIT 1)
    OR EXISTS (SELECT 1 FROM "StudyAttachment" LIMIT 1) THEN
    RAISE EXCEPTION
      'Legacy attachment rows require manual quarantine before migration 20260729140000';
  END IF;
END
$$;

ALTER TYPE "InternalPermission" ADD VALUE IF NOT EXISTS 'attachments_read';
ALTER TYPE "InternalPermission" ADD VALUE IF NOT EXISTS 'attachments_write';
ALTER TYPE "InternalPermission" ADD VALUE IF NOT EXISTS 'attachments_delete';

CREATE TYPE "ClinicalAttachmentStorageDriver" AS ENUM ('local', 'vercel_blob');
CREATE TYPE "ClinicalAttachmentStatus" AS ENUM (
  'pending',
  'available',
  'quarantined',
  'failed',
  'deleted'
);
CREATE TYPE "ClinicalAttachmentScanStatus" AS ENUM (
  'basic_validation_only',
  'pending',
  'clean',
  'rejected'
);
CREATE TYPE "ClinicalAttachmentAccessPurpose" AS ENUM ('preview', 'download');

DROP TABLE "StudyAttachment";
DROP TABLE "ClinicalAttachment";

CREATE TABLE "ClinicalAttachment" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "visitId" TEXT,
  "studyId" TEXT,
  "uploadedById" TEXT,
  "deletedById" TEXT,
  "uploadRequestId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "contentType" TEXT NOT NULL,
  "fileExtension" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "checksumSha256" TEXT NOT NULL,
  "storageDriver" "ClinicalAttachmentStorageDriver" NOT NULL,
  "storageKey" TEXT NOT NULL,
  "status" "ClinicalAttachmentStatus" NOT NULL DEFAULT 'pending',
  "scanStatus" "ClinicalAttachmentScanStatus" NOT NULL DEFAULT 'basic_validation_only',
  "scanProvider" TEXT,
  "scannedAt" TIMESTAMP(3),
  "quarantineReason" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),

  CONSTRAINT "ClinicalAttachment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClinicalAttachmentAccessGrant" (
  "id" TEXT NOT NULL,
  "attachmentId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "purpose" "ClinicalAttachmentAccessPurpose" NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ClinicalAttachmentAccessGrant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClinicalAttachment_uploadRequestId_key"
  ON "ClinicalAttachment"("uploadRequestId");
CREATE UNIQUE INDEX "ClinicalAttachment_storageKey_key"
  ON "ClinicalAttachment"("storageKey");
CREATE INDEX "ClinicalAttachment_patientId_idx"
  ON "ClinicalAttachment"("patientId");
CREATE INDEX "ClinicalAttachment_visitId_idx"
  ON "ClinicalAttachment"("visitId");
CREATE INDEX "ClinicalAttachment_studyId_idx"
  ON "ClinicalAttachment"("studyId");
CREATE INDEX "ClinicalAttachment_uploadedById_idx"
  ON "ClinicalAttachment"("uploadedById");
CREATE INDEX "ClinicalAttachment_status_createdAt_idx"
  ON "ClinicalAttachment"("status", "createdAt");
CREATE INDEX "ClinicalAttachment_checksumSha256_idx"
  ON "ClinicalAttachment"("checksumSha256");
CREATE INDEX "ClinicalAttachment_createdAt_idx"
  ON "ClinicalAttachment"("createdAt");

CREATE UNIQUE INDEX "ClinicalAttachmentAccessGrant_tokenHash_key"
  ON "ClinicalAttachmentAccessGrant"("tokenHash");
CREATE INDEX "ClinicalAttachmentAccessGrant_attachmentId_expiresAt_idx"
  ON "ClinicalAttachmentAccessGrant"("attachmentId", "expiresAt");
CREATE INDEX "ClinicalAttachmentAccessGrant_userId_expiresAt_idx"
  ON "ClinicalAttachmentAccessGrant"("userId", "expiresAt");
CREATE INDEX "ClinicalAttachmentAccessGrant_expiresAt_idx"
  ON "ClinicalAttachmentAccessGrant"("expiresAt");

ALTER TABLE "ClinicalAttachment"
  ADD CONSTRAINT "ClinicalAttachment_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "Patient"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClinicalAttachment"
  ADD CONSTRAINT "ClinicalAttachment_visitId_fkey"
  FOREIGN KEY ("visitId") REFERENCES "Visit"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ClinicalAttachment"
  ADD CONSTRAINT "ClinicalAttachment_studyId_fkey"
  FOREIGN KEY ("studyId") REFERENCES "Study"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ClinicalAttachment"
  ADD CONSTRAINT "ClinicalAttachment_uploadedById_fkey"
  FOREIGN KEY ("uploadedById") REFERENCES "InternalUser"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ClinicalAttachment"
  ADD CONSTRAINT "ClinicalAttachment_deletedById_fkey"
  FOREIGN KEY ("deletedById") REFERENCES "InternalUser"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ClinicalAttachmentAccessGrant"
  ADD CONSTRAINT "ClinicalAttachmentAccessGrant_attachmentId_fkey"
  FOREIGN KEY ("attachmentId") REFERENCES "ClinicalAttachment"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClinicalAttachmentAccessGrant"
  ADD CONSTRAINT "ClinicalAttachmentAccessGrant_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "InternalUser"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
