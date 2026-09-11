-- Tarea 13, fase de endurecimiento. Falla de forma cerrada ante cualquier
-- registro ambiguo; no corrige ni reasigna evidencia histórica.
BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "FollowUpAttempt" WHERE "branchCode" IS NULL)
    OR EXISTS (SELECT 1 FROM "FollowUpStatusHistory" WHERE "branchCode" IS NULL)
    OR EXISTS (SELECT 1 FROM "FollowUpTemplate" WHERE "branchCode" IS NULL)
    OR EXISTS (SELECT 1 FROM "SupervisedReminderRuleVersion" WHERE "branchCode" IS NULL)
    OR EXISTS (SELECT 1 FROM "SupervisedReminderCandidate" WHERE "branchCode" IS NULL)
    OR EXISTS (SELECT 1 FROM "SupervisedReminderReviewEvent" WHERE "branchCode" IS NULL)
    OR EXISTS (SELECT 1 FROM "PatientFeedbackRequest" WHERE "branchCode" IS NULL)
    OR EXISTS (SELECT 1 FROM "PatientFeedback" WHERE "branchCode" IS NULL)
    OR EXISTS (SELECT 1 FROM "PatientFeedbackCase" WHERE "branchCode" IS NULL)
    OR EXISTS (SELECT 1 FROM "PatientFeedbackCaseEvent" WHERE "branchCode" IS NULL)
  THEN RAISE EXCEPTION 'TASK13_BRANCH_RECONCILIATION_REQUIRED'; END IF;

  IF EXISTS (
    SELECT 1 FROM "FollowUpTask" task
    LEFT JOIN "Lead" lead ON lead."id" = task."leadId"
    LEFT JOIN "PatientBranchRecord" patient
      ON patient."patientId" = task."patientId" AND patient."branchCode" = task."branchCode"
    LEFT JOIN "Visit" visit ON visit."id" = task."visitId"
    LEFT JOIN "Sale" sale ON sale."id" = task."saleId"
    LEFT JOIN "ClinicalOrder" clinical_order ON clinical_order."id" = task."clinicalOrderId"
    LEFT JOIN "VisitWorkItem" work_item ON work_item."id" = task."workItemId"
    LEFT JOIN "InternalUserBranch" assignee
      ON assignee."userId" = task."assignedToId" AND assignee."branchCode" = task."branchCode"
    LEFT JOIN "FollowUpTask" parent ON parent."id" = task."escalatedFromTaskId"
    LEFT JOIN "SupervisedReminderCandidate" candidate
      ON candidate."id" = task."supervisedReminderCandidateId"
    WHERE (task."leadId" IS NOT NULL AND lead."branchCode" IS DISTINCT FROM task."branchCode")
       OR (task."patientId" IS NOT NULL AND patient."patientId" IS NULL)
       OR (task."visitId" IS NOT NULL AND visit."branchCode" IS DISTINCT FROM task."branchCode")
       OR (task."saleId" IS NOT NULL AND sale."branchCode" IS DISTINCT FROM task."branchCode")
       OR (task."clinicalOrderId" IS NOT NULL AND clinical_order."branchCode" IS DISTINCT FROM task."branchCode")
       OR (task."workItemId" IS NOT NULL AND work_item."branchCode" IS DISTINCT FROM task."branchCode")
       OR (task."assignedToId" IS NOT NULL AND assignee."userId" IS NULL)
       OR (task."escalatedFromTaskId" IS NOT NULL AND parent."branchCode" IS DISTINCT FROM task."branchCode")
       OR (task."supervisedReminderCandidateId" IS NOT NULL AND candidate."branchCode" IS DISTINCT FROM task."branchCode")
  ) THEN RAISE EXCEPTION 'FOLLOW_UP_TASK_BRANCH_SOURCE_MISMATCH'; END IF;

  IF EXISTS (
    SELECT 1 FROM "FollowUpAttempt" child
    JOIN "FollowUpTask" parent ON parent."id" = child."taskId"
    LEFT JOIN "InternalUserBranch" actor
      ON actor."userId" = child."userId" AND actor."branchCode" = child."branchCode"
    WHERE parent."branchCode" IS DISTINCT FROM child."branchCode"
       OR (child."userId" IS NOT NULL AND actor."userId" IS NULL)
  ) THEN RAISE EXCEPTION 'FOLLOW_UP_ATTEMPT_BRANCH_SOURCE_MISMATCH'; END IF;

  IF EXISTS (
    SELECT 1 FROM "FollowUpStatusHistory" child
    JOIN "FollowUpTask" parent ON parent."id" = child."taskId"
    WHERE parent."branchCode" IS DISTINCT FROM child."branchCode"
  ) THEN RAISE EXCEPTION 'FOLLOW_UP_HISTORY_BRANCH_SOURCE_MISMATCH'; END IF;

  IF EXISTS (
    SELECT 1 FROM "VisitDiscontinuation" item
    JOIN "FollowUpTask" task ON task."id" = item."followUpTaskId"
    WHERE task."branchCode" IS DISTINCT FROM item."branchCode"
  ) OR EXISTS (
    SELECT 1 FROM "TreatmentProposalOutcome" item
    JOIN "FollowUpTask" task ON task."id" = item."followUpTaskId"
    WHERE task."branchCode" IS DISTINCT FROM item."branchCode"
  ) THEN RAISE EXCEPTION 'FOLLOW_UP_BACK_REFERENCE_BRANCH_MISMATCH'; END IF;

  IF EXISTS (
    SELECT 1 FROM "SupervisedReminderRuleVersion" version
    JOIN "SupervisedReminderRule" rule ON rule."id" = version."ruleId"
    LEFT JOIN "InternalUserBranch" owner
      ON owner."userId" = version."ownerId" AND owner."branchCode" = version."branchCode"
    WHERE rule."branchCode" IS DISTINCT FROM version."branchCode" OR owner."userId" IS NULL
  ) OR EXISTS (
    SELECT 1 FROM "SupervisedReminderRule" rule
    JOIN "SupervisedReminderRuleVersion" version ON version."id" = rule."activeVersionId"
    WHERE version."branchCode" IS DISTINCT FROM rule."branchCode"
  ) THEN RAISE EXCEPTION 'REMINDER_RULE_BRANCH_SOURCE_MISMATCH'; END IF;

  IF EXISTS (
    SELECT 1 FROM "SupervisedReminderCandidate" candidate
    JOIN "SupervisedReminderRuleVersion" version ON version."id" = candidate."ruleVersionId"
    LEFT JOIN "PatientBranchRecord" patient
      ON patient."patientId" = candidate."patientId" AND patient."branchCode" = candidate."branchCode"
    LEFT JOIN "Visit" visit ON visit."id" = candidate."visitId"
    LEFT JOIN "InternalUserBranch" reviewer
      ON reviewer."userId" = candidate."reviewedById" AND reviewer."branchCode" = candidate."branchCode"
    WHERE version."branchCode" IS DISTINCT FROM candidate."branchCode"
       OR patient."patientId" IS NULL
       OR (candidate."visitId" IS NOT NULL AND visit."branchCode" IS DISTINCT FROM candidate."branchCode")
       OR (candidate."reviewedById" IS NOT NULL AND reviewer."userId" IS NULL)
  ) THEN RAISE EXCEPTION 'REMINDER_CANDIDATE_BRANCH_SOURCE_MISMATCH'; END IF;

  IF EXISTS (
    SELECT 1 FROM "SupervisedReminderReviewEvent" event
    JOIN "SupervisedReminderCandidate" candidate ON candidate."id" = event."candidateId"
    LEFT JOIN "InternalUserBranch" actor
      ON actor."userId" = event."userId" AND actor."branchCode" = event."branchCode"
    WHERE candidate."branchCode" IS DISTINCT FROM event."branchCode"
       OR (event."userId" IS NOT NULL AND actor."userId" IS NULL)
  ) THEN RAISE EXCEPTION 'REMINDER_REVIEW_BRANCH_SOURCE_MISMATCH'; END IF;

  IF EXISTS (
    SELECT 1 FROM "PatientFeedbackRequest" request
    JOIN "Visit" visit ON visit."id" = request."visitId"
    LEFT JOIN "PatientBranchRecord" patient
      ON patient."patientId" = request."patientId" AND patient."branchCode" = request."branchCode"
    LEFT JOIN "InternalUserBranch" owner
      ON owner."userId" = request."ownerId" AND owner."branchCode" = request."branchCode"
    WHERE visit."branchCode" IS DISTINCT FROM request."branchCode"
       OR visit."patientId" <> request."patientId"
       OR patient."patientId" IS NULL OR owner."userId" IS NULL
  ) THEN RAISE EXCEPTION 'FEEDBACK_REQUEST_BRANCH_SOURCE_MISMATCH'; END IF;

  IF EXISTS (
    SELECT 1 FROM "PatientFeedback" feedback
    JOIN "PatientFeedbackRequest" request ON request."id" = feedback."requestId"
    JOIN "Visit" visit ON visit."id" = feedback."visitId"
    LEFT JOIN "PatientBranchRecord" patient
      ON patient."patientId" = feedback."patientId" AND patient."branchCode" = feedback."branchCode"
    WHERE request."branchCode" IS DISTINCT FROM feedback."branchCode"
       OR visit."branchCode" IS DISTINCT FROM feedback."branchCode"
       OR request."visitId" <> feedback."visitId" OR request."patientId" <> feedback."patientId"
       OR patient."patientId" IS NULL
  ) THEN RAISE EXCEPTION 'FEEDBACK_BRANCH_SOURCE_MISMATCH'; END IF;

  IF EXISTS (
    SELECT 1 FROM "PatientFeedbackCase" feedback_case
    JOIN "PatientFeedback" feedback ON feedback."id" = feedback_case."feedbackId"
    LEFT JOIN "InternalUserBranch" owner
      ON owner."userId" = feedback_case."ownerId" AND owner."branchCode" = feedback_case."branchCode"
    WHERE feedback."branchCode" IS DISTINCT FROM feedback_case."branchCode" OR owner."userId" IS NULL
  ) OR EXISTS (
    SELECT 1 FROM "PatientFeedbackCaseEvent" event
    JOIN "PatientFeedbackCase" feedback_case ON feedback_case."id" = event."caseId"
    LEFT JOIN "InternalUserBranch" actor
      ON actor."userId" = event."actorId" AND actor."branchCode" = event."branchCode"
    WHERE feedback_case."branchCode" IS DISTINCT FROM event."branchCode"
       OR (event."actorId" IS NOT NULL AND actor."userId" IS NULL)
  ) THEN RAISE EXCEPTION 'FEEDBACK_CASE_BRANCH_SOURCE_MISMATCH'; END IF;
