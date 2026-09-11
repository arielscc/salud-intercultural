-- Tarea 14, fase de endurecimiento. No atribuye eventos legacy: falla hasta
-- que el reconciliador haya recibido decisiones explícitas para cada uno.
BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "ModuleActivationEvent" WHERE "branchCode" IS NULL)
  THEN RAISE EXCEPTION 'TASK14_MODULE_EVENT_RECONCILIATION_REQUIRED'; END IF;

  IF EXISTS (SELECT 1 FROM "AuditEvent" WHERE "scope" IS NULL)
  THEN RAISE EXCEPTION 'TASK14_AUDIT_EVENT_RECONCILIATION_REQUIRED'; END IF;

  IF EXISTS (
    SELECT 1 FROM "AuditEvent"
    WHERE ("scope" = 'branch' AND "branchCode" IS NULL)
       OR ("scope" = 'platform' AND "branchCode" IS NOT NULL)
  ) THEN RAISE EXCEPTION 'AUDIT_SCOPE_BRANCH_MISMATCH'; END IF;

  IF EXISTS (
    SELECT 1
    FROM "ModuleActivationEvent" event
    LEFT JOIN "ModuleActivation" activation
      ON activation."code" = event."moduleCode"
     AND activation."branchCode" = event."branchCode"
    WHERE activation."code" IS NULL
  ) THEN RAISE EXCEPTION 'MODULE_EVENT_BRANCH_SOURCE_MISMATCH'; END IF;
END $$;

ALTER TABLE "AuditEvent" ALTER COLUMN "scope" SET NOT NULL;
ALTER TABLE "ModuleActivationEvent" ALTER COLUMN "branchCode" SET NOT NULL;

ALTER TABLE "AuditEvent" VALIDATE CONSTRAINT "AuditEvent_branchCode_fkey";
ALTER TABLE "AuditEvent" VALIDATE CONSTRAINT "AuditEvent_scope_branch_check";
ALTER TABLE "ModuleActivationEvent"
  VALIDATE CONSTRAINT "ModuleActivationEvent_branchCode_fkey";

COMMIT;
