/*
  Warnings:

  - A unique constraint covering the columns `[supersedesId]` on the table `Prescription` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[visitId,version]` on the table `Prescription` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "GeneratedDocumentKind" AS ENUM ('prescription', 'internal_sale_receipt');

-- AlterEnum
ALTER TYPE "InternalPermission" ADD VALUE IF NOT EXISTS 'documents_configure';

-- AlterTable
ALTER TABLE "Prescription" ADD COLUMN     "correctionReason" TEXT,
ADD COLUMN     "supersedesId" TEXT,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- Backfill the append-only clinical history before adding the unique key.
-- Existing prescriptions are ordered deterministically by creation and id.
WITH ranked AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "visitId"
      ORDER BY "createdAt" ASC, "id" ASC
    )::INTEGER AS "newVersion",
    LAG("id") OVER (
      PARTITION BY "visitId"
      ORDER BY "createdAt" ASC, "id" ASC
    ) AS "previousId"
  FROM "Prescription"
)
UPDATE "Prescription" AS prescription
SET
  "version" = ranked."newVersion",
  "supersedesId" = ranked."previousId"
FROM ranked
WHERE prescription."id" = ranked."id";

-- CreateTable
CREATE TABLE "ClinicalProfessionalProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "professionalTitle" TEXT NOT NULL,
    "specialty" TEXT NOT NULL,
    "ministryRegistration" TEXT NOT NULL,
    "medicalCollegeRegistration" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "configuredById" TEXT,
    "configuredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicalProfessionalProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedDocument" (
    "id" TEXT NOT NULL,
    "kind" "GeneratedDocumentKind" NOT NULL,
    "documentNumber" TEXT NOT NULL,
    "seriesKey" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "patientId" TEXT NOT NULL,
    "visitId" TEXT,
    "prescriptionId" TEXT,
    "saleId" TEXT,
    "generatedById" TEXT NOT NULL,
    "supersedesId" TEXT,
    "sourceFingerprint" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeneratedDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClinicalProfessionalProfile_userId_key" ON "ClinicalProfessionalProfile"("userId");

-- CreateIndex
CREATE INDEX "ClinicalProfessionalProfile_active_idx" ON "ClinicalProfessionalProfile"("active");

-- CreateIndex
CREATE INDEX "ClinicalProfessionalProfile_configuredById_idx" ON "ClinicalProfessionalProfile"("configuredById");

-- CreateIndex
CREATE UNIQUE INDEX "GeneratedDocument_documentNumber_key" ON "GeneratedDocument"("documentNumber");

-- CreateIndex
CREATE UNIQUE INDEX "GeneratedDocument_supersedesId_key" ON "GeneratedDocument"("supersedesId");

-- CreateIndex
CREATE INDEX "GeneratedDocument_kind_generatedAt_idx" ON "GeneratedDocument"("kind", "generatedAt");

-- CreateIndex
CREATE INDEX "GeneratedDocument_patientId_generatedAt_idx" ON "GeneratedDocument"("patientId", "generatedAt");

-- CreateIndex
CREATE INDEX "GeneratedDocument_visitId_idx" ON "GeneratedDocument"("visitId");

-- CreateIndex
CREATE INDEX "GeneratedDocument_prescriptionId_idx" ON "GeneratedDocument"("prescriptionId");

-- CreateIndex
CREATE INDEX "GeneratedDocument_saleId_idx" ON "GeneratedDocument"("saleId");

-- CreateIndex
CREATE INDEX "GeneratedDocument_generatedById_idx" ON "GeneratedDocument"("generatedById");

-- CreateIndex
CREATE UNIQUE INDEX "GeneratedDocument_seriesKey_version_key" ON "GeneratedDocument"("seriesKey", "version");

-- CreateIndex
CREATE UNIQUE INDEX "GeneratedDocument_seriesKey_sourceFingerprint_key" ON "GeneratedDocument"("seriesKey", "sourceFingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "Prescription_supersedesId_key" ON "Prescription"("supersedesId");

-- CreateIndex
CREATE UNIQUE INDEX "Prescription_visitId_version_key" ON "Prescription"("visitId", "version");

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_supersedesId_fkey" FOREIGN KEY ("supersedesId") REFERENCES "Prescription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalProfessionalProfile" ADD CONSTRAINT "ClinicalProfessionalProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "InternalUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalProfessionalProfile" ADD CONSTRAINT "ClinicalProfessionalProfile_configuredById_fkey" FOREIGN KEY ("configuredById") REFERENCES "InternalUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedDocument" ADD CONSTRAINT "GeneratedDocument_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedDocument" ADD CONSTRAINT "GeneratedDocument_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedDocument" ADD CONSTRAINT "GeneratedDocument_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "Prescription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedDocument" ADD CONSTRAINT "GeneratedDocument_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedDocument" ADD CONSTRAINT "GeneratedDocument_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "InternalUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedDocument" ADD CONSTRAINT "GeneratedDocument_supersedesId_fkey" FOREIGN KEY ("supersedesId") REFERENCES "GeneratedDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Prescription"
ADD CONSTRAINT "Prescription_version_positive_check"
CHECK ("version" > 0);

ALTER TABLE "GeneratedDocument"
ADD CONSTRAINT "GeneratedDocument_version_positive_check"
CHECK ("version" > 0);

ALTER TABLE "GeneratedDocument"
ADD CONSTRAINT "GeneratedDocument_source_matches_kind_check"
CHECK (
  ("kind" = 'prescription' AND "prescriptionId" IS NOT NULL AND "saleId" IS NULL AND "visitId" IS NOT NULL)
  OR
  ("kind" = 'internal_sale_receipt' AND "saleId" IS NOT NULL AND "prescriptionId" IS NULL)
);

-- An emitted document is evidence: corrections create another version instead
-- of changing or deleting the original snapshot.
CREATE OR REPLACE FUNCTION "prevent_generated_document_mutation"()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Generated documents are append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "GeneratedDocument_append_only_update"
BEFORE UPDATE ON "GeneratedDocument"
FOR EACH ROW EXECUTE FUNCTION "prevent_generated_document_mutation"();

CREATE TRIGGER "GeneratedDocument_append_only_delete"
BEFORE DELETE ON "GeneratedDocument"
FOR EACH ROW EXECUTE FUNCTION "prevent_generated_document_mutation"();