END $$;

ALTER TABLE "FollowUpAttempt" ALTER COLUMN "branchCode" SET NOT NULL;
ALTER TABLE "FollowUpStatusHistory" ALTER COLUMN "branchCode" SET NOT NULL;
ALTER TABLE "FollowUpTemplate" ALTER COLUMN "branchCode" SET NOT NULL;
ALTER TABLE "SupervisedReminderRuleVersion" ALTER COLUMN "branchCode" SET NOT NULL;
ALTER TABLE "SupervisedReminderCandidate" ALTER COLUMN "branchCode" SET NOT NULL;
ALTER TABLE "SupervisedReminderReviewEvent" ALTER COLUMN "branchCode" SET NOT NULL;
ALTER TABLE "PatientFeedbackRequest" ALTER COLUMN "branchCode" SET NOT NULL;
ALTER TABLE "PatientFeedback" ALTER COLUMN "branchCode" SET NOT NULL;
ALTER TABLE "PatientFeedbackCase" ALTER COLUMN "branchCode" SET NOT NULL;
ALTER TABLE "PatientFeedbackCaseEvent" ALTER COLUMN "branchCode" SET NOT NULL;

ALTER TABLE "FollowUpTask"
  DROP CONSTRAINT IF EXISTS "FollowUpTask_leadId_fkey",
  DROP CONSTRAINT IF EXISTS "FollowUpTask_visitId_fkey",
  DROP CONSTRAINT IF EXISTS "FollowUpTask_saleId_fkey",
  DROP CONSTRAINT IF EXISTS "FollowUpTask_clinicalOrderId_fkey",
  DROP CONSTRAINT IF EXISTS "FollowUpTask_workItemId_fkey",
  DROP CONSTRAINT IF EXISTS "FollowUpTask_escalatedFromTaskId_fkey",
  DROP CONSTRAINT IF EXISTS "FollowUpTask_supervisedReminderCandidateId_fkey";
