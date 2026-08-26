-- V3.1B patients, reception, visits and active patient route.

ALTER TYPE "InternalPermission" ADD VALUE IF NOT EXISTS 'patients_read';
ALTER TYPE "InternalPermission" ADD VALUE IF NOT EXISTS 'patients_create';
ALTER TYPE "InternalPermission" ADD VALUE IF NOT EXISTS 'patients_update';
ALTER TYPE "InternalPermission" ADD VALUE IF NOT EXISTS 'visits_read';
ALTER TYPE "InternalPermission" ADD VALUE IF NOT EXISTS 'visits_create';
ALTER TYPE "InternalPermission" ADD VALUE IF NOT EXISTS 'visits_update';
ALTER TYPE "InternalPermission" ADD VALUE IF NOT EXISTS 'patient_route_read';
ALTER TYPE "InternalPermission" ADD VALUE IF NOT EXISTS 'patient_route_update';

CREATE TYPE "PatientGender" AS ENUM (
  'female',
  'male',
  'other',
  'unknown'
);

CREATE TYPE "PatientStatus" AS ENUM (
  'active',
  'inactive',
  'archived'
);

CREATE TYPE "PatientCaptureSource" AS ENUM (
  'facebook_ads',
  'facebook_organic',
  'tiktok',
  'whatsapp',
  'referral',
  'previous_patient',
  'flyer',
  'website',
  'other'
);

CREATE TYPE "VisitStatus" AS ENUM (
  'in_reception',
  'in_consultation',
  'in_nursing',
  'in_administration',
  'completed',
  'left_without_care',
  'cancelled'
);

CREATE TYPE "PatientRouteArea" AS ENUM (
  'recepcion',
  'medico',
  'enfermeria',
  'administracion',
  'seguimiento',
  'cierre'
);

CREATE TYPE "VisitWorkItemStatus" AS ENUM (
  'pending',
  'acknowledged',
  'in_progress',
  'completed',
  'cancelled',
  'blocked'
);

