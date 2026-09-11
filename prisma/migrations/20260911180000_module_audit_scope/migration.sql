-- Tarea 14, fase expansiva. La auditoría distingue plataforma de operación y
-- materializa la sucursal sin inventarla para eventos históricos ambiguos.

CREATE TYPE "AuditScope" AS ENUM ('platform', 'branch');

ALTER TABLE "AuditEvent"
  ADD COLUMN "scope" "AuditScope",
  ADD COLUMN "branchCode" TEXT;

-- AuditEvent es append-only. El trigger se suspende únicamente para clasificar
-- evidencia que ya contiene una sede técnica verificable o una acción global
-- incluida en la lista cerrada; los demás eventos quedan para reconciliación.
DROP TRIGGER IF EXISTS "AuditEvent_prevent_update_delete" ON "AuditEvent";

UPDATE "AuditEvent"
SET "scope" = 'platform', "branchCode" = NULL
WHERE "action" IN (
  'branch.active.change',
  'integration.payload_campaign.deactivate',
  'integration.payload_campaign.sync',
  'session.login',
  'session.logout',
  'session.revoke',
  'user.access.update',
  'user.branches.update',
  'user.create',
  'user.password.change',
  'user.password_change.require',
  'user.profile.update',
  'user.sessions.revoke',
  'user.unlock'
)
OR "action" LIKE 'backup.%'
OR "action" LIKE 'incident.%'
OR "action" LIKE 'maintenance.%';

UPDATE "AuditEvent" event
SET "scope" = 'branch',
    "branchCode" = event."context"->>'branchCode'
WHERE event."scope" IS NULL
  AND jsonb_typeof(event."context") = 'object'
  AND event."context"->>'branchCode' IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM "ClinicBranch" branch
    WHERE branch."code" = event."context"->>'branchCode'
  );

CREATE TRIGGER "AuditEvent_prevent_update_delete"
BEFORE UPDATE OR DELETE ON "AuditEvent"
FOR EACH ROW EXECUTE FUNCTION "reject_audit_event_mutation"();

DROP INDEX IF EXISTS "AuditEvent_occurredAt_idx";
DROP INDEX IF EXISTS "AuditEvent_action_occurredAt_idx";
DROP INDEX IF EXISTS "AuditEvent_entityType_occurredAt_idx";
DROP INDEX IF EXISTS "AuditEvent_result_occurredAt_idx";

CREATE INDEX "AuditEvent_scope_branchCode_occurredAt_idx"
  ON "AuditEvent"("scope", "branchCode", "occurredAt");
CREATE INDEX "AuditEvent_branchCode_action_occurredAt_idx"
  ON "AuditEvent"("branchCode", "action", "occurredAt");
CREATE INDEX "AuditEvent_scope_action_occurredAt_idx"
  ON "AuditEvent"("scope", "action", "occurredAt");
CREATE INDEX "AuditEvent_scope_entityType_occurredAt_idx"
  ON "AuditEvent"("scope", "entityType", "occurredAt");
CREATE INDEX "AuditEvent_scope_result_occurredAt_idx"
  ON "AuditEvent"("scope", "result", "occurredAt");

CREATE INDEX "ModuleActivationEvent_branchCode_occurredAt_idx"
  ON "ModuleActivationEvent"("branchCode", "occurredAt");

ALTER TABLE "AuditEvent"
  ADD CONSTRAINT "AuditEvent_branchCode_fkey"
  FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code")
  ON DELETE RESTRICT ON UPDATE RESTRICT NOT VALID;

ALTER TABLE "ModuleActivationEvent"
  ADD CONSTRAINT "ModuleActivationEvent_branchCode_fkey"
  FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code")
  ON DELETE RESTRICT ON UPDATE RESTRICT NOT VALID;

ALTER TABLE "AuditEvent"
  ADD CONSTRAINT "AuditEvent_scope_branch_check"
  CHECK (
    ("scope" = 'branch' AND "branchCode" IS NOT NULL)
    OR
    (
      "scope" = 'platform' AND "branchCode" IS NULL AND (
        "action" IN (
          'branch.active.change',
          'branch.context.denied',
          'integration.payload_campaign.deactivate',
          'integration.payload_campaign.sync',
          'module.activation.legacy',
          'session.login',
          'session.logout',
          'session.revoke',
          'user.access.update',
          'user.branches.update',
          'user.create',
          'user.password.change',
          'user.password_change.require',
          'user.profile.update',
          'user.sessions.revoke',
          'user.unlock'
        )
        OR "action" LIKE 'backup.%'
        OR "action" LIKE 'incident.%'
        OR "action" LIKE 'maintenance.%'
      )
    )
  ) NOT VALID;

