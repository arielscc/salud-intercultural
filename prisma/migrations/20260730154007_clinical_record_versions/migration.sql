-- CreateEnum
CREATE TYPE "ClinicalRecordStatus" AS ENUM ('draft', 'finalized');

-- CreateEnum
CREATE TYPE "ClinicalRecordVersionKind" AS ENUM ('draft', 'finalized', 'correction');

-- CreateEnum
CREATE TYPE "ClinicalCorrectionType" AS ENUM ('diagnosis', 'findings', 'treatment_plan', 'indications', 'other');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "InternalPermission" ADD VALUE 'clinical_finalize';
ALTER TYPE "InternalPermission" ADD VALUE 'clinical_correct';

-- AlterTable
ALTER TABLE "ClinicalConsultation" ADD COLUMN     "finalizedAt" TIMESTAMP(3),
ADD COLUMN     "finalizedById" TEXT,
ADD COLUMN     "revision" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "status" "ClinicalRecordStatus" NOT NULL DEFAULT 'draft';

-- CreateTable
CREATE TABLE "ClinicalConsultationVersion" (
    "id" TEXT NOT NULL,
    "consultationId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "kind" "ClinicalRecordVersionKind" NOT NULL,
    "correctionType" "ClinicalCorrectionType",
    "correctionReason" TEXT,
    "authorId" TEXT,
    "motive" TEXT NOT NULL,
    "primaryDiagnosis" TEXT,
    "secondaryDiagnosis" TEXT,
    "findings" TEXT,
    "observations" TEXT,
    "treatmentPlanText" TEXT,
    "indications" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClinicalConsultationVersion_pkey" PRIMARY KEY ("id")
);

-- Conserva una primera fotografía de cada consulta anterior.
-- No se inventa una firma: los registros existentes permanecen como borradores.
INSERT INTO "ClinicalConsultationVersion" (
    "id",
    "consultationId",
    "version",
    "kind",
    "authorId",
    "motive",
    "primaryDiagnosis",
    "secondaryDiagnosis",
    "findings",
    "observations",
    "treatmentPlanText",
    "indications",
    "createdAt"
)
SELECT
    'clinical-version-' || MD5(consultation."id"),
    consultation."id",
    1,
    'draft'::"ClinicalRecordVersionKind",
    consultation."doctorId",
    consultation."motive",
    primary_diagnosis."name",
    secondary_diagnosis."name",
    consultation."findings",
    consultation."observations",
    consultation."treatmentPlanText",
    consultation."indications",
    consultation."createdAt"
FROM "ClinicalConsultation" AS consultation
LEFT JOIN LATERAL (
    SELECT diagnosis."name"
    FROM "Diagnosis" AS diagnosis
    WHERE diagnosis."consultationId" = consultation."id"
      AND diagnosis."kind" = 'primary'
    ORDER BY diagnosis."createdAt" ASC
    LIMIT 1
) AS primary_diagnosis ON TRUE
LEFT JOIN LATERAL (
    SELECT diagnosis."name"
    FROM "Diagnosis" AS diagnosis
    WHERE diagnosis."consultationId" = consultation."id"
      AND diagnosis."kind" = 'secondary'
    ORDER BY diagnosis."createdAt" ASC
    LIMIT 1
) AS secondary_diagnosis ON TRUE;

-- CreateIndex
CREATE INDEX "ClinicalConsultationVersion_consultationId_createdAt_idx" ON "ClinicalConsultationVersion"("consultationId", "createdAt");

-- CreateIndex
CREATE INDEX "ClinicalConsultationVersion_authorId_createdAt_idx" ON "ClinicalConsultationVersion"("authorId", "createdAt");

-- CreateIndex
CREATE INDEX "ClinicalConsultationVersion_kind_createdAt_idx" ON "ClinicalConsultationVersion"("kind", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ClinicalConsultationVersion_consultationId_version_key" ON "ClinicalConsultationVersion"("consultationId", "version");

-- CreateIndex
CREATE INDEX "ClinicalConsultation_status_finalizedAt_idx" ON "ClinicalConsultation"("status", "finalizedAt");

-- CreateIndex
CREATE INDEX "ClinicalConsultation_finalizedById_idx" ON "ClinicalConsultation"("finalizedById");

-- AddForeignKey
ALTER TABLE "ClinicalConsultation" ADD CONSTRAINT "ClinicalConsultation_finalizedById_fkey" FOREIGN KEY ("finalizedById") REFERENCES "InternalUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalConsultationVersion" ADD CONSTRAINT "ClinicalConsultationVersion_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "ClinicalConsultation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalConsultationVersion" ADD CONSTRAINT "ClinicalConsultationVersion_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "InternalUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
