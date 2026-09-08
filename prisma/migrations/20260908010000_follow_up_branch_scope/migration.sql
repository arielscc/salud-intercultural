-- Los seguimientos son trabajo operativo de una sede. Antes heredaban la sede
-- de sus relaciones, pero las bandejas podían omitir ese filtro. Materializarla
-- vuelve imposible consultar o modificar una tarea sin decidir la sucursal.
ALTER TABLE "FollowUpTask" ADD COLUMN "branchCode" TEXT;

UPDATE "FollowUpTask" AS task
SET "branchCode" = COALESCE(
  (SELECT visit."branchCode" FROM "Visit" AS visit WHERE visit."id" = task."visitId"),
  (SELECT sale."branchCode" FROM "Sale" AS sale WHERE sale."id" = task."saleId"),
  (
    SELECT visit."branchCode"
    FROM "ClinicalOrder" AS clinical_order
    JOIN "Visit" AS visit ON visit."id" = clinical_order."visitId"
    WHERE clinical_order."id" = task."clinicalOrderId"
  ),
  (
    SELECT visit."branchCode"
    FROM "VisitWorkItem" AS work_item
    JOIN "Visit" AS visit ON visit."id" = work_item."visitId"
    WHERE work_item."id" = task."workItemId"
  ),
  (
    SELECT visit."branchCode"
    FROM "Visit" AS visit
    WHERE visit."patientId" = task."patientId"
    ORDER BY visit."checkedInAt" DESC
    LIMIT 1
  ),
  'el-alto'
);

ALTER TABLE "FollowUpTask" ALTER COLUMN "branchCode" SET NOT NULL;

CREATE INDEX "FollowUpTask_branchCode_status_dueAt_idx"
ON "FollowUpTask"("branchCode", "status", "dueAt");

ALTER TABLE "FollowUpTask"
ADD CONSTRAINT "FollowUpTask_branchCode_fkey"
FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- Las reglas supervisadas también son configuración operativa de una sede:
-- una regla de El Alto no debe generar trabajo ni asignar responsables en CBBA.
ALTER TABLE "SupervisedReminderRule" ADD COLUMN "branchCode" TEXT;

UPDATE "SupervisedReminderRule" AS rule
SET "branchCode" = COALESCE(
  (
    SELECT visit."branchCode"
    FROM "SupervisedReminderRuleVersion" AS version
    JOIN "SupervisedReminderCandidate" AS candidate
      ON candidate."ruleVersionId" = version."id"
    JOIN "Visit" AS visit ON visit."id" = candidate."visitId"
    WHERE version."ruleId" = rule."id"
    ORDER BY candidate."createdAt" DESC
    LIMIT 1
  ),
  (
    SELECT assignment."branchCode"
    FROM "SupervisedReminderRuleVersion" AS version
    JOIN "InternalUserBranch" AS assignment
      ON assignment."userId" = version."ownerId"
    WHERE version."ruleId" = rule."id"
    ORDER BY assignment."isDefault" DESC, assignment."assignedAt" ASC
    LIMIT 1
  ),
  'el-alto'
);

ALTER TABLE "SupervisedReminderRule" ALTER COLUMN "branchCode" SET NOT NULL;
DROP INDEX "SupervisedReminderRule_key_key";
CREATE UNIQUE INDEX "SupervisedReminderRule_branchCode_key_key"
ON "SupervisedReminderRule"("branchCode", "key");
CREATE INDEX "SupervisedReminderRule_branchCode_createdAt_idx"
ON "SupervisedReminderRule"("branchCode", "createdAt");

ALTER TABLE "SupervisedReminderRule"
ADD CONSTRAINT "SupervisedReminderRule_branchCode_fkey"
FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code")
ON DELETE RESTRICT ON UPDATE CASCADE;
