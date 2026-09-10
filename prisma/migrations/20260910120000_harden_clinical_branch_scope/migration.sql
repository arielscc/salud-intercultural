-- Tarea 8: endurecimiento. Ejecutar tras reconciliar los pendientes de expansión.
BEGIN;
DO $$
BEGIN
IF EXISTS (SELECT 1 FROM "ClinicalConsultation" WHERE "branchCode" IS NULL) OR
   EXISTS (SELECT 1 FROM "ClinicalConsultationVersion" WHERE "branchCode" IS NULL) OR
   EXISTS (SELECT 1 FROM "Diagnosis" WHERE "branchCode" IS NULL) OR
   EXISTS (SELECT 1 FROM "TreatmentPlan" WHERE "branchCode" IS NULL) OR
   EXISTS (SELECT 1 FROM "TreatmentProposalOutcome" WHERE "branchCode" IS NULL) OR
   EXISTS (SELECT 1 FROM "Prescription" WHERE "branchCode" IS NULL) OR
   EXISTS (SELECT 1 FROM "PrescriptionItem" WHERE "branchCode" IS NULL) OR
   EXISTS (SELECT 1 FROM "ClinicalEvolution" WHERE "branchCode" IS NULL) OR
   EXISTS (SELECT 1 FROM "ClinicalNote" WHERE "branchCode" IS NULL) OR
   EXISTS (SELECT 1 FROM "ClinicalOrder" WHERE "branchCode" IS NULL) OR
   EXISTS (SELECT 1 FROM "ClinicalProfessionalProfile" WHERE "branchCode" IS NULL) OR
   EXISTS (SELECT 1 FROM "DoctorOrder" WHERE "branchCode" IS NULL) OR
   EXISTS (SELECT 1 FROM "DoctorOrderLine" WHERE "branchCode" IS NULL) THEN
  RAISE EXCEPTION 'CLINICAL_BRANCH_BACKFILL_INCOMPLETE';
END IF;
END $$;

-- DropForeignKey
ALTER TABLE "ClinicalConsultation" DROP CONSTRAINT "ClinicalConsultation_visitId_fkey";

-- DropForeignKey
ALTER TABLE "ClinicalConsultationVersion" DROP CONSTRAINT "ClinicalConsultationVersion_consultationId_fkey";

-- DropForeignKey
ALTER TABLE "Diagnosis" DROP CONSTRAINT "Diagnosis_consultationId_fkey";

-- DropForeignKey
ALTER TABLE "TreatmentPlan" DROP CONSTRAINT "TreatmentPlan_consultationId_fkey";

-- DropForeignKey
ALTER TABLE "TreatmentProposalOutcome" DROP CONSTRAINT "TreatmentProposalOutcome_consultationId_fkey";

-- DropForeignKey
ALTER TABLE "TreatmentProposalOutcome" DROP CONSTRAINT "TreatmentProposalOutcome_visitId_fkey";

-- DropForeignKey
ALTER TABLE "TreatmentProposalOutcome" DROP CONSTRAINT "TreatmentProposalOutcome_administrationOrderId_fkey";

-- DropForeignKey
ALTER TABLE "TreatmentProposalOutcome" DROP CONSTRAINT "TreatmentProposalOutcome_supersedesId_fkey";

-- DropForeignKey
ALTER TABLE "Prescription" DROP CONSTRAINT "Prescription_visitId_fkey";

-- DropForeignKey
ALTER TABLE "Prescription" DROP CONSTRAINT "Prescription_supersedesId_fkey";

-- DropForeignKey
ALTER TABLE "PrescriptionItem" DROP CONSTRAINT "PrescriptionItem_prescriptionId_fkey";

-- DropForeignKey
ALTER TABLE "ClinicalEvolution" DROP CONSTRAINT "ClinicalEvolution_visitId_fkey";

-- DropForeignKey
ALTER TABLE "ClinicalNote" DROP CONSTRAINT "ClinicalNote_visitId_fkey";

-- DropForeignKey
ALTER TABLE "ClinicalOrder" DROP CONSTRAINT "ClinicalOrder_visitId_fkey";

-- DropForeignKey
ALTER TABLE "ClinicalOrder" DROP CONSTRAINT "ClinicalOrder_workItemId_fkey";

