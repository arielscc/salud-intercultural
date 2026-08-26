-- V3.2 clinical care, diagnoses, treatment plans, prescriptions and clinical orders.

ALTER TYPE "InternalPermission" ADD VALUE IF NOT EXISTS 'clinical_read';
ALTER TYPE "InternalPermission" ADD VALUE IF NOT EXISTS 'clinical_write';

CREATE TYPE "DiagnosisKind" AS ENUM ('primary', 'secondary');

CREATE TYPE "ClinicalOrderType" AS ENUM (
  'vital_signs',
  'study',
  'nursing_application',
  'serum',
  'medication',
  'administration',
  'follow_up',
  'other'
);

CREATE TYPE "ClinicalOrderStatus" AS ENUM (
  'pending',
  'acknowledged',
  'completed',
  'cancelled',
  'blocked'
);

CREATE TABLE "ClinicalConsultation" (
  "id" TEXT NOT NULL,
  "visitId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "doctorId" TEXT,
  "motive" TEXT NOT NULL,
  "findings" TEXT,
  "observations" TEXT,
  "treatmentPlanText" TEXT,
  "indications" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ClinicalConsultation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Diagnosis" (
  "id" TEXT NOT NULL,
  "consultationId" TEXT NOT NULL,
  "kind" "DiagnosisKind" NOT NULL DEFAULT 'secondary',
  "name" TEXT NOT NULL,
  "findings" TEXT,
  "observations" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Diagnosis_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TreatmentPlan" (
  "id" TEXT NOT NULL,
  "consultationId" TEXT NOT NULL,
  "internalName" TEXT,
  "medications" TEXT,
  "dosage" TEXT,
  "duration" TEXT,
  "observations" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TreatmentPlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Prescription" (
  "id" TEXT NOT NULL,
  "visitId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "doctorId" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Prescription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PrescriptionItem" (
  "id" TEXT NOT NULL,
  "prescriptionId" TEXT NOT NULL,
  "medication" TEXT NOT NULL,
  "dose" TEXT,
  "frequency" TEXT,
  "duration" TEXT,
  "observations" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PrescriptionItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClinicalEvolution" (
  "id" TEXT NOT NULL,
  "visitId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "userId" TEXT,
  "note" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ClinicalEvolution_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClinicalNote" (
  "id" TEXT NOT NULL,
  "visitId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "userId" TEXT,
  "note" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ClinicalNote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClinicalOrder" (
  "id" TEXT NOT NULL,
  "visitId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "doctorId" TEXT,
  "workItemId" TEXT,
  "type" "ClinicalOrderType" NOT NULL,
  "targetArea" "PatientRouteArea" NOT NULL,
  "status" "ClinicalOrderStatus" NOT NULL DEFAULT 'pending',
  "title" TEXT NOT NULL,
  "details" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ClinicalOrder_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClinicalConsultation_visitId_key" ON "ClinicalConsultation"("visitId");
CREATE INDEX "ClinicalConsultation_patientId_idx" ON "ClinicalConsultation"("patientId");
CREATE INDEX "ClinicalConsultation_doctorId_idx" ON "ClinicalConsultation"("doctorId");
CREATE INDEX "ClinicalConsultation_createdAt_idx" ON "ClinicalConsultation"("createdAt");

CREATE INDEX "Diagnosis_consultationId_idx" ON "Diagnosis"("consultationId");
CREATE INDEX "Diagnosis_kind_idx" ON "Diagnosis"("kind");

CREATE INDEX "TreatmentPlan_consultationId_idx" ON "TreatmentPlan"("consultationId");

CREATE INDEX "Prescription_visitId_idx" ON "Prescription"("visitId");
CREATE INDEX "Prescription_patientId_idx" ON "Prescription"("patientId");
CREATE INDEX "Prescription_doctorId_idx" ON "Prescription"("doctorId");
CREATE INDEX "Prescription_createdAt_idx" ON "Prescription"("createdAt");

CREATE INDEX "PrescriptionItem_prescriptionId_idx" ON "PrescriptionItem"("prescriptionId");

CREATE INDEX "ClinicalEvolution_visitId_idx" ON "ClinicalEvolution"("visitId");
CREATE INDEX "ClinicalEvolution_patientId_idx" ON "ClinicalEvolution"("patientId");
CREATE INDEX "ClinicalEvolution_userId_idx" ON "ClinicalEvolution"("userId");
CREATE INDEX "ClinicalEvolution_createdAt_idx" ON "ClinicalEvolution"("createdAt");

CREATE INDEX "ClinicalNote_visitId_idx" ON "ClinicalNote"("visitId");
CREATE INDEX "ClinicalNote_patientId_idx" ON "ClinicalNote"("patientId");
CREATE INDEX "ClinicalNote_userId_idx" ON "ClinicalNote"("userId");
CREATE INDEX "ClinicalNote_createdAt_idx" ON "ClinicalNote"("createdAt");

CREATE INDEX "ClinicalOrder_visitId_idx" ON "ClinicalOrder"("visitId");
CREATE INDEX "ClinicalOrder_patientId_idx" ON "ClinicalOrder"("patientId");
CREATE INDEX "ClinicalOrder_doctorId_idx" ON "ClinicalOrder"("doctorId");
CREATE INDEX "ClinicalOrder_targetArea_status_idx" ON "ClinicalOrder"("targetArea", "status");
CREATE INDEX "ClinicalOrder_createdAt_idx" ON "ClinicalOrder"("createdAt");

ALTER TABLE "ClinicalConsultation"
  ADD CONSTRAINT "ClinicalConsultation_visitId_fkey"
  FOREIGN KEY ("visitId") REFERENCES "Visit"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClinicalConsultation"
  ADD CONSTRAINT "ClinicalConsultation_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "Patient"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ClinicalConsultation"
  ADD CONSTRAINT "ClinicalConsultation_doctorId_fkey"
  FOREIGN KEY ("doctorId") REFERENCES "InternalUser"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Diagnosis"
  ADD CONSTRAINT "Diagnosis_consultationId_fkey"
  FOREIGN KEY ("consultationId") REFERENCES "ClinicalConsultation"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TreatmentPlan"
  ADD CONSTRAINT "TreatmentPlan_consultationId_fkey"
  FOREIGN KEY ("consultationId") REFERENCES "ClinicalConsultation"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Prescription"
  ADD CONSTRAINT "Prescription_visitId_fkey"
  FOREIGN KEY ("visitId") REFERENCES "Visit"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Prescription"
  ADD CONSTRAINT "Prescription_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "Patient"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Prescription"
  ADD CONSTRAINT "Prescription_doctorId_fkey"
  FOREIGN KEY ("doctorId") REFERENCES "InternalUser"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PrescriptionItem"
  ADD CONSTRAINT "PrescriptionItem_prescriptionId_fkey"
  FOREIGN KEY ("prescriptionId") REFERENCES "Prescription"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClinicalEvolution"
  ADD CONSTRAINT "ClinicalEvolution_visitId_fkey"
  FOREIGN KEY ("visitId") REFERENCES "Visit"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClinicalEvolution"
  ADD CONSTRAINT "ClinicalEvolution_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "Patient"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ClinicalEvolution"
  ADD CONSTRAINT "ClinicalEvolution_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "InternalUser"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ClinicalNote"
  ADD CONSTRAINT "ClinicalNote_visitId_fkey"
  FOREIGN KEY ("visitId") REFERENCES "Visit"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClinicalNote"
  ADD CONSTRAINT "ClinicalNote_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "Patient"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ClinicalNote"
  ADD CONSTRAINT "ClinicalNote_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "InternalUser"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ClinicalOrder"
  ADD CONSTRAINT "ClinicalOrder_visitId_fkey"
  FOREIGN KEY ("visitId") REFERENCES "Visit"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClinicalOrder"
  ADD CONSTRAINT "ClinicalOrder_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "Patient"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ClinicalOrder"
  ADD CONSTRAINT "ClinicalOrder_doctorId_fkey"
  FOREIGN KEY ("doctorId") REFERENCES "InternalUser"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ClinicalOrder"
  ADD CONSTRAINT "ClinicalOrder_workItemId_fkey"
  FOREIGN KEY ("workItemId") REFERENCES "VisitWorkItem"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
