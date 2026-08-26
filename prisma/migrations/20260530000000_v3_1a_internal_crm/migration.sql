-- V3.1A internal CRM and auth foundation.

CREATE TYPE "InternalRole" AS ENUM (
  'super_admin',
  'direccion',
  'medico',
  'recepcion',
  'captacion',
  'administracion',
  'enfermeria'
);

CREATE TYPE "InternalPermission" AS ENUM (
  'internal_access',
  'leads_read',
  'leads_create',
  'leads_update',
  'leads_contact',
  'leads_reminder',
  'reports_read'
);

CREATE TYPE "InternalLeadSource" AS ENUM (
  'website',
  'whatsapp',
  'facebook_ads',
  'facebook_organic',
  'tiktok',
  'google',
  'call',
  'referral',
  'previous_patient',
  'flyer',
  'other'
);

CREATE TYPE "InternalLeadStatus" AS ENUM (
  'new',
  'contacted',
  'interested',
  'wants_visit',
  'reminder_pending',
  'confirmed_attendance',
  'no_answer',
  'discarded',
  'converted_to_patient'
);

CREATE TYPE "InternalLeadContactMethod" AS ENUM (
  'call',
  'whatsapp',
  'in_person',
  'other'
);

CREATE TYPE "InternalLeadContactResult" AS ENUM (
  'contacted',
  'no_answer',
  'interested',
  'wants_visit',
  'confirmed_attendance',
  'discarded',
  'follow_up_required'
);

CREATE TYPE "InternalLeadReminderStatus" AS ENUM (
  'pending',
  'completed',
  'cancelled'
);

CREATE TABLE "InternalUser" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT,
  "passwordHash" TEXT NOT NULL,
  "role" "InternalRole" NOT NULL DEFAULT 'captacion',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "lastLoginAt" TIMESTAMP(3),
  "failedAttempts" INTEGER NOT NULL DEFAULT 0,
  "lockedUntil" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "InternalUser_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InternalSession" (
  "id" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "InternalSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Lead" (
  "id" TEXT NOT NULL,
  "name" TEXT,
  "phone" TEXT NOT NULL,
  "email" TEXT,
  "city" TEXT,
  "symptoms" TEXT,
  "intentionToVisit" TEXT,
  "estimatedVisitDate" TIMESTAMP(3),
  "commercialNotes" TEXT,
  "source" "InternalLeadSource" NOT NULL DEFAULT 'website',
  "status" "InternalLeadStatus" NOT NULL DEFAULT 'new',
  "pagePath" TEXT,
  "assignedToId" TEXT,
  "convertedPatientId" TEXT,
  "firstContactedAt" TIMESTAMP(3),
  "lastContactedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LeadContactAttempt" (
  "id" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "userId" TEXT,
  "method" "InternalLeadContactMethod" NOT NULL DEFAULT 'call',
  "result" "InternalLeadContactResult" NOT NULL,
  "notes" TEXT,
  "contactedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "LeadContactAttempt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LeadReminder" (
  "id" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "userId" TEXT,
  "dueAt" TIMESTAMP(3) NOT NULL,
  "note" TEXT,
  "status" "InternalLeadReminderStatus" NOT NULL DEFAULT 'pending',
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "LeadReminder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LeadStatusHistory" (
  "id" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "userId" TEXT,
  "fromStatus" "InternalLeadStatus",
  "toStatus" "InternalLeadStatus" NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "LeadStatusHistory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InternalUser_email_key" ON "InternalUser"("email");
CREATE INDEX "InternalUser_role_idx" ON "InternalUser"("role");
CREATE INDEX "InternalUser_active_idx" ON "InternalUser"("active");

CREATE UNIQUE INDEX "InternalSession_tokenHash_key" ON "InternalSession"("tokenHash");
CREATE INDEX "InternalSession_userId_idx" ON "InternalSession"("userId");
CREATE INDEX "InternalSession_expiresAt_idx" ON "InternalSession"("expiresAt");

CREATE INDEX "Lead_createdAt_idx" ON "Lead"("createdAt");
CREATE INDEX "Lead_phone_idx" ON "Lead"("phone");
CREATE INDEX "Lead_status_createdAt_idx" ON "Lead"("status", "createdAt");
CREATE INDEX "Lead_source_idx" ON "Lead"("source");
CREATE INDEX "Lead_assignedToId_idx" ON "Lead"("assignedToId");

CREATE INDEX "LeadContactAttempt_leadId_idx" ON "LeadContactAttempt"("leadId");
CREATE INDEX "LeadContactAttempt_userId_idx" ON "LeadContactAttempt"("userId");
CREATE INDEX "LeadContactAttempt_contactedAt_idx" ON "LeadContactAttempt"("contactedAt");

CREATE INDEX "LeadReminder_leadId_idx" ON "LeadReminder"("leadId");
CREATE INDEX "LeadReminder_userId_idx" ON "LeadReminder"("userId");
CREATE INDEX "LeadReminder_status_dueAt_idx" ON "LeadReminder"("status", "dueAt");

CREATE INDEX "LeadStatusHistory_leadId_idx" ON "LeadStatusHistory"("leadId");
CREATE INDEX "LeadStatusHistory_userId_idx" ON "LeadStatusHistory"("userId");
CREATE INDEX "LeadStatusHistory_createdAt_idx" ON "LeadStatusHistory"("createdAt");

ALTER TABLE "InternalSession"
  ADD CONSTRAINT "InternalSession_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "InternalUser"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Lead"
  ADD CONSTRAINT "Lead_assignedToId_fkey"
  FOREIGN KEY ("assignedToId") REFERENCES "InternalUser"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LeadContactAttempt"
  ADD CONSTRAINT "LeadContactAttempt_leadId_fkey"
  FOREIGN KEY ("leadId") REFERENCES "Lead"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LeadContactAttempt"
  ADD CONSTRAINT "LeadContactAttempt_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "InternalUser"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LeadReminder"
  ADD CONSTRAINT "LeadReminder_leadId_fkey"
  FOREIGN KEY ("leadId") REFERENCES "Lead"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LeadReminder"
  ADD CONSTRAINT "LeadReminder_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "InternalUser"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LeadStatusHistory"
  ADD CONSTRAINT "LeadStatusHistory_leadId_fkey"
  FOREIGN KEY ("leadId") REFERENCES "Lead"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LeadStatusHistory"
  ADD CONSTRAINT "LeadStatusHistory_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "InternalUser"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
