-- Tarea 15: separar propósito, estado operativo y resultado del seguimiento.

CREATE TYPE "FollowUpType" AS ENUM (
  'evolution',
  'return',
  'treatment_recovery',
  'administrative',
  'doctor_call'
);

CREATE TYPE "FollowUpDomain" AS ENUM ('clinical', 'administrative');
CREATE TYPE "FollowUpPriority" AS ENUM ('low', 'normal', 'high', 'urgent');

CREATE TYPE "FollowUpResult" AS ENUM (
  'done',
  'improved',
  'not_improved',
  'worsened',
  'no_answer',
  'wants_return',
  'requires_new_visit',
  'treatment_resumed',
  'treatment_declined',
  'rescheduled',
  'escalated_to_doctor',
  'cancelled',
  'other'
);

ALTER TABLE "FollowUpTask"
  ADD COLUMN "escalatedFromTaskId" TEXT,
  ADD COLUMN "type" "FollowUpType" NOT NULL DEFAULT 'administrative',
  ADD COLUMN "domain" "FollowUpDomain" NOT NULL DEFAULT 'administrative',
  ADD COLUMN "priority" "FollowUpPriority" NOT NULL DEFAULT 'normal',
  ADD COLUMN "result" "FollowUpResult";

-- Clasificación prudente de tareas anteriores. La relación y el texto solo se
-- usan para dar un punto de partida; el historial original no se elimina.
UPDATE "FollowUpTask"
SET "type" = 'treatment_recovery'
WHERE "id" IN (
  SELECT "followUpTaskId"
  FROM "TreatmentProposalOutcome"
  WHERE "followUpTaskId" IS NOT NULL
)
OR LOWER("title") LIKE ANY (
  ARRAY['%tratamiento%', '%recuper%', '%decisión%', '%decision%']
);

UPDATE "FollowUpTask"
SET "type" = 'doctor_call'
WHERE LOWER("title") LIKE ANY (
  ARRAY['%llamada médica%', '%llamada medica%', '%hablar con el médico%', '%hablar con el medico%']
);

UPDATE "FollowUpTask"
SET "type" = 'return'
WHERE "type" = 'administrative'
  AND LOWER("title") LIKE ANY (
    ARRAY['%retorno%', '%volver%', '%reagendar%', '%nueva visita%', '%control%']
  );

UPDATE "FollowUpTask"
SET "type" = 'evolution'
WHERE "type" = 'administrative'
  AND "patientId" IS NOT NULL
  AND "leadId" IS NULL
  AND ("visitId" IS NOT NULL OR "clinicalOrderId" IS NOT NULL);

UPDATE "FollowUpTask"
SET "domain" = CASE
  WHEN "type" = 'administrative' THEN 'administrative'::"FollowUpDomain"
  ELSE 'clinical'::"FollowUpDomain"
END;

-- Conservar el resultado que antes estaba mezclado dentro del estado.
UPDATE "FollowUpTask"
SET "result" = CASE "status"
  WHEN 'done' THEN 'done'::"FollowUpResult"
  WHEN 'improved' THEN 'improved'::"FollowUpResult"
  WHEN 'not_improved' THEN 'not_improved'::"FollowUpResult"
  WHEN 'no_answer' THEN 'no_answer'::"FollowUpResult"
  WHEN 'wants_return' THEN 'wants_return'::"FollowUpResult"
  WHEN 'requires_new_visit' THEN 'requires_new_visit'::"FollowUpResult"
  WHEN 'requires_doctor_call' THEN 'escalated_to_doctor'::"FollowUpResult"
  WHEN 'cancelled' THEN 'cancelled'::"FollowUpResult"
  ELSE NULL
END;

