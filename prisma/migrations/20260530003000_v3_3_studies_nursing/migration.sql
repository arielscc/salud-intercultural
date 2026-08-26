-- V3.3 studies, vital signs, nursing applications and nursing work item results.

ALTER TYPE "InternalPermission" ADD VALUE IF NOT EXISTS 'nursing_read';
ALTER TYPE "InternalPermission" ADD VALUE IF NOT EXISTS 'nursing_write';
ALTER TYPE "InternalPermission" ADD VALUE IF NOT EXISTS 'studies_read';
ALTER TYPE "InternalPermission" ADD VALUE IF NOT EXISTS 'studies_write';

CREATE TYPE "StudyType" AS ENUM ('laboratory', 'ultrasound', 'resonance', 'imaging', 'other');
CREATE TYPE "StudyStatus" AS ENUM ('requested', 'performed', 'reviewed', 'cancelled');

CREATE TABLE "Study" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "visitId" TEXT,
  "clinicalOrderId" TEXT,
  "workItemId" TEXT,
  "requestedById" TEXT,
  "recordedById" TEXT,
  "type" "StudyType" NOT NULL DEFAULT 'other',
  "status" "StudyStatus" NOT NULL DEFAULT 'performed',
  "title" TEXT NOT NULL,
  "resultSummary" TEXT,
  "findings" TEXT,
  "performedAt" TIMESTAMP(3),
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Study_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudyAttachment" (
  "id" TEXT NOT NULL,
  "studyId" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "contentType" TEXT,
  "storageKey" TEXT,
  "url" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "StudyAttachment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VitalSigns" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "visitId" TEXT,
  "recordedById" TEXT,
  "temperatureCelsius" DECIMAL(4,1),
  "systolicPressureMmHg" INTEGER,
  "diastolicPressureMmHg" INTEGER,
  "heartRateBpm" INTEGER,
  "respiratoryRateRpm" INTEGER,
  "oxygenSaturation" INTEGER,
  "weightKg" DECIMAL(5,2),
  "heightCm" DECIMAL(5,2),
  "notes" TEXT,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "VitalSigns_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NursingApplication" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "visitId" TEXT,
  "clinicalOrderId" TEXT,
  "workItemId" TEXT,
  "responsibleId" TEXT,
  "medication" TEXT NOT NULL,
  "quantity" TEXT,
  "route" TEXT,
  "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "NursingApplication_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NursingNote" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "visitId" TEXT,
  "userId" TEXT,
  "note" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "NursingNote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClinicalAttachment" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "visitId" TEXT,
  "label" TEXT NOT NULL,
  "contentType" TEXT,
  "storageKey" TEXT,
  "url" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ClinicalAttachment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NursingWorkItemResult" (
  "id" TEXT NOT NULL,
  "workItemId" TEXT NOT NULL,
  "clinicalOrderId" TEXT,
  "userId" TEXT,
  "status" "VisitWorkItemStatus" NOT NULL,
  "outcome" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "NursingWorkItemResult_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Study_patientId_idx" ON "Study"("patientId");
CREATE INDEX "Study_visitId_idx" ON "Study"("visitId");
CREATE INDEX "Study_clinicalOrderId_idx" ON "Study"("clinicalOrderId");
CREATE INDEX "Study_workItemId_idx" ON "Study"("workItemId");
CREATE INDEX "Study_type_status_idx" ON "Study"("type", "status");
CREATE INDEX "Study_performedAt_idx" ON "Study"("performedAt");
CREATE INDEX "Study_createdAt_idx" ON "Study"("createdAt");

CREATE INDEX "StudyAttachment_studyId_idx" ON "StudyAttachment"("studyId");

CREATE INDEX "VitalSigns_patientId_idx" ON "VitalSigns"("patientId");
CREATE INDEX "VitalSigns_visitId_idx" ON "VitalSigns"("visitId");
CREATE INDEX "VitalSigns_recordedById_idx" ON "VitalSigns"("recordedById");
CREATE INDEX "VitalSigns_recordedAt_idx" ON "VitalSigns"("recordedAt");