-- DropForeignKey
ALTER TABLE "DoctorOrder" DROP CONSTRAINT "DoctorOrder_visitId_fkey";

-- DropForeignKey
ALTER TABLE "DoctorOrderLine" DROP CONSTRAINT "DoctorOrderLine_orderId_fkey";

-- DropIndex
DROP INDEX "ClinicalConsultation_patientId_idx";

-- DropIndex
DROP INDEX "ClinicalConsultationVersion_consultationId_createdAt_idx";

-- DropIndex
DROP INDEX "ClinicalConsultationVersion_consultationId_version_key";

-- DropIndex
DROP INDEX "Diagnosis_consultationId_idx";

-- DropIndex
DROP INDEX "TreatmentPlan_consultationId_idx";

-- DropIndex
DROP INDEX "TreatmentProposalOutcome_consultationId_decidedAt_idx";

-- DropIndex
DROP INDEX "TreatmentProposalOutcome_visitId_decidedAt_idx";

-- DropIndex
DROP INDEX "Prescription_visitId_idx";

-- DropIndex
DROP INDEX "Prescription_patientId_idx";

-- DropIndex
DROP INDEX "Prescription_visitId_version_key";

-- DropIndex
DROP INDEX "PrescriptionItem_prescriptionId_idx";

-- DropIndex
DROP INDEX "ClinicalEvolution_visitId_idx";

-- DropIndex
DROP INDEX "ClinicalEvolution_patientId_idx";

-- DropIndex
DROP INDEX "ClinicalNote_visitId_idx";

-- DropIndex
DROP INDEX "ClinicalNote_patientId_idx";

-- DropIndex
DROP INDEX "ClinicalOrder_visitId_idx";

-- DropIndex
DROP INDEX "ClinicalOrder_patientId_idx";

-- DropIndex
DROP INDEX "ClinicalProfessionalProfile_userId_key";

-- DropIndex
DROP INDEX "DoctorOrder_patientId_idx";

-- DropIndex
DROP INDEX "DoctorOrderLine_orderId_idx";

ALTER TABLE "ClinicalConsultation" ALTER COLUMN "branchCode" SET NOT NULL;

ALTER TABLE "ClinicalConsultationVersion" ALTER COLUMN "branchCode" SET NOT NULL;

ALTER TABLE "Diagnosis" ALTER COLUMN "branchCode" SET NOT NULL;

ALTER TABLE "TreatmentPlan" ALTER COLUMN "branchCode" SET NOT NULL;

ALTER TABLE "TreatmentProposalOutcome" ALTER COLUMN "branchCode" SET NOT NULL;

ALTER TABLE "Prescription" ALTER COLUMN "branchCode" SET NOT NULL;

ALTER TABLE "PrescriptionItem" ALTER COLUMN "branchCode" SET NOT NULL;

ALTER TABLE "ClinicalEvolution" ALTER COLUMN "branchCode" SET NOT NULL;

ALTER TABLE "ClinicalNote" ALTER COLUMN "branchCode" SET NOT NULL;

ALTER TABLE "ClinicalOrder" ALTER COLUMN "branchCode" SET NOT NULL;

ALTER TABLE "ClinicalProfessionalProfile" ALTER COLUMN "branchCode" SET NOT NULL;

ALTER TABLE "DoctorOrder" ALTER COLUMN "branchCode" SET NOT NULL;

ALTER TABLE "DoctorOrderLine" ALTER COLUMN "branchCode" SET NOT NULL;

-- CreateTable
CREATE TABLE "IndicationCatalogItemBranch" (
    "catalogItemId" TEXT NOT NULL,
    "branchCode" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IndicationCatalogItemBranch_pkey" PRIMARY KEY ("catalogItemId","branchCode")
);

-- CreateTable
CREATE TABLE "DiagnosisCatalogItemBranch" (
    "catalogItemId" TEXT NOT NULL,
    "branchCode" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiagnosisCatalogItemBranch_pkey" PRIMARY KEY ("catalogItemId","branchCode")
);

-- CreateTable
CREATE TABLE "ClinicalNoteCatalogItemBranch" (
    "catalogItemId" TEXT NOT NULL,
    "branchCode" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicalNoteCatalogItemBranch_pkey" PRIMARY KEY ("catalogItemId","branchCode")
);

