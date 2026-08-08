-- Los checks de FollowUpTask solo permitían pending/done/cancelled; se relajan
-- para admitir el estado nuevo `awaiting_payment` (agendado por el médico, sin
-- completar, activo hasta que se pague). Cambios aditivos: solo amplían lo válido.
ALTER TABLE "FollowUpTask"
  DROP CONSTRAINT "FollowUpTask_lifecycle_status_check",
  ADD CONSTRAINT "FollowUpTask_lifecycle_status_check" CHECK (
    "status" IN ('pending', 'awaiting_payment', 'done', 'cancelled')
  );

ALTER TABLE "FollowUpTask"
  DROP CONSTRAINT "FollowUpTask_completion_check",
  ADD CONSTRAINT "FollowUpTask_completion_check" CHECK (
    (
      "status" = 'pending'
      AND "completedAt" IS NULL
    )
    OR (
      "status" = 'awaiting_payment'
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
  );
