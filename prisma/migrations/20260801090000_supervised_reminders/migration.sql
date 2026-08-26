ALTER TYPE "InternalPermission" ADD VALUE IF NOT EXISTS 'reminder_rules_manage';
ALTER TYPE "InternalPermission" ADD VALUE IF NOT EXISTS 'reminders_review';

CREATE TYPE "SupervisedReminderEvent" AS ENUM (
    'visit_completed',
    'treatment_accepted',
    'visit_discontinued'
);

CREATE TYPE "SupervisedReminderChannel" AS ENUM ('call', 'whatsapp');

CREATE TYPE "SupervisedReminderCandidateStatus" AS ENUM (
    'pending_review',
    'approved',
    'blocked',
    'dismissed',
    'failed'
);

CREATE TYPE "SupervisedReminderReviewResult" AS ENUM (
    'approved',
    'blocked',
    'dismissed',
    'failed',
    'retry_scheduled'
);

CREATE TABLE "SupervisedReminderRule" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "activeVersionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupervisedReminderRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupervisedReminderRuleVersion" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "event" "SupervisedReminderEvent" NOT NULL,
    "followUpType" "FollowUpType" NOT NULL,
    "channel" "SupervisedReminderChannel" NOT NULL,
    "templateBody" TEXT NOT NULL,
    "delayDays" INTEGER NOT NULL DEFAULT 1,
    "lookbackDays" INTEGER NOT NULL DEFAULT 30,
    "windowStartMinute" INTEGER NOT NULL DEFAULT 540,
    "windowEndMinute" INTEGER NOT NULL DEFAULT 1080,
    "weekdays" INTEGER[] NOT NULL DEFAULT ARRAY[1, 2, 3, 4, 5, 6],
    "ownerId" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupervisedReminderRuleVersion_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SupervisedReminderRuleVersion_delayDays_check"
      CHECK ("delayDays" BETWEEN 0 AND 90),
    CONSTRAINT "SupervisedReminderRuleVersion_lookbackDays_check"
      CHECK ("lookbackDays" BETWEEN 1 AND 90),
    CONSTRAINT "SupervisedReminderRuleVersion_window_check"
      CHECK (
        "windowStartMinute" BETWEEN 0 AND 1439
        AND "windowEndMinute" BETWEEN 0 AND 1439
        AND "windowStartMinute" < "windowEndMinute"
      ),
    CONSTRAINT "SupervisedReminderRuleVersion_weekdays_check"
      CHECK (
        cardinality("weekdays") BETWEEN 1 AND 7
        AND "weekdays" <@ ARRAY[0, 1, 2, 3, 4, 5, 6]
      ),
    CONSTRAINT "SupervisedReminderRuleVersion_event_type_check"
      CHECK (
        ("event" = 'visit_completed' AND "followUpType" = 'evolution')
        OR ("event" = 'treatment_accepted' AND "followUpType" = 'return')
        OR ("event" = 'visit_discontinued' AND "followUpType" = 'treatment_recovery')
      )
);