-- CreateTable
CREATE TABLE "ClinicalContinuityAccess" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "branchCode" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "consultedBranchCodes" TEXT[],
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClinicalContinuityAccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IndicationCatalogItemBranch_branchCode_active_usageCount_idx" ON "IndicationCatalogItemBranch"("branchCode", "active", "usageCount");

-- CreateIndex
CREATE INDEX "DiagnosisCatalogItemBranch_branchCode_active_usageCount_idx" ON "DiagnosisCatalogItemBranch"("branchCode", "active", "usageCount");

-- CreateIndex
CREATE INDEX "ClinicalNoteCatalogItemBranch_branchCode_active_usageCount_idx" ON "ClinicalNoteCatalogItemBranch"("branchCode", "active", "usageCount");

-- CreateIndex
CREATE INDEX "ClinicalContinuityAccess_branchCode_patientId_createdAt_idx" ON "ClinicalContinuityAccess"("branchCode", "patientId", "createdAt");

-- CreateIndex
CREATE INDEX "ClinicalContinuityAccess_doctorId_expiresAt_idx" ON "ClinicalContinuityAccess"("doctorId", "expiresAt");

-- CreateIndex
CREATE INDEX "ClinicalContinuityAccess_visitId_expiresAt_idx" ON "ClinicalContinuityAccess"("visitId", "expiresAt");

