-- Tarea 13, fase expansiva. Materializa la sede en continuidad y opiniones sin
-- inventar una sede para plantillas huérfanas. El endurecimiento posterior se
-- detiene mientras el reconciliador encuentre nulos o cruces.

ALTER TABLE "FollowUpAttempt" ADD COLUMN "branchCode" TEXT;
ALTER TABLE "FollowUpStatusHistory" ADD COLUMN "branchCode" TEXT;
ALTER TABLE "FollowUpTemplate" ADD COLUMN "branchCode" TEXT;
ALTER TABLE "SupervisedReminderRuleVersion" ADD COLUMN "branchCode" TEXT;
ALTER TABLE "SupervisedReminderCandidate" ADD COLUMN "branchCode" TEXT;
ALTER TABLE "SupervisedReminderReviewEvent" ADD COLUMN "branchCode" TEXT;
ALTER TABLE "PatientFeedbackRequest" ADD COLUMN "branchCode" TEXT;
ALTER TABLE "PatientFeedback" ADD COLUMN "branchCode" TEXT;
ALTER TABLE "PatientFeedbackCase" ADD COLUMN "branchCode" TEXT;
ALTER TABLE "PatientFeedbackCaseEvent" ADD COLUMN "branchCode" TEXT;

-- Las cuatro tablas son append-only para la aplicación. Se desactiva el
-- trigger únicamente durante este backfill determinista y se restaura abajo.
DROP TRIGGER IF EXISTS "SupervisedReminderRuleVersion_prevent_update_delete"
  ON "SupervisedReminderRuleVersion";
DROP TRIGGER IF EXISTS "SupervisedReminderReviewEvent_prevent_update_delete"
  ON "SupervisedReminderReviewEvent";
DROP TRIGGER IF EXISTS "PatientFeedback_prevent_update_delete"
  ON "PatientFeedback";
DROP TRIGGER IF EXISTS "PatientFeedbackCaseEvent_prevent_update_delete"
  ON "PatientFeedbackCaseEvent";

UPDATE "FollowUpAttempt" child
SET "branchCode" = parent."branchCode"
FROM "FollowUpTask" parent
WHERE parent."id" = child."taskId";

UPDATE "FollowUpStatusHistory" child
SET "branchCode" = parent."branchCode"
FROM "FollowUpTask" parent
WHERE parent."id" = child."taskId";

UPDATE "SupervisedReminderRuleVersion" child
SET "branchCode" = parent."branchCode"
FROM "SupervisedReminderRule" parent
WHERE parent."id" = child."ruleId";

UPDATE "SupervisedReminderCandidate" child
SET "branchCode" = parent."branchCode"
FROM "SupervisedReminderRuleVersion" parent
WHERE parent."id" = child."ruleVersionId";

-- La sede forma parte de la identidad idempotente. Se conserva el resto de la
-- clave histórica y se evita redescubrir el mismo evento tras el despliegue.
UPDATE "SupervisedReminderCandidate"
SET "deduplicationKey" = "branchCode" || ':' || "deduplicationKey"
WHERE "branchCode" IS NOT NULL
  AND "deduplicationKey" NOT LIKE "branchCode" || ':%';

UPDATE "SupervisedReminderReviewEvent" child
SET "branchCode" = parent."branchCode"
FROM "SupervisedReminderCandidate" parent
WHERE parent."id" = child."candidateId";

UPDATE "PatientFeedbackRequest" child
SET "branchCode" = parent."branchCode"
FROM "Visit" parent
WHERE parent."id" = child."visitId";

UPDATE "PatientFeedback" child
SET "branchCode" = parent."branchCode"
FROM "PatientFeedbackRequest" parent
WHERE parent."id" = child."requestId";

UPDATE "PatientFeedbackCase" child
SET "branchCode" = parent."branchCode"
FROM "PatientFeedback" parent
WHERE parent."id" = child."feedbackId";

UPDATE "PatientFeedbackCaseEvent" child
SET "branchCode" = parent."branchCode"
FROM "PatientFeedbackCase" parent
WHERE parent."id" = child."caseId";

-- Estas tres plantillas son el conjunto cerrado insertado por la migracion
-- 20260530005000, cuando El Alto era la unica sede operativa. No se aplica un
-- valor por defecto ni se atribuyen plantillas creadas posteriormente: toda
-- plantilla ajena a estos IDs queda nula para que el endurecimiento se detenga
-- y el reconciliador exija una decision humana.
UPDATE "FollowUpTemplate"
SET "branchCode" = 'el-alto'
WHERE "branchCode" IS NULL
  AND "id" IN (
    'fut_post_consultation',
    'fut_post_sale',
    'fut_no_answer'
  )
  AND EXISTS (
    SELECT 1
    FROM "ClinicBranch"
    WHERE "code" = 'el-alto'
  );

