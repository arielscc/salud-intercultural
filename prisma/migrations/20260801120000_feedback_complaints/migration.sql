ALTER TYPE "InternalPermission" ADD VALUE IF NOT EXISTS 'feedback_read';
ALTER TYPE "InternalPermission" ADD VALUE IF NOT EXISTS 'feedback_manage';
ALTER TYPE "PatientConsentPurpose" ADD VALUE IF NOT EXISTS 'feedback';

CREATE TYPE "FeedbackRequestStatus" AS ENUM ('open', 'submitted', 'cancelled');
CREATE TYPE "FeedbackDeliveryChannel" AS ENUM ('in_person', 'whatsapp');
CREATE TYPE "PatientFeedbackKind" AS ENUM ('survey', 'comment', 'complaint');
CREATE TYPE "PatientFeedbackArea" AS ENUM (
    'reception',
    'clinical_care',
    'nursing',
    'administration',
    'communication',
    'facilities',
    'other'
);
CREATE TYPE "FeedbackClassification" AS ENUM ('general', 'service', 'clinical_safety');
CREATE TYPE "FeedbackSeverity" AS ENUM ('standard', 'priority', 'critical');
CREATE TYPE "FeedbackCaseStatus" AS ENUM (
    'new',
    'reviewing',
    'awaiting_patient',
    'resolved',
    'closed'
);
CREATE TYPE "FeedbackCaseEventType" AS ENUM (
    'submitted',
    'assigned',
    'classified',
    'status_changed',
    'note',
    'deadline_changed'
);

CREATE TABLE "PatientFeedbackRequest" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdById" TEXT,
    "tokenHash" TEXT NOT NULL,
    "status" "FeedbackRequestStatus" NOT NULL DEFAULT 'open',
    "deliveryChannel" "FeedbackDeliveryChannel" NOT NULL DEFAULT 'in_person',
    "questionnaireVersion" TEXT NOT NULL DEFAULT 'v1',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientFeedbackRequest_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PatientFeedbackRequest_status_dates_check" CHECK (
      ("status" = 'open' AND "submittedAt" IS NULL AND "cancelledAt" IS NULL)
      OR ("status" = 'submitted' AND "submittedAt" IS NOT NULL AND "cancelledAt" IS NULL)
      OR ("status" = 'cancelled' AND "submittedAt" IS NULL AND "cancelledAt" IS NOT NULL)
    )
);

CREATE TABLE "PatientFeedback" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "kind" "PatientFeedbackKind" NOT NULL,
    "area" "PatientFeedbackArea" NOT NULL,
    "comment" TEXT,
    "healthRiskFlag" BOOLEAN NOT NULL DEFAULT false,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatientFeedback_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PatientFeedback_rating_check" CHECK ("rating" BETWEEN 1 AND 5),
    CONSTRAINT "PatientFeedback_complaint_comment_check" CHECK (
      "kind" <> 'complaint' OR length(trim(COALESCE("comment", ''))) >= 10
    ),
    CONSTRAINT "PatientFeedback_health_risk_check" CHECK (
      NOT "healthRiskFlag" OR "kind" = 'complaint'
    )
);

CREATE TABLE "PatientFeedbackCase" (
    "id" TEXT NOT NULL,
    "feedbackId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "classification" "FeedbackClassification" NOT NULL,
    "severity" "FeedbackSeverity" NOT NULL,
    "status" "FeedbackCaseStatus" NOT NULL DEFAULT 'new',
    "responseDueAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientFeedbackCase_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PatientFeedbackCase_deadline_check" CHECK (
      "status" IN ('resolved', 'closed') OR "responseDueAt" IS NOT NULL
    ),
    CONSTRAINT "PatientFeedbackCase_resolved_check" CHECK (
      ("status" IN ('resolved', 'closed') AND "resolvedAt" IS NOT NULL)
      OR ("status" NOT IN ('resolved', 'closed') AND "resolvedAt" IS NULL)
    )
);

CREATE TABLE "PatientFeedbackCaseEvent" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "actorId" TEXT,
    "type" "FeedbackCaseEventType" NOT NULL,
    "fromStatus" "FeedbackCaseStatus",
    "toStatus" "FeedbackCaseStatus",
    "fromClassification" "FeedbackClassification",
    "toClassification" "FeedbackClassification",
    "fromSeverity" "FeedbackSeverity",
    "toSeverity" "FeedbackSeverity",
    "fromOwnerId" TEXT,
    "toOwnerId" TEXT,
    "responseDueAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatientFeedbackCaseEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PatientFeedbackRequest_tokenHash_key"