-- CreateIndex
CREATE INDEX "ClinicalConsultation_branchCode_patientId_createdAt_idx" ON "ClinicalConsultation"("branchCode", "patientId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ClinicalConsultation_id_branchCode_key" ON "ClinicalConsultation"("id", "branchCode");

-- CreateIndex
CREATE UNIQUE INDEX "ClinicalConsultation_visitId_branchCode_key" ON "ClinicalConsultation"("visitId", "branchCode");

-- CreateIndex
CREATE INDEX "ClinicalConsultationVersion_branchCode_consultationId_creat_idx" ON "ClinicalConsultationVersion"("branchCode", "consultationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ClinicalConsultationVersion_consultationId_branchCode_versi_key" ON "ClinicalConsultationVersion"("consultationId", "branchCode", "version");

-- CreateIndex
CREATE INDEX "Diagnosis_branchCode_consultationId_idx" ON "Diagnosis"("branchCode", "consultationId");

-- CreateIndex
CREATE INDEX "TreatmentPlan_branchCode_consultationId_idx" ON "TreatmentPlan"("branchCode", "consultationId");

-- CreateIndex
CREATE INDEX "TreatmentProposalOutcome_branchCode_consultationId_decidedA_idx" ON "TreatmentProposalOutcome"("branchCode", "consultationId", "decidedAt");

-- CreateIndex
CREATE INDEX "TreatmentProposalOutcome_branchCode_visitId_decidedAt_idx" ON "TreatmentProposalOutcome"("branchCode", "visitId", "decidedAt");

-- CreateIndex
CREATE UNIQUE INDEX "TreatmentProposalOutcome_id_branchCode_key" ON "TreatmentProposalOutcome"("id", "branchCode");

-- CreateIndex
CREATE UNIQUE INDEX "TreatmentProposalOutcome_administrationOrderId_branchCode_key" ON "TreatmentProposalOutcome"("administrationOrderId", "branchCode");

-- CreateIndex
CREATE UNIQUE INDEX "TreatmentProposalOutcome_supersedesId_branchCode_key" ON "TreatmentProposalOutcome"("supersedesId", "branchCode");

-- CreateIndex
CREATE INDEX "Prescription_branchCode_visitId_idx" ON "Prescription"("branchCode", "visitId");

-- CreateIndex
CREATE INDEX "Prescription_branchCode_patientId_idx" ON "Prescription"("branchCode", "patientId");

-- CreateIndex
CREATE UNIQUE INDEX "Prescription_id_branchCode_key" ON "Prescription"("id", "branchCode");

-- CreateIndex
CREATE UNIQUE INDEX "Prescription_supersedesId_branchCode_key" ON "Prescription"("supersedesId", "branchCode");

-- CreateIndex
CREATE UNIQUE INDEX "Prescription_visitId_branchCode_version_key" ON "Prescription"("visitId", "branchCode", "version");

-- CreateIndex
CREATE INDEX "PrescriptionItem_branchCode_prescriptionId_idx" ON "PrescriptionItem"("branchCode", "prescriptionId");

-- CreateIndex
CREATE INDEX "ClinicalEvolution_branchCode_visitId_idx" ON "ClinicalEvolution"("branchCode", "visitId");

-- CreateIndex
CREATE INDEX "ClinicalEvolution_branchCode_patientId_idx" ON "ClinicalEvolution"("branchCode", "patientId");

-- CreateIndex
CREATE INDEX "ClinicalNote_branchCode_visitId_idx" ON "ClinicalNote"("branchCode", "visitId");

-- CreateIndex
CREATE INDEX "ClinicalNote_branchCode_patientId_idx" ON "ClinicalNote"("branchCode", "patientId");

-- CreateIndex
CREATE INDEX "ClinicalOrder_branchCode_visitId_idx" ON "ClinicalOrder"("branchCode", "visitId");

-- CreateIndex
CREATE INDEX "ClinicalOrder_branchCode_patientId_idx" ON "ClinicalOrder"("branchCode", "patientId");

-- CreateIndex
CREATE UNIQUE INDEX "ClinicalOrder_id_branchCode_key" ON "ClinicalOrder"("id", "branchCode");

-- CreateIndex
CREATE INDEX "ClinicalProfessionalProfile_branchCode_active_idx" ON "ClinicalProfessionalProfile"("branchCode", "active");

-- CreateIndex
CREATE UNIQUE INDEX "ClinicalProfessionalProfile_userId_branchCode_key" ON "ClinicalProfessionalProfile"("userId", "branchCode");

-- CreateIndex
CREATE INDEX "DoctorOrder_branchCode_patientId_idx" ON "DoctorOrder"("branchCode", "patientId");

-- CreateIndex
CREATE UNIQUE INDEX "DoctorOrder_id_branchCode_key" ON "DoctorOrder"("id", "branchCode");

-- CreateIndex
CREATE UNIQUE INDEX "DoctorOrder_visitId_branchCode_key" ON "DoctorOrder"("visitId", "branchCode");

-- CreateIndex
CREATE INDEX "DoctorOrderLine_branchCode_orderId_idx" ON "DoctorOrderLine"("branchCode", "orderId");

-- AddForeignKey
ALTER TABLE "ClinicalConsultation" ADD CONSTRAINT "ClinicalConsultation_visitId_branchCode_fkey" FOREIGN KEY ("visitId", "branchCode") REFERENCES "Visit"("id", "branchCode") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalConsultation" ADD CONSTRAINT "ClinicalConsultation_patientId_branchCode_fkey" FOREIGN KEY ("patientId", "branchCode") REFERENCES "PatientBranchRecord"("patientId", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalConsultation" ADD CONSTRAINT "ClinicalConsultation_branchCode_fkey" FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalConsultationVersion" ADD CONSTRAINT "ClinicalConsultationVersion_consultationId_branchCode_fkey" FOREIGN KEY ("consultationId", "branchCode") REFERENCES "ClinicalConsultation"("id", "branchCode") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalConsultationVersion" ADD CONSTRAINT "ClinicalConsultationVersion_branchCode_fkey" FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Diagnosis" ADD CONSTRAINT "Diagnosis_consultationId_branchCode_fkey" FOREIGN KEY ("consultationId", "branchCode") REFERENCES "ClinicalConsultation"("id", "branchCode") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Diagnosis" ADD CONSTRAINT "Diagnosis_branchCode_fkey" FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentPlan" ADD CONSTRAINT "TreatmentPlan_consultationId_branchCode_fkey" FOREIGN KEY ("consultationId", "branchCode") REFERENCES "ClinicalConsultation"("id", "branchCode") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentPlan" ADD CONSTRAINT "TreatmentPlan_branchCode_fkey" FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentProposalOutcome" ADD CONSTRAINT "TreatmentProposalOutcome_consultationId_branchCode_fkey" FOREIGN KEY ("consultationId", "branchCode") REFERENCES "ClinicalConsultation"("id", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentProposalOutcome" ADD CONSTRAINT "TreatmentProposalOutcome_visitId_branchCode_fkey" FOREIGN KEY ("visitId", "branchCode") REFERENCES "Visit"("id", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentProposalOutcome" ADD CONSTRAINT "TreatmentProposalOutcome_branchCode_fkey" FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentProposalOutcome" ADD CONSTRAINT "TreatmentProposalOutcome_administrationOrderId_branchCode_fkey" FOREIGN KEY ("administrationOrderId", "branchCode") REFERENCES "ClinicalOrder"("id", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentProposalOutcome" ADD CONSTRAINT "TreatmentProposalOutcome_supersedesId_branchCode_fkey" FOREIGN KEY ("supersedesId", "branchCode") REFERENCES "TreatmentProposalOutcome"("id", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_visitId_branchCode_fkey" FOREIGN KEY ("visitId", "branchCode") REFERENCES "Visit"("id", "branchCode") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_patientId_branchCode_fkey" FOREIGN KEY ("patientId", "branchCode") REFERENCES "PatientBranchRecord"("patientId", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_branchCode_fkey" FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_supersedesId_branchCode_fkey" FOREIGN KEY ("supersedesId", "branchCode") REFERENCES "Prescription"("id", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionItem" ADD CONSTRAINT "PrescriptionItem_prescriptionId_branchCode_fkey" FOREIGN KEY ("prescriptionId", "branchCode") REFERENCES "Prescription"("id", "branchCode") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionItem" ADD CONSTRAINT "PrescriptionItem_branchCode_fkey" FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IndicationCatalogItemBranch" ADD CONSTRAINT "IndicationCatalogItemBranch_catalogItemId_fkey" FOREIGN KEY ("catalogItemId") REFERENCES "IndicationCatalogItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IndicationCatalogItemBranch" ADD CONSTRAINT "IndicationCatalogItemBranch_branchCode_fkey" FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosisCatalogItemBranch" ADD CONSTRAINT "DiagnosisCatalogItemBranch_catalogItemId_fkey" FOREIGN KEY ("catalogItemId") REFERENCES "DiagnosisCatalogItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosisCatalogItemBranch" ADD CONSTRAINT "DiagnosisCatalogItemBranch_branchCode_fkey" FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalNoteCatalogItemBranch" ADD CONSTRAINT "ClinicalNoteCatalogItemBranch_catalogItemId_fkey" FOREIGN KEY ("catalogItemId") REFERENCES "ClinicalNoteCatalogItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalNoteCatalogItemBranch" ADD CONSTRAINT "ClinicalNoteCatalogItemBranch_branchCode_fkey" FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalEvolution" ADD CONSTRAINT "ClinicalEvolution_visitId_branchCode_fkey" FOREIGN KEY ("visitId", "branchCode") REFERENCES "Visit"("id", "branchCode") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalEvolution" ADD CONSTRAINT "ClinicalEvolution_patientId_branchCode_fkey" FOREIGN KEY ("patientId", "branchCode") REFERENCES "PatientBranchRecord"("patientId", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalEvolution" ADD CONSTRAINT "ClinicalEvolution_branchCode_fkey" FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalNote" ADD CONSTRAINT "ClinicalNote_visitId_branchCode_fkey" FOREIGN KEY ("visitId", "branchCode") REFERENCES "Visit"("id", "branchCode") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalNote" ADD CONSTRAINT "ClinicalNote_patientId_branchCode_fkey" FOREIGN KEY ("patientId", "branchCode") REFERENCES "PatientBranchRecord"("patientId", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalNote" ADD CONSTRAINT "ClinicalNote_branchCode_fkey" FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalOrder" ADD CONSTRAINT "ClinicalOrder_visitId_branchCode_fkey" FOREIGN KEY ("visitId", "branchCode") REFERENCES "Visit"("id", "branchCode") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalOrder" ADD CONSTRAINT "ClinicalOrder_patientId_branchCode_fkey" FOREIGN KEY ("patientId", "branchCode") REFERENCES "PatientBranchRecord"("patientId", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalOrder" ADD CONSTRAINT "ClinicalOrder_branchCode_fkey" FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalOrder" ADD CONSTRAINT "ClinicalOrder_workItemId_branchCode_fkey" FOREIGN KEY ("workItemId", "branchCode") REFERENCES "VisitWorkItem"("id", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalProfessionalProfile" ADD CONSTRAINT "ClinicalProfessionalProfile_userId_branchCode_fkey" FOREIGN KEY ("userId", "branchCode") REFERENCES "InternalUserBranch"("userId", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalProfessionalProfile" ADD CONSTRAINT "ClinicalProfessionalProfile_branchCode_fkey" FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalContinuityAccess" ADD CONSTRAINT "ClinicalContinuityAccess_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalContinuityAccess" ADD CONSTRAINT "ClinicalContinuityAccess_patientId_branchCode_fkey" FOREIGN KEY ("patientId", "branchCode") REFERENCES "PatientBranchRecord"("patientId", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalContinuityAccess" ADD CONSTRAINT "ClinicalContinuityAccess_visitId_branchCode_fkey" FOREIGN KEY ("visitId", "branchCode") REFERENCES "Visit"("id", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalContinuityAccess" ADD CONSTRAINT "ClinicalContinuityAccess_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "InternalUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalContinuityAccess" ADD CONSTRAINT "ClinicalContinuityAccess_doctorId_branchCode_fkey" FOREIGN KEY ("doctorId", "branchCode") REFERENCES "InternalUserBranch"("userId", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalContinuityAccess" ADD CONSTRAINT "ClinicalContinuityAccess_branchCode_fkey" FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorOrder" ADD CONSTRAINT "DoctorOrder_visitId_branchCode_fkey" FOREIGN KEY ("visitId", "branchCode") REFERENCES "Visit"("id", "branchCode") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorOrder" ADD CONSTRAINT "DoctorOrder_patientId_branchCode_fkey" FOREIGN KEY ("patientId", "branchCode") REFERENCES "PatientBranchRecord"("patientId", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorOrder" ADD CONSTRAINT "DoctorOrder_branchCode_fkey" FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorOrderLine" ADD CONSTRAINT "DoctorOrderLine_orderId_branchCode_fkey" FOREIGN KEY ("orderId", "branchCode") REFERENCES "DoctorOrder"("id", "branchCode") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorOrderLine" ADD CONSTRAINT "DoctorOrderLine_branchCode_fkey" FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code") ON DELETE RESTRICT ON UPDATE CASCADE;


-- La derivación del pedido conserva la misma sucursal.
ALTER TABLE "DoctorOrder" ADD CONSTRAINT "DoctorOrder_nursingWorkItemId_branchCode_fkey"
FOREIGN KEY ("nursingWorkItemId", "branchCode") REFERENCES "VisitWorkItem"("id", "branchCode")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- No se propagan sugerencias locales a otras sedes: solo se habilitan donde
-- hay evidencia clínica de uso. Las definiciones canónicas siguen globales.
INSERT INTO "DiagnosisCatalogItemBranch" ("catalogItemId", "branchCode", "active", "usageCount", "updatedAt")
SELECT c."id", d."branchCode", c."active", count(*)::integer, CURRENT_TIMESTAMP
FROM "Diagnosis" d JOIN "DiagnosisCatalogItem" c
 ON c."normalized" = lower(regexp_replace(trim(d."name"), '\s+', ' ', 'g'))
GROUP BY c."id", d."branchCode", c."active";

INSERT INTO "IndicationCatalogItemBranch" ("catalogItemId", "branchCode", "active", "usageCount", "updatedAt")
SELECT c."id", consultation."branchCode", c."active", count(*)::integer, CURRENT_TIMESTAMP
FROM "ClinicalConsultation" consultation
CROSS JOIN LATERAL regexp_split_to_table(consultation."indications", E'\\n') AS line
JOIN "IndicationCatalogItem" c
 ON c."normalized" = lower(regexp_replace(trim(line), '\s+', ' ', 'g'))
GROUP BY c."id", consultation."branchCode", c."active";

INSERT INTO "ClinicalNoteCatalogItemBranch" ("catalogItemId", "branchCode", "active", "usageCount", "updatedAt")
SELECT c."id", consultation."branchCode", c."active", count(*)::integer, CURRENT_TIMESTAMP
FROM "ClinicalConsultation" consultation
CROSS JOIN LATERAL (VALUES ('finding', consultation."findings"), ('observation', consultation."observations")) AS note(field, content)
CROSS JOIN LATERAL regexp_split_to_table(note.content, E'\\n') AS line
JOIN "ClinicalNoteCatalogItem" c
 ON c."field"::text = note.field
 AND c."normalized" = lower(regexp_replace(trim(line), '\s+', ' ', 'g'))
GROUP BY c."id", consultation."branchCode", c."active";
COMMIT;