CREATE INDEX "NursingApplication_patientId_idx" ON "NursingApplication"("patientId");
CREATE INDEX "NursingApplication_visitId_idx" ON "NursingApplication"("visitId");
CREATE INDEX "NursingApplication_clinicalOrderId_idx" ON "NursingApplication"("clinicalOrderId");
CREATE INDEX "NursingApplication_workItemId_idx" ON "NursingApplication"("workItemId");
CREATE INDEX "NursingApplication_responsibleId_idx" ON "NursingApplication"("responsibleId");
CREATE INDEX "NursingApplication_appliedAt_idx" ON "NursingApplication"("appliedAt");

CREATE INDEX "NursingNote_patientId_idx" ON "NursingNote"("patientId");
CREATE INDEX "NursingNote_visitId_idx" ON "NursingNote"("visitId");
CREATE INDEX "NursingNote_userId_idx" ON "NursingNote"("userId");
CREATE INDEX "NursingNote_createdAt_idx" ON "NursingNote"("createdAt");

CREATE INDEX "ClinicalAttachment_patientId_idx" ON "ClinicalAttachment"("patientId");
CREATE INDEX "ClinicalAttachment_visitId_idx" ON "ClinicalAttachment"("visitId");
CREATE INDEX "ClinicalAttachment_createdAt_idx" ON "ClinicalAttachment"("createdAt");

CREATE INDEX "NursingWorkItemResult_workItemId_idx" ON "NursingWorkItemResult"("workItemId");
CREATE INDEX "NursingWorkItemResult_clinicalOrderId_idx" ON "NursingWorkItemResult"("clinicalOrderId");
CREATE INDEX "NursingWorkItemResult_userId_idx" ON "NursingWorkItemResult"("userId");
CREATE INDEX "NursingWorkItemResult_status_idx" ON "NursingWorkItemResult"("status");
CREATE INDEX "NursingWorkItemResult_createdAt_idx" ON "NursingWorkItemResult"("createdAt");

ALTER TABLE "Study" ADD CONSTRAINT "Study_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Study" ADD CONSTRAINT "Study_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Study" ADD CONSTRAINT "Study_clinicalOrderId_fkey" FOREIGN KEY ("clinicalOrderId") REFERENCES "ClinicalOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Study" ADD CONSTRAINT "Study_workItemId_fkey" FOREIGN KEY ("workItemId") REFERENCES "VisitWorkItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Study" ADD CONSTRAINT "Study_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "InternalUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Study" ADD CONSTRAINT "Study_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "InternalUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "StudyAttachment" ADD CONSTRAINT "StudyAttachment_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "Study"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VitalSigns" ADD CONSTRAINT "VitalSigns_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VitalSigns" ADD CONSTRAINT "VitalSigns_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VitalSigns" ADD CONSTRAINT "VitalSigns_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "InternalUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "NursingApplication" ADD CONSTRAINT "NursingApplication_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NursingApplication" ADD CONSTRAINT "NursingApplication_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "NursingApplication" ADD CONSTRAINT "NursingApplication_clinicalOrderId_fkey" FOREIGN KEY ("clinicalOrderId") REFERENCES "ClinicalOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "NursingApplication" ADD CONSTRAINT "NursingApplication_workItemId_fkey" FOREIGN KEY ("workItemId") REFERENCES "VisitWorkItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "NursingApplication" ADD CONSTRAINT "NursingApplication_responsibleId_fkey" FOREIGN KEY ("responsibleId") REFERENCES "InternalUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "NursingNote" ADD CONSTRAINT "NursingNote_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NursingNote" ADD CONSTRAINT "NursingNote_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "NursingNote" ADD CONSTRAINT "NursingNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "InternalUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "NursingWorkItemResult" ADD CONSTRAINT "NursingWorkItemResult_workItemId_fkey" FOREIGN KEY ("workItemId") REFERENCES "VisitWorkItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NursingWorkItemResult" ADD CONSTRAINT "NursingWorkItemResult_clinicalOrderId_fkey" FOREIGN KEY ("clinicalOrderId") REFERENCES "ClinicalOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "NursingWorkItemResult" ADD CONSTRAINT "NursingWorkItemResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "InternalUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