CREATE TRIGGER "SupervisedReminderRuleVersion_prevent_update_delete"
BEFORE UPDATE OR DELETE ON "SupervisedReminderRuleVersion"
FOR EACH ROW EXECUTE FUNCTION "reject_supervised_reminder_version_mutation"();
CREATE TRIGGER "SupervisedReminderReviewEvent_prevent_update_delete"
BEFORE UPDATE OR DELETE ON "SupervisedReminderReviewEvent"
FOR EACH ROW EXECUTE FUNCTION "reject_supervised_reminder_review_mutation"();
CREATE TRIGGER "PatientFeedback_prevent_update_delete"
BEFORE UPDATE OR DELETE ON "PatientFeedback"
FOR EACH ROW EXECUTE FUNCTION "reject_patient_feedback_mutation"();
CREATE TRIGGER "PatientFeedbackCaseEvent_prevent_update_delete"
BEFORE UPDATE OR DELETE ON "PatientFeedbackCaseEvent"
FOR EACH ROW EXECUTE FUNCTION "reject_patient_feedback_case_event_mutation"();

CREATE UNIQUE INDEX "FollowUpTask_id_branchCode_key"
  ON "FollowUpTask"("id", "branchCode");
CREATE UNIQUE INDEX "FollowUpTask_escalatedFromTaskId_branchCode_key"
  ON "FollowUpTask"("escalatedFromTaskId", "branchCode");
CREATE UNIQUE INDEX "FollowUpTask_supervisedReminderCandidateId_branchCode_key"
  ON "FollowUpTask"("supervisedReminderCandidateId", "branchCode");
CREATE INDEX "FollowUpAttempt_taskId_branchCode_idx"
  ON "FollowUpAttempt"("taskId", "branchCode");
CREATE INDEX "FollowUpAttempt_branchCode_contactedAt_idx"
  ON "FollowUpAttempt"("branchCode", "contactedAt");
CREATE INDEX "FollowUpStatusHistory_taskId_branchCode_idx"
  ON "FollowUpStatusHistory"("taskId", "branchCode");
CREATE INDEX "FollowUpStatusHistory_branchCode_createdAt_idx"
  ON "FollowUpStatusHistory"("branchCode", "createdAt");
CREATE INDEX "FollowUpTemplate_branchCode_active_idx"
  ON "FollowUpTemplate"("branchCode", "active");

CREATE UNIQUE INDEX "SupervisedReminderRule_id_branchCode_key"
  ON "SupervisedReminderRule"("id", "branchCode");
CREATE UNIQUE INDEX "SupervisedReminderRule_activeVersionId_branchCode_key"
  ON "SupervisedReminderRule"("activeVersionId", "branchCode");
CREATE UNIQUE INDEX "SupervisedReminderRuleVersion_id_branchCode_key"
  ON "SupervisedReminderRuleVersion"("id", "branchCode");
CREATE UNIQUE INDEX "SupervisedReminderRuleVersion_ruleId_branchCode_version_key"
  ON "SupervisedReminderRuleVersion"("ruleId", "branchCode", "version");
CREATE INDEX "SupervisedReminderRuleVersion_branchCode_event_enabled_createdAt_idx"
  ON "SupervisedReminderRuleVersion"("branchCode", "event", "enabled", "createdAt");
CREATE UNIQUE INDEX "SupervisedReminderCandidate_id_branchCode_key"
  ON "SupervisedReminderCandidate"("id", "branchCode");
CREATE UNIQUE INDEX "SupervisedReminderCandidate_branchCode_deduplicationKey_key"
  ON "SupervisedReminderCandidate"("branchCode", "deduplicationKey");
CREATE INDEX "SupervisedReminderCandidate_branchCode_status_scheduledFor_idx"
  ON "SupervisedReminderCandidate"("branchCode", "status", "scheduledFor");
CREATE INDEX "SupervisedReminderCandidate_branchCode_patientId_createdAt_idx"
  ON "SupervisedReminderCandidate"("branchCode", "patientId", "createdAt");
CREATE INDEX "SupervisedReminderCandidate_branchCode_visitId_createdAt_idx"
  ON "SupervisedReminderCandidate"("branchCode", "visitId", "createdAt");
CREATE INDEX "SupervisedReminderCandidate_branchCode_sourceEvent_sourceOccurredAt_idx"
  ON "SupervisedReminderCandidate"("branchCode", "sourceEvent", "sourceOccurredAt");
CREATE INDEX "SupervisedReminderCandidate_ruleVersionId_branchCode_idx"
  ON "SupervisedReminderCandidate"("ruleVersionId", "branchCode");
CREATE INDEX "SupervisedReminderReviewEvent_candidateId_branchCode_createdAt_idx"
  ON "SupervisedReminderReviewEvent"("candidateId", "branchCode", "createdAt");
CREATE INDEX "SupervisedReminderReviewEvent_branchCode_result_createdAt_idx"
  ON "SupervisedReminderReviewEvent"("branchCode", "result", "createdAt");

CREATE UNIQUE INDEX "PatientFeedbackRequest_id_branchCode_key"
  ON "PatientFeedbackRequest"("id", "branchCode");
CREATE UNIQUE INDEX "PatientFeedbackRequest_branchCode_tokenHash_key"
  ON "PatientFeedbackRequest"("branchCode", "tokenHash");
CREATE UNIQUE INDEX "PatientFeedbackRequest_one_open_per_branch_visit_key"
  ON "PatientFeedbackRequest"("branchCode", "visitId") WHERE "status" = 'open';
