-- Preserve a deterministic order even when two events share the same
-- millisecond. The temporary nullable column lets existing inferred boundaries
-- receive their correct order before the constraint becomes mandatory.
ALTER TABLE "VisitAreaTimeEvent"
ADD COLUMN IF NOT EXISTS "sequence" INTEGER;

ALTER TABLE "VisitAreaTimeEvent"
DISABLE TRIGGER "VisitAreaTimeEvent_prevent_update_delete";

WITH ordered_events AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "routeStepId"
      ORDER BY
        "occurredAt" ASC,
        CASE
          WHEN "type" = 'entered' THEN 0
          WHEN "type" = 'exited' THEN 2
          ELSE 1
        END ASC,
        "createdAt" ASC,
        "id" ASC
    ) AS event_sequence
  FROM "VisitAreaTimeEvent"
)
UPDATE "VisitAreaTimeEvent" AS event
SET "sequence" = ordered_events.event_sequence
FROM ordered_events
WHERE event."id" = ordered_events."id";

ALTER TABLE "VisitAreaTimeEvent"
ENABLE TRIGGER "VisitAreaTimeEvent_prevent_update_delete";

ALTER TABLE "VisitAreaTimeEvent"
ALTER COLUMN "sequence" SET NOT NULL;

CREATE UNIQUE INDEX "VisitAreaTimeEvent_routeStepId_sequence_key"
ON "VisitAreaTimeEvent"("routeStepId", "sequence");