ALTER TABLE "FollowUpAttempt" DROP CONSTRAINT IF EXISTS "FollowUpAttempt_taskId_fkey";
ALTER TABLE "FollowUpStatusHistory" DROP CONSTRAINT IF EXISTS "FollowUpStatusHistory_taskId_fkey";
ALTER TABLE "VisitDiscontinuation" DROP CONSTRAINT IF EXISTS "VisitDiscontinuation_followUpTaskId_fkey";
ALTER TABLE "TreatmentProposalOutcome" DROP CONSTRAINT IF EXISTS "TreatmentProposalOutcome_followUpTaskId_fkey";
ALTER TABLE "SupervisedReminderRule" DROP CONSTRAINT IF EXISTS "SupervisedReminderRule_activeVersionId_fkey";
ALTER TABLE "SupervisedReminderRuleVersion" DROP CONSTRAINT IF EXISTS "SupervisedReminderRuleVersion_ruleId_fkey";
ALTER TABLE "SupervisedReminderCandidate"
  DROP CONSTRAINT IF EXISTS "SupervisedReminderCandidate_ruleVersionId_fkey",
  DROP CONSTRAINT IF EXISTS "SupervisedReminderCandidate_visitId_fkey";
ALTER TABLE "SupervisedReminderReviewEvent" DROP CONSTRAINT IF EXISTS "SupervisedReminderReviewEvent_candidateId_fkey";
ALTER TABLE "PatientFeedbackRequest" DROP CONSTRAINT IF EXISTS "PatientFeedbackRequest_visitId_fkey";
ALTER TABLE "PatientFeedback"
  DROP CONSTRAINT IF EXISTS "PatientFeedback_requestId_fkey",
  DROP CONSTRAINT IF EXISTS "PatientFeedback_visitId_fkey";