ON "PatientFeedbackRequest"("tokenHash");
CREATE UNIQUE INDEX "PatientFeedbackRequest_one_open_per_visit_key"
ON "PatientFeedbackRequest"("visitId") WHERE "status" = 'open';
CREATE INDEX "PatientFeedbackRequest_status_expiresAt_idx"
ON "PatientFeedbackRequest"("status", "expiresAt");
CREATE INDEX "PatientFeedbackRequest_patientId_createdAt_idx"
ON "PatientFeedbackRequest"("patientId", "createdAt");
CREATE INDEX "PatientFeedbackRequest_visitId_status_idx"
ON "PatientFeedbackRequest"("visitId", "status");
CREATE INDEX "PatientFeedbackRequest_ownerId_status_idx"
ON "PatientFeedbackRequest"("ownerId", "status");

CREATE UNIQUE INDEX "PatientFeedback_requestId_key" ON "PatientFeedback"("requestId");
CREATE UNIQUE INDEX "PatientFeedback_visitId_key" ON "PatientFeedback"("visitId");
CREATE INDEX "PatientFeedback_kind_submittedAt_idx" ON "PatientFeedback"("kind", "submittedAt");
CREATE INDEX "PatientFeedback_area_submittedAt_idx" ON "PatientFeedback"("area", "submittedAt");
CREATE INDEX "PatientFeedback_rating_submittedAt_idx" ON "PatientFeedback"("rating", "submittedAt");
CREATE INDEX "PatientFeedback_patientId_submittedAt_idx" ON "PatientFeedback"("patientId", "submittedAt");

CREATE UNIQUE INDEX "PatientFeedbackCase_feedbackId_key" ON "PatientFeedbackCase"("feedbackId");
CREATE INDEX "PatientFeedbackCase_status_responseDueAt_idx" ON "PatientFeedbackCase"("status", "responseDueAt");
CREATE INDEX "PatientFeedbackCase_severity_status_createdAt_idx" ON "PatientFeedbackCase"("severity", "status", "createdAt");
CREATE INDEX "PatientFeedbackCase_classification_createdAt_idx" ON "PatientFeedbackCase"("classification", "createdAt");
CREATE INDEX "PatientFeedbackCase_ownerId_status_idx" ON "PatientFeedbackCase"("ownerId", "status");

CREATE INDEX "PatientFeedbackCaseEvent_caseId_createdAt_idx" ON "PatientFeedbackCaseEvent"("caseId", "createdAt");
CREATE INDEX "PatientFeedbackCaseEvent_actorId_createdAt_idx" ON "PatientFeedbackCaseEvent"("actorId", "createdAt");
CREATE INDEX "PatientFeedbackCaseEvent_type_createdAt_idx" ON "PatientFeedbackCaseEvent"("type", "createdAt");

ALTER TABLE "PatientFeedbackRequest" ADD CONSTRAINT "PatientFeedbackRequest_patientId_fkey"
FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientFeedbackRequest" ADD CONSTRAINT "PatientFeedbackRequest_visitId_fkey"
FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientFeedbackRequest" ADD CONSTRAINT "PatientFeedbackRequest_ownerId_fkey"
FOREIGN KEY ("ownerId") REFERENCES "InternalUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientFeedbackRequest" ADD CONSTRAINT "PatientFeedbackRequest_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "InternalUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PatientFeedback" ADD CONSTRAINT "PatientFeedback_requestId_fkey"
FOREIGN KEY ("requestId") REFERENCES "PatientFeedbackRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientFeedback" ADD CONSTRAINT "PatientFeedback_patientId_fkey"
FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientFeedback" ADD CONSTRAINT "PatientFeedback_visitId_fkey"
FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PatientFeedbackCase" ADD CONSTRAINT "PatientFeedbackCase_feedbackId_fkey"
FOREIGN KEY ("feedbackId") REFERENCES "PatientFeedback"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientFeedbackCase" ADD CONSTRAINT "PatientFeedbackCase_ownerId_fkey"
FOREIGN KEY ("ownerId") REFERENCES "InternalUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PatientFeedbackCaseEvent" ADD CONSTRAINT "PatientFeedbackCaseEvent_caseId_fkey"
FOREIGN KEY ("caseId") REFERENCES "PatientFeedbackCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientFeedbackCaseEvent" ADD CONSTRAINT "PatientFeedbackCaseEvent_actorId_fkey"
FOREIGN KEY ("actorId") REFERENCES "InternalUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION "reject_patient_feedback_mutation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'PatientFeedback is append-only: % is not allowed', TG_OP
    USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER "PatientFeedback_prevent_update_delete"
BEFORE UPDATE OR DELETE ON "PatientFeedback"
FOR EACH ROW
EXECUTE FUNCTION "reject_patient_feedback_mutation"();

CREATE OR REPLACE FUNCTION "reject_patient_feedback_case_event_mutation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'PatientFeedbackCaseEvent is append-only: % is not allowed', TG_OP
    USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER "PatientFeedbackCaseEvent_prevent_update_delete"
BEFORE UPDATE OR DELETE ON "PatientFeedbackCaseEvent"
FOR EACH ROW
EXECUTE FUNCTION "reject_patient_feedback_case_event_mutation"();