CREATE TABLE "Patient" (
  "id" TEXT NOT NULL,
  "internalCode" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "secondaryPhone" TEXT,
  "birthDate" TIMESTAMP(3),
  "gender" "PatientGender" NOT NULL DEFAULT 'unknown',
  "city" TEXT,
  "department" TEXT,
  "address" TEXT,
  "captureSource" "PatientCaptureSource" NOT NULL DEFAULT 'other',
  "firstVisitAt" TIMESTAMP(3),
  "generalObservations" TEXT,
  "allergies" TEXT,
  "relevantHistory" TEXT,
  "status" "PatientStatus" NOT NULL DEFAULT 'active',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PatientContact" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "label" TEXT,
  "phone" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PatientContact_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PatientNote" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "userId" TEXT,
  "note" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PatientNote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Visit" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "status" "VisitStatus" NOT NULL DEFAULT 'in_reception',
  "reason" TEXT,
  "createdById" TEXT,
  "checkedInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Visit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VisitStatusHistory" (
  "id" TEXT NOT NULL,
  "visitId" TEXT NOT NULL,
  "userId" TEXT,
  "fromStatus" "VisitStatus",
  "toStatus" "VisitStatus" NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "VisitStatusHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReceptionCheckIn" (
  "id" TEXT NOT NULL,
  "visitId" TEXT NOT NULL,
  "userId" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ReceptionCheckIn_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PatientRoute" (
  "id" TEXT NOT NULL,
  "visitId" TEXT NOT NULL,
  "currentArea" "PatientRouteArea" NOT NULL DEFAULT 'recepcion',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PatientRoute_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PatientRouteStep" (
  "id" TEXT NOT NULL,
  "routeId" TEXT NOT NULL,
  "area" "PatientRouteArea" NOT NULL,
  "status" "VisitStatus" NOT NULL,
  "note" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" TIMESTAMP(3),

  CONSTRAINT "PatientRouteStep_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VisitWorkItem" (
  "id" TEXT NOT NULL,
  "visitId" TEXT NOT NULL,
  "createdById" TEXT,
  "area" "PatientRouteArea" NOT NULL,
  "status" "VisitWorkItemStatus" NOT NULL DEFAULT 'pending',
  "title" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),

  CONSTRAINT "VisitWorkItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Patient_internalCode_key" ON "Patient"("internalCode");
CREATE INDEX "Patient_fullName_idx" ON "Patient"("fullName");
CREATE INDEX "Patient_phone_idx" ON "Patient"("phone");
CREATE INDEX "Patient_status_idx" ON "Patient"("status");
CREATE INDEX "Patient_captureSource_idx" ON "Patient"("captureSource");
CREATE INDEX "Patient_createdAt_idx" ON "Patient"("createdAt");

CREATE INDEX "PatientContact_patientId_idx" ON "PatientContact"("patientId");
CREATE INDEX "PatientContact_phone_idx" ON "PatientContact"("phone");

CREATE INDEX "PatientNote_patientId_idx" ON "PatientNote"("patientId");
CREATE INDEX "PatientNote_userId_idx" ON "PatientNote"("userId");
CREATE INDEX "PatientNote_createdAt_idx" ON "PatientNote"("createdAt");

CREATE INDEX "Visit_patientId_idx" ON "Visit"("patientId");
CREATE INDEX "Visit_status_checkedInAt_idx" ON "Visit"("status", "checkedInAt");
CREATE INDEX "Visit_createdById_idx" ON "Visit"("createdById");
CREATE INDEX "Visit_checkedInAt_idx" ON "Visit"("checkedInAt");

CREATE INDEX "VisitStatusHistory_visitId_idx" ON "VisitStatusHistory"("visitId");
CREATE INDEX "VisitStatusHistory_userId_idx" ON "VisitStatusHistory"("userId");
CREATE INDEX "VisitStatusHistory_createdAt_idx" ON "VisitStatusHistory"("createdAt");

CREATE UNIQUE INDEX "ReceptionCheckIn_visitId_key" ON "ReceptionCheckIn"("visitId");
CREATE INDEX "ReceptionCheckIn_userId_idx" ON "ReceptionCheckIn"("userId");

CREATE UNIQUE INDEX "PatientRoute_visitId_key" ON "PatientRoute"("visitId");
CREATE INDEX "PatientRoute_currentArea_idx" ON "PatientRoute"("currentArea");
CREATE INDEX "PatientRoute_active_idx" ON "PatientRoute"("active");

CREATE INDEX "PatientRouteStep_routeId_idx" ON "PatientRouteStep"("routeId");
CREATE INDEX "PatientRouteStep_area_idx" ON "PatientRouteStep"("area");
CREATE INDEX "PatientRouteStep_startedAt_idx" ON "PatientRouteStep"("startedAt");

CREATE INDEX "VisitWorkItem_visitId_idx" ON "VisitWorkItem"("visitId");
CREATE INDEX "VisitWorkItem_createdById_idx" ON "VisitWorkItem"("createdById");
CREATE INDEX "VisitWorkItem_area_status_idx" ON "VisitWorkItem"("area", "status");
CREATE INDEX "VisitWorkItem_createdAt_idx" ON "VisitWorkItem"("createdAt");

CREATE INDEX "Lead_convertedPatientId_idx" ON "Lead"("convertedPatientId");

ALTER TABLE "Lead"
  ADD CONSTRAINT "Lead_convertedPatientId_fkey"
  FOREIGN KEY ("convertedPatientId") REFERENCES "Patient"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PatientContact"
  ADD CONSTRAINT "PatientContact_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "Patient"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PatientNote"
  ADD CONSTRAINT "PatientNote_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "Patient"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PatientNote"
  ADD CONSTRAINT "PatientNote_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "InternalUser"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Visit"
  ADD CONSTRAINT "Visit_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "Patient"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Visit"
  ADD CONSTRAINT "Visit_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "InternalUser"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "VisitStatusHistory"
  ADD CONSTRAINT "VisitStatusHistory_visitId_fkey"
  FOREIGN KEY ("visitId") REFERENCES "Visit"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VisitStatusHistory"
  ADD CONSTRAINT "VisitStatusHistory_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "InternalUser"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ReceptionCheckIn"
  ADD CONSTRAINT "ReceptionCheckIn_visitId_fkey"
  FOREIGN KEY ("visitId") REFERENCES "Visit"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReceptionCheckIn"
  ADD CONSTRAINT "ReceptionCheckIn_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "InternalUser"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PatientRoute"
  ADD CONSTRAINT "PatientRoute_visitId_fkey"
  FOREIGN KEY ("visitId") REFERENCES "Visit"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PatientRouteStep"
  ADD CONSTRAINT "PatientRouteStep_routeId_fkey"
  FOREIGN KEY ("routeId") REFERENCES "PatientRoute"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VisitWorkItem"
  ADD CONSTRAINT "VisitWorkItem_visitId_fkey"
  FOREIGN KEY ("visitId") REFERENCES "Visit"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VisitWorkItem"
  ADD CONSTRAINT "VisitWorkItem_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "InternalUser"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