ALTER TABLE "PatientFeedbackCase" DROP CONSTRAINT IF EXISTS "PatientFeedbackCase_feedbackId_fkey";
ALTER TABLE "PatientFeedbackCaseEvent" DROP CONSTRAINT IF EXISTS "PatientFeedbackCaseEvent_caseId_fkey";

ALTER TABLE "FollowUpTask"
  ADD CONSTRAINT "FollowUpTask_leadId_branchCode_fkey" FOREIGN KEY ("leadId", "branchCode") REFERENCES "Lead"("id", "branchCode") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "FollowUpTask_patientId_branchCode_fkey" FOREIGN KEY ("patientId", "branchCode") REFERENCES "PatientBranchRecord"("patientId", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "FollowUpTask_visitId_branchCode_fkey" FOREIGN KEY ("visitId", "branchCode") REFERENCES "Visit"("id", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "FollowUpTask_saleId_branchCode_fkey" FOREIGN KEY ("saleId", "branchCode") REFERENCES "Sale"("id", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "FollowUpTask_clinicalOrderId_branchCode_fkey" FOREIGN KEY ("clinicalOrderId", "branchCode") REFERENCES "ClinicalOrder"("id", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "FollowUpTask_workItemId_branchCode_fkey" FOREIGN KEY ("workItemId", "branchCode") REFERENCES "VisitWorkItem"("id", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "FollowUpTask_assignedToId_branchCode_fkey" FOREIGN KEY ("assignedToId", "branchCode") REFERENCES "InternalUserBranch"("userId", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "FollowUpTask_escalatedFromTaskId_branchCode_fkey" FOREIGN KEY ("escalatedFromTaskId", "branchCode") REFERENCES "FollowUpTask"("id", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "FollowUpTask_supervisedReminderCandidateId_branchCode_fkey" FOREIGN KEY ("supervisedReminderCandidateId", "branchCode") REFERENCES "SupervisedReminderCandidate"("id", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FollowUpAttempt"
  ADD CONSTRAINT "FollowUpAttempt_taskId_branchCode_fkey" FOREIGN KEY ("taskId", "branchCode") REFERENCES "FollowUpTask"("id", "branchCode") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "FollowUpAttempt_userId_branchCode_fkey" FOREIGN KEY ("userId", "branchCode") REFERENCES "InternalUserBranch"("userId", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FollowUpStatusHistory" ADD CONSTRAINT "FollowUpStatusHistory_taskId_branchCode_fkey"
  FOREIGN KEY ("taskId", "branchCode") REFERENCES "FollowUpTask"("id", "branchCode") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VisitDiscontinuation" ADD CONSTRAINT "VisitDiscontinuation_followUpTaskId_branchCode_fkey"
  FOREIGN KEY ("followUpTaskId", "branchCode") REFERENCES "FollowUpTask"("id", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TreatmentProposalOutcome" ADD CONSTRAINT "TreatmentProposalOutcome_followUpTaskId_branchCode_fkey"
  FOREIGN KEY ("followUpTaskId", "branchCode") REFERENCES "FollowUpTask"("id", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SupervisedReminderRule" ADD CONSTRAINT "SupervisedReminderRule_activeVersionId_branchCode_fkey"
  FOREIGN KEY ("activeVersionId", "branchCode") REFERENCES "SupervisedReminderRuleVersion"("id", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupervisedReminderRuleVersion"
  ADD CONSTRAINT "SupervisedReminderRuleVersion_ruleId_branchCode_fkey" FOREIGN KEY ("ruleId", "branchCode") REFERENCES "SupervisedReminderRule"("id", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "SupervisedReminderRuleVersion_ownerId_branchCode_fkey" FOREIGN KEY ("ownerId", "branchCode") REFERENCES "InternalUserBranch"("userId", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupervisedReminderCandidate"
  ADD CONSTRAINT "SupervisedReminderCandidate_ruleVersionId_branchCode_fkey" FOREIGN KEY ("ruleVersionId", "branchCode") REFERENCES "SupervisedReminderRuleVersion"("id", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "SupervisedReminderCandidate_patientId_branchCode_fkey" FOREIGN KEY ("patientId", "branchCode") REFERENCES "PatientBranchRecord"("patientId", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "SupervisedReminderCandidate_visitId_branchCode_fkey" FOREIGN KEY ("visitId", "branchCode") REFERENCES "Visit"("id", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "SupervisedReminderCandidate_reviewedById_branchCode_fkey" FOREIGN KEY ("reviewedById", "branchCode") REFERENCES "InternalUserBranch"("userId", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupervisedReminderReviewEvent"
  ADD CONSTRAINT "SupervisedReminderReviewEvent_candidateId_branchCode_fkey" FOREIGN KEY ("candidateId", "branchCode") REFERENCES "SupervisedReminderCandidate"("id", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "SupervisedReminderReviewEvent_userId_branchCode_fkey" FOREIGN KEY ("userId", "branchCode") REFERENCES "InternalUserBranch"("userId", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PatientFeedbackRequest"
  ADD CONSTRAINT "PatientFeedbackRequest_patientId_branchCode_fkey" FOREIGN KEY ("patientId", "branchCode") REFERENCES "PatientBranchRecord"("patientId", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "PatientFeedbackRequest_visitId_branchCode_fkey" FOREIGN KEY ("visitId", "branchCode") REFERENCES "Visit"("id", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "PatientFeedbackRequest_ownerId_branchCode_fkey" FOREIGN KEY ("ownerId", "branchCode") REFERENCES "InternalUserBranch"("userId", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientFeedback"
  ADD CONSTRAINT "PatientFeedback_requestId_branchCode_fkey" FOREIGN KEY ("requestId", "branchCode") REFERENCES "PatientFeedbackRequest"("id", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "PatientFeedback_patientId_branchCode_fkey" FOREIGN KEY ("patientId", "branchCode") REFERENCES "PatientBranchRecord"("patientId", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "PatientFeedback_visitId_branchCode_fkey" FOREIGN KEY ("visitId", "branchCode") REFERENCES "Visit"("id", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientFeedbackCase"
  ADD CONSTRAINT "PatientFeedbackCase_feedbackId_branchCode_fkey" FOREIGN KEY ("feedbackId", "branchCode") REFERENCES "PatientFeedback"("id", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "PatientFeedbackCase_ownerId_branchCode_fkey" FOREIGN KEY ("ownerId", "branchCode") REFERENCES "InternalUserBranch"("userId", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientFeedbackCaseEvent"
  ADD CONSTRAINT "PatientFeedbackCaseEvent_caseId_branchCode_fkey" FOREIGN KEY ("caseId", "branchCode") REFERENCES "PatientFeedbackCase"("id", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "PatientFeedbackCaseEvent_actorId_branchCode_fkey" FOREIGN KEY ("actorId", "branchCode") REFERENCES "InternalUserBranch"("userId", "branchCode") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FollowUpAttempt" VALIDATE CONSTRAINT "FollowUpAttempt_branchCode_fkey";
ALTER TABLE "FollowUpStatusHistory" VALIDATE CONSTRAINT "FollowUpStatusHistory_branchCode_fkey";
ALTER TABLE "FollowUpTemplate" VALIDATE CONSTRAINT "FollowUpTemplate_branchCode_fkey";
ALTER TABLE "SupervisedReminderRuleVersion" VALIDATE CONSTRAINT "SupervisedReminderRuleVersion_branchCode_fkey";
ALTER TABLE "SupervisedReminderCandidate" VALIDATE CONSTRAINT "SupervisedReminderCandidate_branchCode_fkey";
ALTER TABLE "SupervisedReminderReviewEvent" VALIDATE CONSTRAINT "SupervisedReminderReviewEvent_branchCode_fkey";
ALTER TABLE "PatientFeedbackRequest" VALIDATE CONSTRAINT "PatientFeedbackRequest_branchCode_fkey";
ALTER TABLE "PatientFeedback" VALIDATE CONSTRAINT "PatientFeedback_branchCode_fkey";
ALTER TABLE "PatientFeedbackCase" VALIDATE CONSTRAINT "PatientFeedbackCase_branchCode_fkey";
ALTER TABLE "PatientFeedbackCaseEvent" VALIDATE CONSTRAINT "PatientFeedbackCaseEvent_branchCode_fkey";

DROP INDEX IF EXISTS "FollowUpTask_supervisedReminderCandidateId_key";
DROP INDEX IF EXISTS "FollowUpTask_escalatedFromTaskId_key";
DROP INDEX IF EXISTS "VisitDiscontinuation_followUpTaskId_key";
DROP INDEX IF EXISTS "TreatmentProposalOutcome_followUpTaskId_key";
DROP INDEX IF EXISTS "FollowUpAttempt_taskId_idx";
DROP INDEX IF EXISTS "FollowUpStatusHistory_taskId_idx";
DROP INDEX IF EXISTS "FollowUpTemplate_active_idx";
DROP INDEX IF EXISTS "SupervisedReminderRule_activeVersionId_key";
DROP INDEX IF EXISTS "SupervisedReminderRuleVersion_ruleId_version_key";
DROP INDEX IF EXISTS "SupervisedReminderRuleVersion_event_enabled_createdAt_idx";
DROP INDEX IF EXISTS "SupervisedReminderCandidate_deduplicationKey_key";
DROP INDEX IF EXISTS "SupervisedReminderCandidate_status_scheduledFor_idx";
DROP INDEX IF EXISTS "SupervisedReminderCandidate_patientId_createdAt_idx";
DROP INDEX IF EXISTS "SupervisedReminderCandidate_visitId_createdAt_idx";
DROP INDEX IF EXISTS "SupervisedReminderCandidate_sourceEvent_sourceOccurredAt_idx";
DROP INDEX IF EXISTS "SupervisedReminderCandidate_ruleVersionId_idx";
DROP INDEX IF EXISTS "SupervisedReminderReviewEvent_candidateId_createdAt_idx";
DROP INDEX IF EXISTS "SupervisedReminderReviewEvent_result_createdAt_idx";
DROP INDEX IF EXISTS "PatientFeedbackRequest_tokenHash_key";
DROP INDEX IF EXISTS "PatientFeedbackRequest_one_open_per_visit_key";
DROP INDEX IF EXISTS "PatientFeedbackRequest_status_expiresAt_idx";
DROP INDEX IF EXISTS "PatientFeedbackRequest_patientId_createdAt_idx";
DROP INDEX IF EXISTS "PatientFeedbackRequest_visitId_status_idx";
DROP INDEX IF EXISTS "PatientFeedbackRequest_ownerId_status_idx";
DROP INDEX IF EXISTS "PatientFeedback_requestId_key";
DROP INDEX IF EXISTS "PatientFeedback_visitId_key";
DROP INDEX IF EXISTS "PatientFeedback_kind_submittedAt_idx";
DROP INDEX IF EXISTS "PatientFeedback_area_submittedAt_idx";
DROP INDEX IF EXISTS "PatientFeedback_rating_submittedAt_idx";
DROP INDEX IF EXISTS "PatientFeedback_patientId_submittedAt_idx";
DROP INDEX IF EXISTS "PatientFeedbackCase_feedbackId_key";
DROP INDEX IF EXISTS "PatientFeedbackCase_status_responseDueAt_idx";
DROP INDEX IF EXISTS "PatientFeedbackCase_severity_status_createdAt_idx";
DROP INDEX IF EXISTS "PatientFeedbackCase_classification_createdAt_idx";
DROP INDEX IF EXISTS "PatientFeedbackCase_ownerId_status_idx";
DROP INDEX IF EXISTS "PatientFeedbackCaseEvent_caseId_createdAt_idx";
DROP INDEX IF EXISTS "PatientFeedbackCaseEvent_actorId_createdAt_idx";
DROP INDEX IF EXISTS "PatientFeedbackCaseEvent_type_createdAt_idx";

CREATE TRIGGER "FollowUpTask_branch_immutable" BEFORE UPDATE ON "FollowUpTask"
FOR EACH ROW EXECUTE FUNCTION "prevent_branch_ownership_change"();
CREATE TRIGGER "FollowUpAttempt_branch_immutable" BEFORE UPDATE ON "FollowUpAttempt"
FOR EACH ROW EXECUTE FUNCTION "prevent_branch_ownership_change"();
CREATE TRIGGER "FollowUpStatusHistory_branch_immutable" BEFORE UPDATE ON "FollowUpStatusHistory"
FOR EACH ROW EXECUTE FUNCTION "prevent_branch_ownership_change"();
CREATE TRIGGER "FollowUpTemplate_branch_immutable" BEFORE UPDATE ON "FollowUpTemplate"
FOR EACH ROW EXECUTE FUNCTION "prevent_branch_ownership_change"();
CREATE TRIGGER "SupervisedReminderRule_branch_immutable" BEFORE UPDATE ON "SupervisedReminderRule"
FOR EACH ROW EXECUTE FUNCTION "prevent_branch_ownership_change"();
CREATE TRIGGER "SupervisedReminderCandidate_branch_immutable" BEFORE UPDATE ON "SupervisedReminderCandidate"
FOR EACH ROW EXECUTE FUNCTION "prevent_branch_ownership_change"();
CREATE TRIGGER "PatientFeedbackRequest_branch_immutable" BEFORE UPDATE ON "PatientFeedbackRequest"
FOR EACH ROW EXECUTE FUNCTION "prevent_branch_ownership_change"();
CREATE TRIGGER "PatientFeedbackCase_branch_immutable" BEFORE UPDATE ON "PatientFeedbackCase"
FOR EACH ROW EXECUTE FUNCTION "prevent_branch_ownership_change"();

COMMIT;