-- Desde ahora el estado de la tarea solo representa pendiente, terminada o
-- cancelada. "No responde" queda pendiente para que no desaparezca.
UPDATE "FollowUpTask"
SET
  "status" = CASE
    WHEN "status" = 'no_answer' THEN 'pending'::"FollowUpStatus"
    WHEN "status" = 'cancelled' THEN 'cancelled'::"FollowUpStatus"
    WHEN "status" = 'pending' THEN 'pending'::"FollowUpStatus"
    ELSE 'done'::"FollowUpStatus"
  END,
  "completedAt" = CASE
    WHEN "status" IN ('pending', 'no_answer') THEN NULL
    ELSE COALESCE("completedAt", "updatedAt", CURRENT_TIMESTAMP)
  END;

-- FollowUpAttempt.result deja de ser un estado y pasa a ser el resultado real.
ALTER TABLE "FollowUpAttempt"
  ADD COLUMN "classifiedResult" "FollowUpResult";

UPDATE "FollowUpAttempt"
SET "classifiedResult" = CASE "result"
  WHEN 'done' THEN 'done'::"FollowUpResult"
  WHEN 'improved' THEN 'improved'::"FollowUpResult"
  WHEN 'not_improved' THEN 'not_improved'::"FollowUpResult"
  WHEN 'no_answer' THEN 'no_answer'::"FollowUpResult"
  WHEN 'wants_return' THEN 'wants_return'::"FollowUpResult"
  WHEN 'requires_new_visit' THEN 'requires_new_visit'::"FollowUpResult"
  WHEN 'requires_doctor_call' THEN 'escalated_to_doctor'::"FollowUpResult"
  WHEN 'cancelled' THEN 'cancelled'::"FollowUpResult"
  ELSE 'other'::"FollowUpResult"
END;

DROP INDEX "FollowUpAttempt_result_idx";
ALTER TABLE "FollowUpAttempt" DROP COLUMN "result";
ALTER TABLE "FollowUpAttempt" RENAME COLUMN "classifiedResult" TO "result";
ALTER TABLE "FollowUpAttempt" ALTER COLUMN "result" SET NOT NULL;

CREATE UNIQUE INDEX "FollowUpTask_escalatedFromTaskId_key"
  ON "FollowUpTask"("escalatedFromTaskId");
CREATE INDEX "FollowUpTask_type_status_dueAt_idx"
  ON "FollowUpTask"("type", "status", "dueAt");
CREATE INDEX "FollowUpTask_domain_status_dueAt_idx"
  ON "FollowUpTask"("domain", "status", "dueAt");
CREATE INDEX "FollowUpTask_priority_status_dueAt_idx"
  ON "FollowUpTask"("priority", "status", "dueAt");
CREATE INDEX "FollowUpTask_result_completedAt_idx"
  ON "FollowUpTask"("result", "completedAt");
CREATE INDEX "FollowUpAttempt_result_idx"
  ON "FollowUpAttempt"("result");

ALTER TABLE "FollowUpTask"
  ADD CONSTRAINT "FollowUpTask_escalatedFromTaskId_fkey"
  FOREIGN KEY ("escalatedFromTaskId") REFERENCES "FollowUpTask"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FollowUpTask"
  ADD CONSTRAINT "FollowUpTask_type_domain_check" CHECK (
    ("type" = 'administrative' AND "domain" = 'administrative')
    OR ("type" <> 'administrative' AND "domain" = 'clinical')
  ),
  ADD CONSTRAINT "FollowUpTask_lifecycle_status_check" CHECK (
    "status" IN ('pending', 'done', 'cancelled')
  ),
  ADD CONSTRAINT "FollowUpTask_completion_check" CHECK (
    (
      "status" = 'pending'
      AND "completedAt" IS NULL
    )
    OR (
      "status" = 'done'
      AND "result" IS NOT NULL
      AND "completedAt" IS NOT NULL
    )
    OR (
      "status" = 'cancelled'
      AND "result" = 'cancelled'
      AND "completedAt" IS NOT NULL
    )
  ),
  ADD CONSTRAINT "FollowUpTask_escalation_type_check" CHECK (
    "escalatedFromTaskId" IS NULL OR "type" = 'doctor_call'
  );