CREATE TABLE "SupervisedReminderCandidate" (
    "id" TEXT NOT NULL,
    "deduplicationKey" TEXT NOT NULL,
    "ruleVersionId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "visitId" TEXT,
    "sourceEvent" "SupervisedReminderEvent" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceOccurredAt" TIMESTAMP(3) NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "channel" "SupervisedReminderChannel" NOT NULL,
    "renderedBody" TEXT NOT NULL,
    "status" "SupervisedReminderCandidateStatus" NOT NULL DEFAULT 'pending_review',
    "blockReason" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "retryAt" TIMESTAMP(3),
    "lastErrorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupervisedReminderCandidate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupervisedReminderReviewEvent" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "userId" TEXT,
    "result" "SupervisedReminderReviewResult" NOT NULL,
    "note" TEXT,
    "errorCode" TEXT,
    "retryAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupervisedReminderReviewEvent_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "FollowUpTask"
ADD COLUMN "supervisedReminderCandidateId" TEXT;

CREATE UNIQUE INDEX "SupervisedReminderRule_key_key"
ON "SupervisedReminderRule"("key");
CREATE UNIQUE INDEX "SupervisedReminderRule_activeVersionId_key"
ON "SupervisedReminderRule"("activeVersionId");
CREATE INDEX "SupervisedReminderRule_createdAt_idx"
ON "SupervisedReminderRule"("createdAt");

CREATE UNIQUE INDEX "SupervisedReminderRuleVersion_ruleId_version_key"
ON "SupervisedReminderRuleVersion"("ruleId", "version");
CREATE INDEX "SupervisedReminderRuleVersion_event_enabled_createdAt_idx"
ON "SupervisedReminderRuleVersion"("event", "enabled", "createdAt");
CREATE INDEX "SupervisedReminderRuleVersion_ownerId_idx"
ON "SupervisedReminderRuleVersion"("ownerId");

CREATE UNIQUE INDEX "SupervisedReminderCandidate_deduplicationKey_key"
ON "SupervisedReminderCandidate"("deduplicationKey");
CREATE INDEX "SupervisedReminderCandidate_status_scheduledFor_idx"
ON "SupervisedReminderCandidate"("status", "scheduledFor");
CREATE INDEX "SupervisedReminderCandidate_patientId_createdAt_idx"
ON "SupervisedReminderCandidate"("patientId", "createdAt");
CREATE INDEX "SupervisedReminderCandidate_visitId_createdAt_idx"
ON "SupervisedReminderCandidate"("visitId", "createdAt");
CREATE INDEX "SupervisedReminderCandidate_sourceEvent_sourceOccurredAt_idx"
ON "SupervisedReminderCandidate"("sourceEvent", "sourceOccurredAt");
CREATE INDEX "SupervisedReminderCandidate_ruleVersionId_idx"
ON "SupervisedReminderCandidate"("ruleVersionId");

CREATE INDEX "SupervisedReminderReviewEvent_candidateId_createdAt_idx"
ON "SupervisedReminderReviewEvent"("candidateId", "createdAt");
CREATE INDEX "SupervisedReminderReviewEvent_result_createdAt_idx"
ON "SupervisedReminderReviewEvent"("result", "createdAt");
CREATE INDEX "SupervisedReminderReviewEvent_userId_createdAt_idx"
ON "SupervisedReminderReviewEvent"("userId", "createdAt");

CREATE UNIQUE INDEX "FollowUpTask_supervisedReminderCandidateId_key"
ON "FollowUpTask"("supervisedReminderCandidateId");

ALTER TABLE "SupervisedReminderRuleVersion"
ADD CONSTRAINT "SupervisedReminderRuleVersion_ruleId_fkey"
FOREIGN KEY ("ruleId") REFERENCES "SupervisedReminderRule"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SupervisedReminderRuleVersion"
ADD CONSTRAINT "SupervisedReminderRuleVersion_ownerId_fkey"
FOREIGN KEY ("ownerId") REFERENCES "InternalUser"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SupervisedReminderRuleVersion"
ADD CONSTRAINT "SupervisedReminderRuleVersion_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "InternalUser"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SupervisedReminderRule"
ADD CONSTRAINT "SupervisedReminderRule_activeVersionId_fkey"
FOREIGN KEY ("activeVersionId") REFERENCES "SupervisedReminderRuleVersion"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SupervisedReminderCandidate"
ADD CONSTRAINT "SupervisedReminderCandidate_ruleVersionId_fkey"
FOREIGN KEY ("ruleVersionId") REFERENCES "SupervisedReminderRuleVersion"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SupervisedReminderCandidate"
ADD CONSTRAINT "SupervisedReminderCandidate_patientId_fkey"
FOREIGN KEY ("patientId") REFERENCES "Patient"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SupervisedReminderCandidate"
ADD CONSTRAINT "SupervisedReminderCandidate_visitId_fkey"
FOREIGN KEY ("visitId") REFERENCES "Visit"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SupervisedReminderCandidate"
ADD CONSTRAINT "SupervisedReminderCandidate_reviewedById_fkey"
FOREIGN KEY ("reviewedById") REFERENCES "InternalUser"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FollowUpTask"
ADD CONSTRAINT "FollowUpTask_supervisedReminderCandidateId_fkey"
FOREIGN KEY ("supervisedReminderCandidateId")
REFERENCES "SupervisedReminderCandidate"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SupervisedReminderReviewEvent"
ADD CONSTRAINT "SupervisedReminderReviewEvent_candidateId_fkey"
FOREIGN KEY ("candidateId") REFERENCES "SupervisedReminderCandidate"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SupervisedReminderReviewEvent"
ADD CONSTRAINT "SupervisedReminderReviewEvent_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "InternalUser"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION "reject_supervised_reminder_version_mutation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'SupervisedReminderRuleVersion is append-only: % is not allowed', TG_OP
    USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER "SupervisedReminderRuleVersion_prevent_update_delete"
BEFORE UPDATE OR DELETE ON "SupervisedReminderRuleVersion"
FOR EACH ROW
EXECUTE FUNCTION "reject_supervised_reminder_version_mutation"();

CREATE OR REPLACE FUNCTION "reject_supervised_reminder_review_mutation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'SupervisedReminderReviewEvent is append-only: % is not allowed', TG_OP
    USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER "SupervisedReminderReviewEvent_prevent_update_delete"
BEFORE UPDATE OR DELETE ON "SupervisedReminderReviewEvent"
FOR EACH ROW
EXECUTE FUNCTION "reject_supervised_reminder_review_mutation"();
