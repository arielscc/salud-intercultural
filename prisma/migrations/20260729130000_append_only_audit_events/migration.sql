ALTER TYPE "InternalPermission" ADD VALUE IF NOT EXISTS 'audit_read';

CREATE TYPE "AuditResult" AS ENUM ('success', 'failure', 'denied');

CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "actorRole" "InternalRole",
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "result" "AuditResult" NOT NULL,
    "requestId" TEXT NOT NULL,
    "context" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuditEvent_occurredAt_idx" ON "AuditEvent"("occurredAt");
CREATE INDEX "AuditEvent_actorId_occurredAt_idx" ON "AuditEvent"("actorId", "occurredAt");
CREATE INDEX "AuditEvent_action_occurredAt_idx" ON "AuditEvent"("action", "occurredAt");
CREATE INDEX "AuditEvent_entityType_occurredAt_idx" ON "AuditEvent"("entityType", "occurredAt");
CREATE INDEX "AuditEvent_result_occurredAt_idx" ON "AuditEvent"("result", "occurredAt");

ALTER TABLE "AuditEvent"
ADD CONSTRAINT "AuditEvent_actorId_fkey"
FOREIGN KEY ("actorId") REFERENCES "InternalUser"("id")
ON DELETE RESTRICT ON UPDATE RESTRICT;

CREATE OR REPLACE FUNCTION "reject_audit_event_mutation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'AuditEvent is append-only: % is not allowed', TG_OP
    USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER "AuditEvent_prevent_update_delete"
BEFORE UPDATE OR DELETE ON "AuditEvent"
FOR EACH ROW
EXECUTE FUNCTION "reject_audit_event_mutation"();