CREATE INDEX "PatientFeedbackRequest_branchCode_status_expiresAt_idx"
  ON "PatientFeedbackRequest"("branchCode", "status", "expiresAt");
CREATE INDEX "PatientFeedbackRequest_branchCode_patientId_createdAt_idx"
  ON "PatientFeedbackRequest"("branchCode", "patientId", "createdAt");
CREATE INDEX "PatientFeedbackRequest_branchCode_visitId_status_idx"
  ON "PatientFeedbackRequest"("branchCode", "visitId", "status");
CREATE INDEX "PatientFeedbackRequest_branchCode_ownerId_status_idx"
  ON "PatientFeedbackRequest"("branchCode", "ownerId", "status");
CREATE UNIQUE INDEX "PatientFeedback_id_branchCode_key"
  ON "PatientFeedback"("id", "branchCode");
CREATE UNIQUE INDEX "PatientFeedback_requestId_branchCode_key"
  ON "PatientFeedback"("requestId", "branchCode");
CREATE UNIQUE INDEX "PatientFeedback_visitId_branchCode_key"
  ON "PatientFeedback"("visitId", "branchCode");
CREATE INDEX "PatientFeedback_branchCode_kind_submittedAt_idx"
  ON "PatientFeedback"("branchCode", "kind", "submittedAt");
CREATE INDEX "PatientFeedback_branchCode_area_submittedAt_idx"
  ON "PatientFeedback"("branchCode", "area", "submittedAt");
CREATE INDEX "PatientFeedback_branchCode_rating_submittedAt_idx"
  ON "PatientFeedback"("branchCode", "rating", "submittedAt");
CREATE INDEX "PatientFeedback_branchCode_patientId_submittedAt_idx"
  ON "PatientFeedback"("branchCode", "patientId", "submittedAt");
CREATE UNIQUE INDEX "PatientFeedbackCase_id_branchCode_key"
  ON "PatientFeedbackCase"("id", "branchCode");
CREATE UNIQUE INDEX "PatientFeedbackCase_feedbackId_branchCode_key"
  ON "PatientFeedbackCase"("feedbackId", "branchCode");
CREATE INDEX "PatientFeedbackCase_branchCode_status_responseDueAt_idx"
  ON "PatientFeedbackCase"("branchCode", "status", "responseDueAt");
CREATE INDEX "PatientFeedbackCase_branchCode_severity_status_createdAt_idx"
  ON "PatientFeedbackCase"("branchCode", "severity", "status", "createdAt");
CREATE INDEX "PatientFeedbackCase_branchCode_classification_createdAt_idx"
  ON "PatientFeedbackCase"("branchCode", "classification", "createdAt");
CREATE INDEX "PatientFeedbackCase_branchCode_ownerId_status_idx"
  ON "PatientFeedbackCase"("branchCode", "ownerId", "status");
CREATE INDEX "PatientFeedbackCaseEvent_caseId_branchCode_createdAt_idx"
  ON "PatientFeedbackCaseEvent"("caseId", "branchCode", "createdAt");
CREATE INDEX "PatientFeedbackCaseEvent_branchCode_actorId_createdAt_idx"
  ON "PatientFeedbackCaseEvent"("branchCode", "actorId", "createdAt");
CREATE INDEX "PatientFeedbackCaseEvent_branchCode_type_createdAt_idx"
  ON "PatientFeedbackCaseEvent"("branchCode", "type", "createdAt");

-- FKs nuevas se instalan NOT VALID para no bloquear la expansión. La fase de
-- endurecimiento valida datos y constraints después de la reconciliación.
ALTER TABLE "FollowUpAttempt" ADD CONSTRAINT "FollowUpAttempt_branchCode_fkey"
  FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
ALTER TABLE "FollowUpStatusHistory" ADD CONSTRAINT "FollowUpStatusHistory_branchCode_fkey"
  FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
ALTER TABLE "FollowUpTemplate" ADD CONSTRAINT "FollowUpTemplate_branchCode_fkey"
  FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
ALTER TABLE "SupervisedReminderRuleVersion" ADD CONSTRAINT "SupervisedReminderRuleVersion_branchCode_fkey"
  FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
ALTER TABLE "SupervisedReminderCandidate" ADD CONSTRAINT "SupervisedReminderCandidate_branchCode_fkey"
  FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
ALTER TABLE "SupervisedReminderReviewEvent" ADD CONSTRAINT "SupervisedReminderReviewEvent_branchCode_fkey"
  FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
ALTER TABLE "PatientFeedbackRequest" ADD CONSTRAINT "PatientFeedbackRequest_branchCode_fkey"
  FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
ALTER TABLE "PatientFeedback" ADD CONSTRAINT "PatientFeedback_branchCode_fkey"
  FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
ALTER TABLE "PatientFeedbackCase" ADD CONSTRAINT "PatientFeedbackCase_branchCode_fkey"
  FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
ALTER TABLE "PatientFeedbackCaseEvent" ADD CONSTRAINT "PatientFeedbackCaseEvent_branchCode_fkey"
  FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
