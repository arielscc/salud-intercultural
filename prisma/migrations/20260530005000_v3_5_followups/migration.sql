-- V3.5 follow-up tasks, attempts, status history and templates.

ALTER TYPE "InternalPermission" ADD VALUE IF NOT EXISTS 'followups_read';
ALTER TYPE "InternalPermission" ADD VALUE IF NOT EXISTS 'followups_write';

CREATE TYPE "FollowUpStatus" AS ENUM (
  'pending',
  'done',
  'improved',
  'not_improved',
  'no_answer',
  'wants_return',
  'requires_new_visit',
  'requires_doctor_call',
  'cancelled'
);

CREATE TYPE "FollowUpAttemptMethod" AS ENUM ('call', 'whatsapp', 'in_person', 'other');

CREATE TABLE "FollowUpTask" (
  "id" TEXT NOT NULL,
  "leadId" TEXT,
  "patientId" TEXT,
  "visitId" TEXT,
  "saleId" TEXT,
  "clinicalOrderId" TEXT,
  "workItemId" TEXT,
  "assignedToId" TEXT,
  "createdById" TEXT,
  "status" "FollowUpStatus" NOT NULL DEFAULT 'pending',
  "title" TEXT NOT NULL,
  "notes" TEXT,
  "dueAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "FollowUpTask_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FollowUpAttempt" (
  "id" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "userId" TEXT,
  "method" "FollowUpAttemptMethod" NOT NULL DEFAULT 'call',
  "result" "FollowUpStatus" NOT NULL,
  "notes" TEXT,
  "contactedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "FollowUpAttempt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FollowUpStatusHistory" (
  "id" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "userId" TEXT,
  "fromStatus" "FollowUpStatus",
  "toStatus" "FollowUpStatus" NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "FollowUpStatusHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FollowUpTemplate" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "FollowUpTemplate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FollowUpTask_leadId_idx" ON "FollowUpTask"("leadId");
CREATE INDEX "FollowUpTask_patientId_idx" ON "FollowUpTask"("patientId");
CREATE INDEX "FollowUpTask_visitId_idx" ON "FollowUpTask"("visitId");
CREATE INDEX "FollowUpTask_saleId_idx" ON "FollowUpTask"("saleId");
CREATE INDEX "FollowUpTask_clinicalOrderId_idx" ON "FollowUpTask"("clinicalOrderId");
CREATE INDEX "FollowUpTask_workItemId_idx" ON "FollowUpTask"("workItemId");
CREATE INDEX "FollowUpTask_assignedToId_idx" ON "FollowUpTask"("assignedToId");
CREATE INDEX "FollowUpTask_createdById_idx" ON "FollowUpTask"("createdById");
CREATE INDEX "FollowUpTask_status_dueAt_idx" ON "FollowUpTask"("status", "dueAt");
CREATE INDEX "FollowUpTask_createdAt_idx" ON "FollowUpTask"("createdAt");
CREATE INDEX "FollowUpAttempt_taskId_idx" ON "FollowUpAttempt"("taskId");
CREATE INDEX "FollowUpAttempt_userId_idx" ON "FollowUpAttempt"("userId");
CREATE INDEX "FollowUpAttempt_result_idx" ON "FollowUpAttempt"("result");
CREATE INDEX "FollowUpAttempt_contactedAt_idx" ON "FollowUpAttempt"("contactedAt");
CREATE INDEX "FollowUpStatusHistory_taskId_idx" ON "FollowUpStatusHistory"("taskId");
CREATE INDEX "FollowUpStatusHistory_userId_idx" ON "FollowUpStatusHistory"("userId");
CREATE INDEX "FollowUpStatusHistory_createdAt_idx" ON "FollowUpStatusHistory"("createdAt");
CREATE INDEX "FollowUpTemplate_active_idx" ON "FollowUpTemplate"("active");

ALTER TABLE "FollowUpTask" ADD CONSTRAINT "FollowUpTask_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FollowUpTask" ADD CONSTRAINT "FollowUpTask_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FollowUpTask" ADD CONSTRAINT "FollowUpTask_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FollowUpTask" ADD CONSTRAINT "FollowUpTask_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FollowUpTask" ADD CONSTRAINT "FollowUpTask_clinicalOrderId_fkey" FOREIGN KEY ("clinicalOrderId") REFERENCES "ClinicalOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FollowUpTask" ADD CONSTRAINT "FollowUpTask_workItemId_fkey" FOREIGN KEY ("workItemId") REFERENCES "VisitWorkItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FollowUpTask" ADD CONSTRAINT "FollowUpTask_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "InternalUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FollowUpTask" ADD CONSTRAINT "FollowUpTask_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "InternalUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FollowUpAttempt" ADD CONSTRAINT "FollowUpAttempt_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "FollowUpTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FollowUpAttempt" ADD CONSTRAINT "FollowUpAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "InternalUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FollowUpStatusHistory" ADD CONSTRAINT "FollowUpStatusHistory_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "FollowUpTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FollowUpStatusHistory" ADD CONSTRAINT "FollowUpStatusHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "InternalUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "FollowUpTemplate" ("id", "title", "body", "active", "createdAt") VALUES
  ('fut_post_consultation', 'Seguimiento post consulta', 'Consultar evolución, adherencia a indicaciones y necesidad de retorno.', true, CURRENT_TIMESTAMP),
  ('fut_post_sale', 'Seguimiento post venta', 'Confirmar uso correcto, tolerancia y próxima necesidad del paciente.', true, CURRENT_TIMESTAMP),
  ('fut_no_answer', 'Reintento sin respuesta', 'Reintentar contacto y registrar resultado.', true, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
